import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
    getPackages, getAddOns, addPackage, updatePackage, deletePackage, 
    addAddOn, updateAddOn, deleteAddOn, addSubPackage, updateSubPackage, 
    deleteSubPackage, addSubAddOn, updateSubAddOn, deleteSubAddOn,
    getSystemSettings, updateSystemSettings, getPromos, addPromo, updatePromo, deletePromo,
    getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    generatePackageDescription
} from '../../services/api';
import { Package, AddOn, SubPackage, SubAddOn, SystemSettings, FeatureToggles, Promo, OperationalHours, PaymentMethods, InventoryItem, InventoryStatus, LoyaltyTier, Partner } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { PlusCircle, Edit, Trash2, Box, Puzzle, Plus, Settings, SlidersHorizontal, Tag, CreditCard, Users, Shield, Save, ToggleLeft, ToggleRight, Percent, Calendar, Key, ArrowRight, Archive, MessageCircle, Instagram as InstagramIcon, Award, UploadCloud, Loader2, CheckCircle, AlertCircle, Sparkles, Handshake } from 'lucide-react';
import Card from '../../components/common/Card';
import { fileToBase64 } from '../../utils/fileUtils';

type ModalMode = 'add' | 'edit';
type ItemType = 'package' | 'addon' | 'subpackage' | 'subaddon' | 'promo' | 'inventory' | 'loyaltyTier' | 'partner';

interface ModalState {
    isOpen: boolean;
    mode: ModalMode;
    type: ItemType;
    itemData?: any;
    parentId?: string;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void }> = ({ enabled, onChange }) => (
    <button type="button" onClick={onChange} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-primary' : 'bg-base-300'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
);

const SettingsCard: React.FC<{ title: string; description: string; children: React.ReactNode; }> = ({ title, description, children }) => (
    <Card className="mb-6">
        <h3 className="text-xl font-bold text-primary">{title}</h3>
        <p className="text-muted mt-1 mb-4">{description}</p>
        <div className="border-t border-base-200 pt-4">{children}</div>
    </Card>
);

// --- TABS ---

const GeneralSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSystemSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleHoursChange = (part: 'weekday' | 'weekend', type: 'open' | 'close', value: string) => {
        if (!settings) return;
        const newSettings = { ...settings };
        newSettings.operationalHours[part][type] = value;
        setSettings(newSettings);
    };

    const handleToggleChange = (feature: keyof FeatureToggles) => {
        if (!settings) return;
        const newSettings = {
            ...settings,
            featureToggles: { ...settings.featureToggles, [feature]: !settings.featureToggles[feature] }
        };
        setSettings(newSettings);
    };

    const handleContactChange = (field: 'whatsapp' | 'instagram', value: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            contact: {
                ...settings.contact,
                [field]: value
            }
        });
    };
    
    const handleSave = async () => {
        if (settings && currentUser) {
            await updateSystemSettings(settings, currentUser.id);
            alert('Pengaturan berhasil disimpan!');
        }
    };

    if (loading) return <p>Loading general settings...</p>;
    if (!settings) return <p>Could not load settings.</p>;

    return (
        <div>
            <SettingsCard title="Jam Operasional" description="Atur jam buka dan tutup studio untuk hari kerja dan akhir pekan.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Hari Kerja (Senin-Jumat)</h4>
                        <div className="flex items-center gap-2">
                            <input type="time" value={settings.operationalHours.weekday.open} onChange={e => handleHoursChange('weekday', 'open', e.target.value)} className="input input-bordered w-full p-2 border rounded" />
                            <span>-</span>
                            <input type="time" value={settings.operationalHours.weekday.close} onChange={e => handleHoursChange('weekday', 'close', e.target.value)} className="input input-bordered w-full p-2 border rounded" />
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">Akhir Pekan (Sabtu-Minggu)</h4>
                        <div className="flex items-center gap-2">
                            <input type="time" value={settings.operationalHours.weekend.open} onChange={e => handleHoursChange('weekend', 'open', e.target.value)} className="input input-bordered w-full p-2 border rounded" />
                            <span>-</span>
                            <input type="time" value={settings.operationalHours.weekend.close} onChange={e => handleHoursChange('weekend', 'close', e.target.value)} className="input input-bordered w-full p-2 border rounded" />
                        </div>
                    </div>
                </div>
            </SettingsCard>
            
            <SettingsCard title="Informasi Kontak" description="Atur kontak publik studio yang akan ditampilkan.">
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                         <div className="relative">
                            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                            <input type="text" value={settings.contact?.whatsapp || ''} onChange={e => handleContactChange('whatsapp', e.target.value)} placeholder="+6281234567890" className="w-full pl-10 p-2 border rounded" />
                         </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username Instagram</label>
                        <div className="relative">
                            <InstagramIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                             <input type="text" value={settings.contact?.instagram || ''} onChange={e => handleContactChange('instagram', e.target.value)} placeholder="studio8banjar" className="w-full pl-10 p-2 border rounded" />
                        </div>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Fitur Publik" description="Aktifkan atau nonaktifkan fitur yang dapat diakses oleh pengunjung website.">
                <div className="space-y-3">
                    <div className="flex justify-between items-center"><p>Chatbot di Landing Page</p><ToggleSwitch enabled={settings.featureToggles.chatbot} onChange={() => handleToggleChange('chatbot')} /></div>
                    <div className="flex justify-between items-center"><p>Form Feedback Publik</p><ToggleSwitch enabled={settings.featureToggles.publicFeedback} onChange={() => handleToggleChange('publicFeedback')} /></div>
                    <div className="flex justify-between items-center"><p>Kalender Publik</p><ToggleSwitch enabled={settings.featureToggles.publicCalendar} onChange={() => handleToggleChange('publicCalendar')} /></div>
                </div>
            </SettingsCard>
             <div className="flex justify-end">
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    <Save size={16}/> Simpan Perubahan
                </button>
            </div>
        </div>
    );
};

interface ImageUpload {
    id: string;
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

const ServicesSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'package' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', price: '', description: '', imageUrls: [] as string[], type: 'Studio', isGroupPackage: false
    });
    const [imageUploads, setImageUploads] = useState<ImageUpload[]>([]);


    const fetchData = async () => {
        setLoading(true);
        const [packagesData, addOnsData] = await Promise.all([getPackages(), getAddOns()]);
        setPackages(packagesData);
        setAddOns(addOnsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (mode: ModalMode, type: ItemType, itemData?: any, parentId?: string) => {
        setImageUploads([]);
        setModalState({ isOpen: true, mode, type, itemData, parentId });
        
        if (mode === 'edit' && itemData) {
            setFormData({
                name: itemData.name || '',
                price: itemData.price?.toString() || '',
                description: itemData.description || '',
                imageUrls: itemData.imageUrls || [],
                type: itemData.type || 'Studio',
                isGroupPackage: itemData.isGroupPackage || false,
            });
        } else {
            setFormData({ name: '', price: '', description: '', imageUrls: [], type: 'Studio', isGroupPackage: false });
        }
    };

    const closeModal = () => setModalState({ ...modalState, isOpen: false });

    const openConfirmModal = (type: ItemType, itemData: any, parentId?: string) => {
        setModalState({ isOpen: false, mode: 'edit', type, itemData, parentId });
        setIsConfirmModalOpen(true);
    };
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // FIX: Explicitly type 'file' as File to resolve type inference errors when iterating over a FileList.
            const newFiles: ImageUpload[] = Array.from(e.target.files).map((file: File) => ({
                id: `${file.name}-${file.lastModified}-${Math.random()}`,
                file,
                preview: URL.createObjectURL(file),
                status: 'pending'
            }));
            setImageUploads(prev => [...prev, ...newFiles]);
        }
    };

    const handleRemoveExistingImage = (urlToRemove: string) => {
        setFormData(prev => ({...prev, imageUrls: prev.imageUrls.filter(url => url !== urlToRemove)}));
    };

    const handleRemoveNewImage = (idToRemove: string) => {
        setImageUploads(prev => prev.filter(upload => upload.id !== idToRemove));
    };

    const handleGenerateDescription = async () => {
        if (!formData.name) {
            alert("Silakan isi nama paket terlebih dahulu.");
            return;
        }
        setIsGeneratingDesc(true);
        try {
            const desc = await generatePackageDescription(formData.name);
            setFormData(prev => ({ ...prev, description: desc }));
        } catch (error) {
            alert("Gagal membuat deskripsi: " + (error as Error).message);
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
    
        setIsSubmitting(true);
        try {
            const { mode, type, itemData, parentId } = modalState;
            
            // --- Image Upload Logic ---
            let finalImageUrls = [...formData.imageUrls];
            const filesToUpload = imageUploads.filter(f => f.status === 'pending' || f.status === 'error');
            let hadError = false;

            if (filesToUpload.length > 0) {
                const newUrls: string[] = [];
                for (const fileWrapper of filesToUpload) {
                    setImageUploads(prev => prev.map(f => f.id === fileWrapper.id ? { ...f, status: 'uploading' } : f));
                    try {
                        const base64 = await fileToBase64(fileWrapper.file);
                        const response = await fetch('/api/uploadImage', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageBase64: base64, folder: 'package_images' })
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'Upload gagal');
                        newUrls.push(result.secure_url);
                        setImageUploads(prev => prev.map(f => f.id === fileWrapper.id ? { ...f, status: 'success' } : f));
                    } catch (error) {
                        hadError = true;
                        setImageUploads(prev => prev.map(f => f.id === fileWrapper.id ? { ...f, status: 'error', error: (error as Error).message } : f));
                    }
                }
                if (hadError) {
                    throw new Error('Beberapa gambar gagal diunggah. Silakan hapus dan coba lagi.');
                }
                finalImageUrls.push(...newUrls);
            }
        
            if (type === 'package') {
                const packagePayload = {
                    name: formData.name,
                    description: formData.description,
                    type: formData.type as 'Studio' | 'Outdoor',
                    isGroupPackage: formData.isGroupPackage,
                    imageUrls: finalImageUrls,
                };
        
                if (mode === 'add') {
                    await addPackage({ ...packagePayload, subPackages: [] }, currentUser.id);
                } else if (itemData) {
                    await updatePackage(itemData.id, packagePayload, currentUser.id);
                }
            } else {
                const price = parseFloat(formData.price);
                const commonData = { name: formData.name, description: formData.description };
                const priceData = { ...commonData, price: isNaN(price) ? 0 : price };
        
                if (mode === 'edit' && itemData) {
                    switch(type) {
                        case 'addon': await updateAddOn(itemData.id, { name: formData.name }, currentUser.id); break;
                        case 'subpackage': await updateSubPackage(parentId!, itemData.id, priceData, currentUser.id); break;
                        case 'subaddon': await updateSubAddOn(parentId!, itemData.id, {name: formData.name, price: priceData.price}, currentUser.id); break;
                    }
                } else { // add mode
                     switch(type) {
                        case 'addon': await addAddOn({name: formData.name, subAddOns: []}, currentUser.id); break;
                        case 'subpackage': await addSubPackage(parentId!, priceData, currentUser.id); break;
                        case 'subaddon': await addSubAddOn(parentId!, {name: formData.name, price: priceData.price}, currentUser.id); break;
                    }
                }
            }
            closeModal();
            fetchData();
        } catch (error) {
             alert((error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!currentUser) return;
        const { type, itemData, parentId } = modalState;
        if (!itemData) return;
        
        switch(type) {
            case 'package': await deletePackage(itemData.id, currentUser.id); break;
            case 'addon': await deleteAddOn(itemData.id, currentUser.id); break;
            case 'subpackage': await deleteSubPackage(parentId!, itemData.id, currentUser.id); break;
            case 'subaddon': await deleteSubAddOn(parentId!, itemData.id, currentUser.id); break;
        }
        
        setIsConfirmModalOpen(false);
        fetchData();
    };

    const getModalTitle = () => {
        const action = modalState.mode === 'add' ? 'Tambah' : 'Edit';
        switch (modalState.type) {
            case 'package': return `${action} Paket`;
            case 'addon': return `${action} Layanan Tambahan`;
            case 'subpackage': return `${action} Varian Paket`;
            case 'subaddon': return `${action} Varian Layanan`;
        }
        return action;
    };
    
    if (loading) return <div className="text-center p-8">Loading settings...</div>;

    const renderSubItemList = (items: (SubPackage | SubAddOn)[], type: 'subpackage' | 'subaddon', parentId: string) => (
        <div className="pl-4 mt-2 space-y-2 border-l-2 border-gray-100">
            {items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50">
                    <div>
                        <p className="font-medium text-sm text-gray-700">{item.name}</p>
                        <p className="text-sm text-gray-500">Rp {item.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => openModal('edit', type, item, parentId)} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={16}/></button>
                        <button onClick={() => openConfirmModal(type, item, parentId)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            <button onClick={() => openModal('add', type, null, parentId)} className="w-full flex items-center justify-center gap-2 text-sm p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                <Plus size={14}/> Tambah Varian
            </button>
        </div>
    );

    const renderItemList = (title: string, items: (Package | AddOn)[], type: 'package' | 'addon', icon: React.ReactNode) => (
         <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    {icon}
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                </div>
                <button onClick={() => openModal('add', type)} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                    <PlusCircle size={16} /> Tambah {type === 'package' ? 'Paket' : 'Layanan'}
                </button>
            </div>
            <div className="space-y-4">
                {items.map(item => (
                    <div key={item.id} className="bg-base-100 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                {(item as Package).description && <p className="text-sm text-gray-500 mt-1">{(item as Package).description}</p>}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openModal('edit', type, item)} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={16}/></button>
                                <button onClick={() => openConfirmModal(type, item)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        {type === 'package' && renderSubItemList((item as Package).subPackages, 'subpackage', item.id)}
                        {type === 'addon' && renderSubItemList((item as AddOn).subAddOns, 'subaddon', item.id)}
                    </div>
                ))}
            </div>
        </div>
    );
     return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {renderItemList('Paket Foto', packages, 'package', <Box className="text-blue-600"/>)}
            {renderItemList('Layanan Tambahan', addOns, 'addon', <Puzzle className="text-blue-600"/>)}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={getModalTitle()}>
                <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nama</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                     {(modalState.type === 'subpackage' || modalState.type === 'subaddon') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Harga (Rp)</label>
                            <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"/>
                        </div>
                     )}
                    {(modalState.type === 'package' || modalState.type === 'subpackage') && (
                         <div>
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-gray-700">Deskripsi (Opsional)</label>
                                {modalState.type === 'package' && (
                                    <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name} className="text-xs flex items-center gap-1 text-accent font-semibold disabled:opacity-50">
                                        {isGeneratingDesc ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        Generate (AI)
                                    </button>
                                )}
                            </div>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                        </div>
                    )}
                    {modalState.type === 'package' && (
                        <>
                           <div>
                                <label className="block text-sm font-medium text-gray-700">Gambar Showcase</label>
                                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {formData.imageUrls.map(url => (
                                        <div key={url} className="relative group">
                                            <img src={url} alt="Existing" className="h-24 w-full object-cover rounded-md"/>
                                            <button type="button" onClick={() => handleRemoveExistingImage(url)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                                                <Trash2 size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                    {imageUploads.map(upload => (
                                        <div key={upload.id} className="relative group">
                                            <img src={upload.preview} alt="Preview" className="h-24 w-full object-cover rounded-md"/>
                                            <button type="button" onClick={() => handleRemoveNewImage(upload.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                                                <Trash2 size={12}/>
                                            </button>
                                            <div className="absolute bottom-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                                                {upload.status === 'uploading' && <Loader2 size={12} className="animate-spin" />}
                                                {upload.status === 'success' && <CheckCircle size={12} className="text-green-400" />}
                                                {upload.status === 'error' && <AlertCircle size={12} className="text-red-400" />}
                                            </div>
                                        </div>
                                    ))}
                                    <label htmlFor="image-upload" className="flex flex-col items-center justify-center h-24 w-full border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                        <UploadCloud size={24} className="text-gray-400"/>
                                        <span className="text-xs text-gray-500">Tambah</span>
                                        <input type="file" id="image-upload" multiple accept="image/*" onChange={handleImageChange} className="hidden"/>
                                    </label>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Jenis Paket</label>
                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                                    <option value="Studio">Studio</option>
                                    <option value="Outdoor">Outdoor</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="isGroupPackage" type="checkbox" checked={formData.isGroupPackage} onChange={e => setFormData({...formData, isGroupPackage: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                <label htmlFor="isGroupPackage" className="block text-sm font-medium text-gray-700">Ini adalah Paket Grup (kenakan biaya per orang)</label>
                            </div>
                        </>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="w-28 flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>
             <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title={`Hapus Item`}
                message={`Apakah Anda yakin ingin menghapus "${modalState.itemData?.name}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
};

const PromosSettingsTab = () => {
    const { user: currentUser } = useAuth();
    // New tab for managing promotions
    const [promos, setPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'promo' });
    const [formData, setFormData] = useState({ code: '', description: '', discountPercentage: '', isActive: true });
    
    const fetchData = async () => {
        setLoading(true);
        const data = await getPromos();
        setPromos(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (mode: ModalMode, itemData?: Promo) => {
        setModalState({ isOpen: true, mode, type: 'promo', itemData });
        if (mode === 'edit' && itemData) {
            setFormData({
                code: itemData.code,
                description: itemData.description,
                discountPercentage: itemData.discountPercentage.toString(),
                isActive: itemData.isActive
            });
        } else {
            setFormData({ code: '', description: '', discountPercentage: '', isActive: true });
        }
    };
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        const { mode, itemData } = modalState;
        const data = {
            ...formData,
            discountPercentage: parseInt(formData.discountPercentage) || 0,
        };
        if (mode === 'add') {
            await addPromo(data, currentUser.id);
        } else if (itemData) {
            await updatePromo(itemData.id, data, currentUser.id);
        }
        setModalState({ ...modalState, isOpen: false });
        fetchData();
    };
    
    const handleToggleActive = async (promo: Promo) => {
        if (!currentUser) return;
        await updatePromo(promo.id, { isActive: !promo.isActive }, currentUser.id);
        fetchData();
    };

    if (loading) return <p>Loading promos...</p>;

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-primary">Manajemen Promosi</h3>
                    <p className="text-muted mt-1">Buat dan kelola kode promo untuk klien.</p>
                </div>
                <button onClick={() => openModal('add')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    <PlusCircle size={16}/> Buat Promo Baru
                </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y">
                    <thead className="bg-base-200/50"><tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Kode</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Deskripsi</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Diskon</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Status</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Aksi</th>
                    </tr></thead>
                    <tbody className="divide-y">
                        {promos.map(p => (
                            <tr key={p.id}>
                                <td className="px-4 py-2 font-mono text-primary font-semibold">{p.code}</td>
                                <td className="px-4 py-2 text-sm">{p.description}</td>
                                <td className="px-4 py-2 text-center text-sm font-semibold">{p.discountPercentage}%</td>
                                <td className="px-4 py-2 text-center"><ToggleSwitch enabled={p.isActive} onChange={() => handleToggleActive(p)} /></td>
                                <td className="px-4 py-2 text-center"><button onClick={() => openModal('edit', p)} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={16}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
             <Modal isOpen={modalState.isOpen} onClose={() => setModalState({...modalState, isOpen: false})} title={modalState.mode === 'add' ? 'Tambah Promo' : 'Edit Promo'}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div><label>Kode Promo</label><input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required className="w-full p-2 border rounded" /></div>
                    <div><label>Deskripsi</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required className="w-full p-2 border rounded" /></div>
                    <div><label>Diskon (%)</label><input type="number" value={formData.discountPercentage} onChange={e => setFormData({...formData, discountPercentage: e.target.value})} required className="w-full p-2 border rounded" /></div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setModalState({...modalState, isOpen: false})} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Batal</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Simpan</button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
};

const PaymentsSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSystemSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleToggle = (method: keyof Omit<PaymentMethods, 'qrisImage'>) => {
        if (!settings) return;
        const newSettings = {
            ...settings,
            paymentMethods: { ...settings.paymentMethods, [method]: !settings.paymentMethods[method] }
        };
        setSettings(newSettings);
    };

    const handleQrisImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        paymentMethods: {
                            ...prev.paymentMethods,
                            qrisImage: reader.result as string,
                        }
                    };
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (settings && currentUser) {
            await updateSystemSettings(settings, currentUser.id);
            alert('Pengaturan pembayaran berhasil disimpan!');
        }
    };

    if (loading) return <p>Loading payment settings...</p>;
    if (!settings) return <p>Could not load settings.</p>;
    
    const paymentOptions: { key: keyof Omit<PaymentMethods, 'qrisImage'>, label: string }[] = [
        { key: 'qris', label: 'QRIS' },
        { key: 'bankTransfer', label: 'Bank Transfer (BNI & BRI)' },
        { key: 'dana', label: 'Dana' },
        { key: 'shopeepay', label: 'Shopeepay' }
    ];

    return (
        <SettingsCard title="Metode Pembayaran" description="Aktifkan atau nonaktifkan metode pembayaran yang tersedia untuk klien saat booking.">
             <div className="space-y-3">
                {paymentOptions.map(opt => (
                    <div key={opt.key}>
                        <div className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                            <p className="font-medium">{opt.label}</p>
                            <ToggleSwitch enabled={settings.paymentMethods[opt.key]} onChange={() => handleToggle(opt.key)} />
                        </div>
                        {opt.key === 'qris' && settings.paymentMethods.qris && (
                            <div className="mt-2 pl-6 pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar QRIS</label>
                                <div className="flex items-center gap-4">
                                    {settings.paymentMethods.qrisImage ? (
                                        <img src={settings.paymentMethods.qrisImage} alt="QRIS Preview" className="h-24 w-24 object-contain border rounded-md p-1 bg-white"/>
                                    ) : (
                                        <div className="h-24 w-24 bg-gray-100 rounded-md flex items-center justify-center text-center text-xs text-gray-400">Belum ada gambar</div>
                                    )}
                                    <div>
                                        <label htmlFor="qris-upload" className="cursor-pointer text-sm font-semibold text-primary bg-primary/10 px-3 py-2 rounded-lg hover:bg-primary/20">
                                            Upload Gambar
                                        </label>
                                        <input id="qris-upload" type="file" accept="image/*" onChange={handleQrisImageUpload} className="hidden" />
                                        <p className="text-xs text-muted mt-1">Gunakan file .jpg atau .png</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
             </div>
             <div className="flex justify-end mt-6 border-t pt-4">
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    <Save size={16}/> Simpan Pengaturan Pembayaran
                </button>
            </div>
        </SettingsCard>
    );
};

const UsersSettingsTab = () => (
    <Card>
        <div className="flex items-center gap-6">
            <div className="p-4 bg-primary/10 rounded-xl text-primary"><Shield size={32}/></div>
            <div>
                <h3 className="text-xl font-bold">Manajemen Akun Staff & Peran</h3>
                <p className="text-muted mt-1 max-w-md">Tambah, edit, atau hapus akun untuk staff dan atur peran mereka di halaman khusus manajemen staf.</p>
                <Link to="/admin/users" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    Buka Manajemen Staf <ArrowRight size={16}/>
                </Link>
            </div>
        </div>
    </Card>
);

const InventorySettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'inventory' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', category: 'Kamera', status: InventoryStatus.Available });

    const fetchData = async () => {
        setLoading(true);
        const data = await getInventoryItems();
        setInventory(data);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = (mode: ModalMode, itemData?: InventoryItem) => {
        setModalState({ isOpen: true, mode, type: 'inventory', itemData });
        if (mode === 'edit' && itemData) {
            setFormData({ name: itemData.name, category: itemData.category, status: itemData.status });
        } else {
            setFormData({ name: '', category: 'Kamera', status: InventoryStatus.Available });
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        const { mode, itemData } = modalState;
        if (mode === 'add') {
            // FIX: Add missing 'lastChecked' property when creating a new inventory item.
            await addInventoryItem({ ...formData, lastChecked: null }, currentUser.id);
        } else if (itemData) {
            await updateInventoryItem(itemData.id, formData, currentUser.id);
        }
        setModalState({ ...modalState, isOpen: false });
        fetchData();
    };

    const handleDelete = async () => {
        if (isConfirmModalOpen && modalState.itemData && currentUser) {
            await deleteInventoryItem(modalState.itemData.id, currentUser.id);
            setIsConfirmModalOpen(false);
            fetchData();
        }
    };

    if (loading) return <p>Loading inventory...</p>;

    return (
        <Card>
             <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-primary">Manajemen Inventaris</h3>
                    <p className="text-muted mt-1">Kelola semua peralatan dan properti studio.</p>
                </div>
                <button onClick={() => openModal('add')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    <PlusCircle size={16}/> Tambah Item
                </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y">
                    <thead className="bg-base-200/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Nama Item</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Kategori</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">Status</th>
                            <th className="px-4 py-2 text-center text-sm font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {inventory.map(item => (
                            <tr key={item.id}>
                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{item.category}</td>
                                <td className="px-4 py-2 text-center text-sm">{item.status}</td>
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => openModal('edit', item)} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={16}/></button>
                                    <button onClick={() => { setModalState({ ...modalState, itemData: item }); setIsConfirmModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Modal isOpen={modalState.isOpen} onClose={() => setModalState({...modalState, isOpen: false})} title={modalState.mode === 'add' ? 'Tambah Item' : 'Edit Item'}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div><label>Nama Item</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border rounded" /></div>
                    <div><label>Kategori</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded"><option>Kamera</option><option>Lensa</option><option>Lighting</option><option>Aksesoris</option><option>Properti</option><option>Lainnya</option></select></div>
                    <div><label>Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as InventoryStatus})} className="w-full p-2 border rounded">{Object.values(InventoryStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalState({...modalState, isOpen: false})} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Batal</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Simpan</button></div>
                </form>
            </Modal>
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleDelete} title="Hapus Item" message={`Yakin ingin menghapus item "${modalState.itemData?.name}"?`} />
        </Card>
    )
};

const LoyaltySettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'loyaltyTier' });
    const [tierFormData, setTierFormData] = useState({ id: '', name: '', bookingThreshold: '', discountPercentage: '' });
    const [tierToDelete, setTierToDelete] = useState<LoyaltyTier | null>(null);

    useEffect(() => {
        getSystemSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value } = e.target;
        const keys = name.split('.');
        
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev));
            let current = newSettings;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newSettings;
        });
    };

    const openTierModal = (mode: ModalMode, tier?: LoyaltyTier) => {
        setModalState({ isOpen: true, mode, type: 'loyaltyTier', itemData: tier });
        setTierFormData(tier ? { ...tier, bookingThreshold: String(tier.bookingThreshold), discountPercentage: String(tier.discountPercentage) } : { id: '', name: '', bookingThreshold: '', discountPercentage: '' });
    };

    const handleTierSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        const updatedTiers = [...settings.loyaltySettings.loyaltyTiers];
        const tierData = {
            ...tierFormData,
            bookingThreshold: Number(tierFormData.bookingThreshold),
            discountPercentage: Number(tierFormData.discountPercentage),
        };

        if (modalState.mode === 'add') {
            updatedTiers.push({ ...tierData, id: String(Date.now()) });
        } else {
            const index = updatedTiers.findIndex(t => t.id === tierData.id);
            if (index > -1) updatedTiers[index] = tierData;
        }

        setSettings({ ...settings, loyaltySettings: { ...settings.loyaltySettings, loyaltyTiers: updatedTiers } });
        setModalState({ ...modalState, isOpen: false });
    };

    const handleDeleteTier = () => {
        if (!settings || !tierToDelete) return;
        const updatedTiers = settings.loyaltySettings.loyaltyTiers.filter(t => t.id !== tierToDelete.id);
        setSettings({ ...settings, loyaltySettings: { ...settings.loyaltySettings, loyaltyTiers: updatedTiers } });
        setTierToDelete(null);
    };

    const handleSave = async () => {
        if (settings && currentUser) {
            await updateSystemSettings(settings, currentUser.id);
            alert('Pengaturan loyalitas berhasil disimpan!');
        }
    };
    
    if (loading || !settings) return <p>Loading loyalty settings...</p>;

    return (
        <div className="space-y-6">
            <SettingsCard title="Sistem Poin & Referral" description="Atur bagaimana klien mendapatkan poin, bonus referral, dan diskon.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium">Poin per Rupiah</label>
                        <input type="number" name="loyaltySettings.pointsPerRupiah" value={settings.loyaltySettings.pointsPerRupiah} onChange={handleChange} className="mt-1 w-full p-2 border rounded" step="0.001"/>
                        <p className="text-xs text-muted mt-1">Contoh: 0.001 berarti 1 poin per Rp 1.000</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Nilai Rupiah per Poin (untuk ditukar)</label>
                        <input type="number" name="loyaltySettings.rupiahPerPoint" value={settings.loyaltySettings.rupiahPerPoint} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
                         <p className="text-xs text-muted mt-1">Contoh: 100 berarti 1 poin = diskon Rp 100</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Bonus Poin Referral</label>
                        <input type="number" name="loyaltySettings.referralBonusPoints" value={settings.loyaltySettings.referralBonusPoints} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
                        <p className="text-xs text-muted mt-1">Poin untuk pereferensi & klien baru setelah booking selesai.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Diskon Referral Booking Pertama (Rp)</label>
                        <input type="number" name="loyaltySettings.firstBookingReferralDiscount" value={settings.loyaltySettings.firstBookingReferralDiscount} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
                        <p className="text-xs text-muted mt-1">Potongan harga langsung untuk klien baru yang memakai kode.</p>
                    </div>
                </div>
            </SettingsCard>

            <SettingsCard title="Tier Loyalitas Pelanggan" description="Buat tingkatan untuk memberikan diskon otomatis bagi klien setia.">
                <div className="space-y-3">
                    {settings.loyaltySettings.loyaltyTiers.sort((a,b) => a.bookingThreshold - b.bookingThreshold).map(tier => (
                        <div key={tier.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                            <div>
                                <p className="font-semibold text-primary">{tier.name}</p>
                                <p className="text-sm text-muted">Syarat: {tier.bookingThreshold} booking | Diskon: {tier.discountPercentage}%</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openTierModal('edit', tier)} className="p-2 text-muted hover:text-accent"><Edit size={16} /></button>
                                <button onClick={() => setTierToDelete(tier)} className="p-2 text-muted hover:text-error"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => openTierModal('add')} className="mt-4 w-full flex items-center justify-center gap-2 text-sm p-2 text-accent bg-accent/10 hover:bg-accent/20 rounded-md transition-colors font-semibold">
                    <Plus size={14}/> Tambah Tier Baru
                </button>
            </SettingsCard>

            <div className="flex justify-end">
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    <Save size={16}/> Simpan Perubahan
                </button>
            </div>
            
            <Modal isOpen={modalState.isOpen && modalState.type === 'loyaltyTier'} onClose={() => setModalState({...modalState, isOpen: false})} title={modalState.mode === 'add' ? 'Tambah Tier' : 'Edit Tier'}>
                <form onSubmit={handleTierSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium">Nama Tier</label><input type="text" value={tierFormData.name} onChange={e => setTierFormData({...tierFormData, name: e.target.value})} required className="mt-1 w-full p-2 border rounded" placeholder="Contoh: Silver"/></div>
                    <div><label className="block text-sm font-medium">Syarat Minimum Booking</label><input type="number" value={tierFormData.bookingThreshold} onChange={e => setTierFormData({...tierFormData, bookingThreshold: e.target.value})} required className="mt-1 w-full p-2 border rounded" placeholder="Contoh: 10"/></div>
                    <div><label className="block text-sm font-medium">Persentase Diskon (%)</label><input type="number" value={tierFormData.discountPercentage} onChange={e => setTierFormData({...tierFormData, discountPercentage: e.target.value})} required className="mt-1 w-full p-2 border rounded" placeholder="Contoh: 7"/></div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalState({...modalState, isOpen: false})} className="px-4 py-2 rounded bg-gray-100">Batal</button><button type="submit" className="px-4 py-2 rounded bg-primary text-white">Simpan</button></div>
                </form>
            </Modal>
            <ConfirmationModal isOpen={!!tierToDelete} onClose={() => setTierToDelete(null)} onConfirm={handleDeleteTier} title="Hapus Tier" message={`Yakin ingin menghapus tier "${tierToDelete?.name}"?`} />
        </div>
    );
};

const PartnersSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'partner' });
    const [formData, setFormData] = useState({ id: '', name: '' });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

    useEffect(() => {
        getSystemSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        if (settings && currentUser) {
            await updateSystemSettings(settings, currentUser.id);
            alert('Perubahan partner berhasil disimpan!');
        }
    };

    const openModal = (mode: ModalMode, partner?: Partner) => {
        setModalState({ isOpen: true, mode, type: 'partner', itemData: partner });
        setFormData(partner ? { id: partner.id, name: partner.name } : { id: '', name: '' });
        setLogoPreview(partner ? partner.logoUrl : null);
        setLogoFile(null);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsSaving(true);
        try {
            let logoUrl = modalState.itemData?.logoUrl || '';
            if (logoFile) {
                const base64 = await fileToBase64(logoFile);
                const response = await fetch('/api/uploadImage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64, folder: 'partners_logos' })
                });
                if (!response.ok) throw new Error('Gagal mengunggah logo.');
                const result = await response.json();
                logoUrl = result.secure_url;
            }
            if (!logoUrl) throw new Error('Logo wajib diunggah.');

            const currentPartners = settings.partners || [];
            if (modalState.mode === 'add') {
                const newPartner: Partner = { id: String(Date.now()), name: formData.name, logoUrl };
                setSettings({ ...settings, partners: [...currentPartners, newPartner] });
            } else {
                const updatedPartners = currentPartners.map(p =>
                    p.id === modalState.itemData.id ? { ...p, name: formData.name, logoUrl } : p
                );
                setSettings({ ...settings, partners: updatedPartners });
            }
            setModalState({ ...modalState, isOpen: false });
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!settings || !partnerToDelete) return;
        const updatedPartners = (settings.partners || []).filter(p => p.id !== partnerToDelete.id);
        setSettings({ ...settings, partners: updatedPartners });
        setPartnerToDelete(null);
    };

    if (loading) return <p>Loading...</p>;

    return (
        <SettingsCard title="Partner Kolaborasi" description="Kelola logo partner yang ditampilkan di halaman depan.">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(settings?.partners || []).map(partner => (
                    <div key={partner.id} className="relative group p-4 border rounded-lg flex flex-col items-center justify-center">
                        <img src={partner.logoUrl} alt={partner.name} className="h-16 object-contain" />
                        <p className="text-sm font-semibold mt-2">{partner.name}</p>
                        <div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal('edit', partner)} className="p-1.5 bg-base-200 rounded-md hover:bg-base-300"><Edit size={14}/></button>
                            <button onClick={() => setPartnerToDelete(partner)} className="p-1.5 bg-base-200 rounded-md hover:bg-base-300"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
                <button onClick={() => openModal('add')} className="p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted hover:bg-base-100 hover:text-primary">
                    <PlusCircle size={24} />
                    <span className="text-sm font-semibold mt-2">Tambah Baru</span>
                </button>
            </div>
             <div className="flex justify-end mt-6 border-t pt-4">
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 font-semibold">
                    <Save size={16}/> Simpan Perubahan Partner
                </button>
            </div>
            <Modal isOpen={modalState.isOpen && modalState.type === 'partner'} onClose={() => setModalState({ ...modalState, isOpen: false })} title={modalState.mode === 'add' ? 'Tambah Partner' : 'Edit Partner'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label>Nama Partner</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-2 border rounded" /></div>
                    <div><label>Logo</label><input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-sm" /></div>
                    {logoPreview && <img src={logoPreview} alt="Preview" className="h-20 object-contain border rounded p-2" />}
                    <div className="flex justify-end gap-2 pt-4"><button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded w-24">{isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'Simpan'}</button></div>
                </form>
            </Modal>
             <ConfirmationModal isOpen={!!partnerToDelete} onClose={() => setPartnerToDelete(null)} onConfirm={handleDelete} title="Hapus Partner" message={`Yakin ingin menghapus partner "${partnerToDelete?.name}"?`} />
        </SettingsCard>
    );
};


// --- MAIN COMPONENT ---
const AdminSettingsPage = () => {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'Umum', icon: SlidersHorizontal },
        { id: 'services', label: 'Layanan & Harga', icon: Box },
        { id: 'partners', label: 'Partner Kolaborasi', icon: Handshake },
        { id: 'inventory', label: 'Inventaris', icon: Archive },
        { id: 'promos', label: 'Promosi', icon: Tag },
        { id: 'loyalty', label: 'Loyalitas & Referral', icon: Award },
        { id: 'payments', label: 'Pembayaran', icon: CreditCard },
        { id: 'users', label: 'Akun & Peran', icon: Users },
    ];
    
    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettingsTab />;
            case 'services': return <ServicesSettingsTab />;
            case 'promos': return <PromosSettingsTab />;
            case 'loyalty': return <LoyaltySettingsTab />;
            case 'payments': return <PaymentsSettingsTab />;
            case 'users': return <UsersSettingsTab />;
            case 'inventory': return <InventorySettingsTab />;
            case 'partners': return <PartnersSettingsTab />;
            default: return null;
        }
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Settings size={28} />
                 </div>
                 <div>
                    <h1 className="text-3xl font-bold text-primary">System Settings Panel</h1>
                    <p className="text-muted">Pusat kendali untuk mengelola semua aspek operasional Studio 8.</p>
                 </div>
            </div>
            
            <div className="flex border-b border-base-200 mb-6 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-base-content'}`}>
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminSettingsPage;