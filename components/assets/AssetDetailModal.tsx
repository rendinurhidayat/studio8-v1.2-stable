
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Asset } from '../../types';
import { generateSocialMediaCaption } from '../../services/api';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';

interface AssetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
}

const CaptionOption: React.FC<{ text: string }> = ({ text }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="p-3 bg-base-100 rounded-lg relative group">
            <p className="text-sm whitespace-pre-wrap">{text}</p>
            <button 
                onClick={handleCopy} 
                className="absolute top-2 right-2 p-1.5 bg-white/50 rounded-md text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                title={isCopied ? "Tersalin!" : "Salin"}
            >
                {isCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
        </div>
    );
};

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ isOpen, onClose, asset }) => {
    const [captions, setCaptions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!asset) return;
        setIsLoading(true);
        setError('');
        setCaptions([]);
        try {
            const generatedCaptions = await generateSocialMediaCaption(asset);
            setCaptions(generatedCaptions);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!asset) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={asset.fileName}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="bg-base-200 rounded-lg flex items-center justify-center">
                    {asset.fileType === 'video' ? (
                        <video src={asset.url} controls className="w-full h-auto object-contain rounded-lg max-h-64" />
                    ) : (
                        <img src={asset.url} alt={asset.fileName} className="w-full h-auto object-contain rounded-lg max-h-64" />
                    )}
                </div>
                
                <div className="text-xs flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full font-semibold">{asset.category}</span>
                    {asset.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-base-200 text-muted rounded-full">{tag}</span>
                    ))}
                </div>

                <div className="pt-4 border-t">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles size={20} className="text-accent"/> AI Caption Generator</h3>
                    <p className="text-sm text-muted mb-3">Buat caption Instagram menarik untuk aset ini.</p>
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-accent-content rounded-lg hover:bg-accent/90 transition-colors font-semibold disabled:opacity-60"
                    >
                        {isLoading ? <><Loader2 size={16} className="animate-spin" /> Sedang membuat...</> : 'Generate 3 Opsi Caption'}
                    </button>
                    
                    {error && <p className="mt-2 text-sm text-error">{error}</p>}
                    
                    {captions.length > 0 && (
                        <div className="space-y-3 mt-4">
                            {captions.map((caption, index) => (
                                <CaptionOption key={index} text={caption} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AssetDetailModal;
