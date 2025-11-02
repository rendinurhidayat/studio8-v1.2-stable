import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addAsset } from '../../services/api';
import Modal from '../common/Modal';
import { UploadCloud, Loader2, CheckCircle, AlertCircle, X, Send } from 'lucide-react';
import { Asset } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';

interface FileToUpload {
    id: string;
    file: File;
    category: string;
    tags: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

const UploadModal: React.FC<{ isOpen: boolean; onClose: () => void; onUploadComplete: () => void; }> = ({ isOpen, onClose, onUploadComplete }) => {
    const { user } = useAuth();
    const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const resetState = () => {
        setFilesToUpload([]);
        setIsProcessing(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFilesAdded = (selectedFiles: FileList) => {
        const newFiles: FileToUpload[] = Array.from(selectedFiles).map(file => ({
            file,
            id: `${file.name}-${file.lastModified}-${Math.random()}`,
            category: 'Sesi Klien',
            tags: '',
            status: 'pending',
        }));
        setFilesToUpload(prev => [...prev, ...newFiles]);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files?.length) handleFilesAdded(e.dataTransfer.files);
    };
    
    const updateFileState = (id: string, updates: Partial<FileToUpload>) => {
        setFilesToUpload(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleStartProcessing = async () => {
        if (!user) return;
        setIsProcessing(true);

        for (const fileWrapper of filesToUpload) {
            if(fileWrapper.status !== 'pending') continue;

            updateFileState(fileWrapper.id, { status: 'uploading' });
            
            try {
                // 1. Convert to base64 with optimization
                const base64 = await fileToBase64(fileWrapper.file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 });

                // 2. Upload to Cloudinary via API route
                const uploadResponse = await fetch('/api/assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'upload', imageBase64: base64, folder: 'studio_assets' })
                });

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json();
                    throw new Error(errorData.message || 'Upload failed');
                }
                const result = await uploadResponse.json();

                // 3. Save metadata to Firestore
                const assetData: Omit<Asset, 'id'> = {
                    url: result.secure_url,
                    publicId: result.public_id || '', // API should return this
                    fileName: fileWrapper.file.name,
                    fileType: fileWrapper.file.type.startsWith('video') ? 'video' : 'image',
                    category: fileWrapper.category,
                    tags: fileWrapper.tags.split(',').map(t => t.trim()).filter(Boolean),
                    uploadedBy: user.name,
                    uploadedById: user.id,
                    uploadedAt: new Date().toISOString(),
                };
                await addAsset(assetData, user.id);
                
                updateFileState(fileWrapper.id, { status: 'success' });
            } catch (error: any) {
                updateFileState(fileWrapper.id, { status: 'error', error: error.message });
            }
        }
        setIsProcessing(false);
        onUploadComplete();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Upload Aset Baru">
            <div className="space-y-4 max-h-[70vh] flex flex-col">
                 <label 
                    htmlFor="file-upload"
                    onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)}
                    onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                    className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300'}`}
                >
                    <UploadCloud className="mx-auto text-muted" size={40} />
                    <p className="mt-2 text-muted text-sm">Drag & drop file di sini, atau klik untuk memilih</p>
                    <input id="file-upload" type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFilesAdded(e.target.files)} disabled={isProcessing} />
                </label>
                {filesToUpload.length > 0 && (
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {filesToUpload.map(f => (
                            <div key={f.id} className="flex items-start gap-3 p-3 bg-base-100 rounded-lg">
                                <img src={URL.createObjectURL(f.file)} alt={f.file.name} className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                                <div className="flex-grow space-y-2">
                                    <p className="text-sm font-semibold truncate">{f.file.name}</p>
                                    <input type="text" placeholder="Kategori" value={f.category} onChange={e => updateFileState(f.id, { category: e.target.value })} className="w-full text-xs p-1.5 border rounded" disabled={f.status !== 'pending' || isProcessing} />
                                    <input type="text" placeholder="Tags (pisahkan koma)" value={f.tags} onChange={e => updateFileState(f.id, { tags: e.target.value })} className="w-full text-xs p-1.5 border rounded" disabled={f.status !== 'pending' || isProcessing}/>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    {f.status === 'uploading' && <Loader2 size={18} className="animate-spin text-primary" />}
                                    {f.status === 'success' && <CheckCircle size={18} className="text-success" />}
                                    {f.status === 'error' && <AlertCircle size={18} className="text-error" />}
                                    <button onClick={() => setFilesToUpload(p => p.filter(file => file.id !== f.id))} className="text-muted hover:text-error" disabled={isProcessing}><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="pt-4 border-t flex justify-end gap-2">
                    <button onClick={handleClose} className="px-4 py-2 bg-base-200 rounded-md">Tutup</button>
                    <button onClick={handleStartProcessing} disabled={isProcessing || filesToUpload.length === 0} className="px-4 py-2 bg-primary text-white rounded-md w-48 flex justify-center">
                        {isProcessing ? <Loader2 className="animate-spin"/> : <><Send size={16} className="mr-2"/> Upload & Simpan</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default UploadModal;