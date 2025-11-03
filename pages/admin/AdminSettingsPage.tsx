

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
    getPackages, getAddOns, addPackage, updatePackage, deletePackage, 
    addAddOn, updateAddOn, deleteAddOn, addSubPackage, updateSubPackage, 
    deleteSubPackage, addSubAddOn, updateSubAddOn, deleteSubAddOn,
    updateSystemSettings, getPromos, addPromo, updatePromo, deletePromo,
    getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    generatePackageDescription
} from '../../services/api';
import { Package, AddOn, SubPackage, SubAddOn, SystemSettings, FeatureToggles, Promo, OperationalHours, PaymentMethods, InventoryItem, InventoryStatus, LoyaltyTier, Partner, ImageUpload } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { PlusCircle, Edit, Trash2, Box, Puzzle, Plus, Settings, SlidersHorizontal, Tag, CreditCard, Users, Shield, Save, ToggleLeft, ToggleRight, Percent, Calendar, Key, ArrowRight, Archive, MessageCircle, Instagram as InstagramIcon, Award, UploadCloud, Loader2, CheckCircle, AlertCircle, Sparkles, Handshake, ImageIcon } from 'lucide-react';
import Card from '../../components/common/Card';
import { fileToBase64 } from '../../utils/fileUtils';
import { useSystemSettings } from '../../App';
import ImageCropperModal from '../../components/admin/ImageCropperModal';

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
    const { settings: initialSettings, loading: initialLoading } = useSystemSettings();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings))); // Deep copy for local edits
            setLoading(false);
        }
    }, [initialSettings]);

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

    if (loading || initialLoading) return <p>Loading general settings...</p>;
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

const AppearanceSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const { settings: initialSettings, loading: initialLoading } = useSystemSettings();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings)));
            setLoading(false);
        }
    }, [initialSettings]);

    const handleFileUpload = async (file: File, type: 'hero' | 'about') => {
        if (!settings) return;
        setIsSaving(true);
        try {
            const isHero = type === 'hero';
            const resizeOptions = {
                maxWidth: isHero ? 1920 : 1280,
                maxHeight: isHero ? 1920 : 1280,
                quality: 0.75,
            };
            const base64 = await fileToBase64(file, resizeOptions);
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upload', imageBase64: base64, folder: 'landing_page' })
            });
            if (!response.ok) throw new Error('Upload gagal.');
            const result = await response.json();
            
            setSettings(prev => {
                if (!prev) return null;
                const newSettings = JSON.parse(JSON.stringify(prev)); // Deep copy
                if (!newSettings.landingPageImages) {
                    newSettings.landingPageImages = { hero: [], about: '' };
                }

                if (type === 'hero') {
                    newSettings.landingPageImages.hero.push(result.secure_url);
                } else {
                    newSettings.landingPageImages.about = result.secure_url;
                }
                return newSettings;
            });

        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveHeroImage = (urlToRemove: string) => {
        if (!settings?.landingPageImages) return;
        setSettings(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                landingPageImages: {
                    ...prev.landingPageImages,
                    hero: (prev.landingPageImages?.hero ?? []).filter(url => url !== urlToRemove),
                },
            };
        });
    };

    const handleSave = async () => {
        if (settings && currentUser) {
            setIsSaving(true);
            await updateSystemSettings(settings, currentUser.id);
            setIsSaving(false);
            alert('Pengaturan tampilan berhasil disimpan!');
        }
    };

    if (loading || initialLoading || !settings) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
            <SettingsCard title="Gambar Hero Section" description="Kelola gambar yang tampil di carousel halaman depan.">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {settings.landingPageImages?.hero?.map((url, index) => (
                        <div key={index} className="relative group aspect-video">
                            <img src={url} alt={`Hero ${index+1}`} className="w-full h-full object-cover rounded-lg" />
                            <button
                                type="button"
                                onClick={() => handleRemoveHeroImage(url)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                     <label htmlFor="hero-upload" className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-lg cursor-pointer hover:bg-base-100">
                        <UploadCloud size={24} className="text-muted" />
                        <span className="text-xs text-muted mt-1">Tambah Gambar</span>
                        <input id="hero-upload" type="file" accept="image/*" onChange={e => e.target.files && handleFileUpload(e.target.files[0], 'hero')} className="hidden" />
                    </label>
                </div>
            </SettingsCard>

            <SettingsCard title="Gambar About Section" description="Ganti gambar yang tampil di bagian 'Tentang Kami'.">
                <div className="flex items-center gap-4">
                    {settings.landingPageImages?.about && (
                        <img src={settings.landingPageImages.about} alt="About" className="w-48 h-auto object-cover rounded-lg" />
                    )}
                    <label htmlFor="about-upload" className="cursor-pointer text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-lg hover:bg-primary/20">
                        {settings.landingPageImages?.about ? 'Ganti Gambar' : 'Upload Gambar'}
                    </label>
                    <input id="about-upload" type="file" accept="image/*" onChange={e => e.target.files && handleFileUpload(e.target.files[0], 'about')} className="hidden" />
                </div>
            </SettingsCard>
            
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                    Simpan Perubahan
                </button>
            </div>
        </div>
    );
};

const ServicesSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, mode: 'add', type: 'package' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [cropperState, setCropperState] = useState<{ isOpen: boolean; imageSrc: string | null; sourceFile: File | null }>({ isOpen: false, imageSrc: null, sourceFile: null });
    
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
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setCropperState({ isOpen: true, imageSrc: reader.result as string, sourceFile: file });
            };
            reader.readAsDataURL(file);
        }
        // Reset file input to allow re-uploading the same file
        e.target.value = '';
    };

    const handleCropSave = (croppedImageBlob: Blob) => {
        if (cropperState.sourceFile) {
            // Use a consistent name but vary it slightly to avoid conflicts if needed
            const fileName = `cropped-${cropperState.sourceFile.name}`;
            const croppedFile = new File([croppedImageBlob], fileName, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

            const newUpload: ImageUpload = {
                id: `${croppedFile.name}-${Date.now()}`,
                file: croppedFile,
                preview: URL.createObjectURL(croppedFile),
                status: 'pending'
            };
            setImageUploads(prev => [...prev, newUpload]);
        }
        setCropperState({ isOpen: false, imageSrc: null, sourceFile: null });
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
        let hadError = false;
        
        try {
            const { mode, type, itemData, parentId } = modalState;
            
            let finalImageUrls = [...formData.imageUrls];
            const filesToUpload = imageUploads.filter(f => f.status === 'pending' || f.status === 'error');

            if (filesToUpload.length > 0) {
                const uploadPromises = filesToUpload.map(async (fileWrapper) => {
                    updateFileState(fileWrapper.id, { status: 'uploading', error: undefined });
                    try {
                        const base64 = await fileToBase64(fileWrapper.file);
                        const response = await fetch('/api/assets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'upload', imageBase64: base64, folder: 'package_images' })
                        });

                        if (!response.ok) {
                             let errorMessage = `Upload Gagal: Status ${response.status}`;
                            try {
                                const errorData = await response.json();
                                errorMessage = errorData.message || errorMessage;
                            } catch {
                                 errorMessage += ` (${response.statusText})`;
                            }
                            throw new Error(errorMessage);
                        }
                        const result = await response.json();
                        updateFileState(fileWrapper.id, { status: 'success' });
                        return result.secure_url;
                    } catch (error) {
                        hadError = true;
                        updateFileState(fileWrapper.id, { status: 'error', error: (error as Error).message });
                        return null;
                    }
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                const successfulUrls = uploadedUrls.filter((url): url is string => url !== null);
                finalImageUrls.push(...successfulUrls);
            }

            if (hadError) {
                // Stop submission if any upload failed. The UI will show individual errors.
                setIsSubmitting(false);
                return;
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
    
    // Helper to update individual file status in the UI
    const updateFileState = (id: string, updates: Partial<ImageUpload>) => {
        setImageUploads(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
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
        <>
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
                                                {upload.status === 'error' && <span title={upload.error}><AlertCircle size={12} className="text-red-400" /></span>}
                                            </div>
                                        </div>
                                    ))}
                                    <label htmlFor="image-upload" className="flex flex-col items-center justify-center h-24 w-full border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                        <UploadCloud size={24} className="text-gray-400"/>
                                        <span className="text-xs text-gray-500">Tambah</span>
                                        <input type="file" id="image-upload" accept="image/*" onChange={handleImageChange} className="hidden"/>
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
                    message={`Apakah Anda yakin ingin menghapus`}
                />
            </div>
            {cropperState.isOpen && (
                <ImageCropperModal
                    isOpen={cropperState.isOpen}
                    onClose={() => setCropperState({ isOpen: false, imageSrc: null, sourceFile: null })}
                    imageSrc={cropperState.imageSrc}
                    onSave={handleCropSave}
                    aspectRatio={3 / 2}
                />
            )}
        </>
    );
};

const PaymentSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const { settings: initialSettings, loading: initialLoading } = useSystemSettings();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrisFile, setQrisFile] = useState<File | null>(null);
    const [qrisPreview, setQrisPreview] = useState<string | null>(null);
    
    useEffect(() => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings)));
            setLoading(false);
        }
    }, [initialSettings]);

    const handlePaymentToggle = (method: keyof PaymentMethods) => {
        if (!settings) return;
        setSettings({
            ...settings,
            paymentMethods: { ...settings.paymentMethods, [method]: !settings.paymentMethods[method] }
        });
    };
    
    const handlePaymentContactChange = (field: 'danaNumber' | 'shopeepayNumber', value: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            paymentMethods: { ...settings.paymentMethods, [field]: value }
        });
    };
    
    const handleBankAccountChange = (index: number, field: keyof NonNullable<SystemSettings['paymentMethods']['bankAccounts']>[0], value: string) => {
        if (!settings) return;
        const newAccounts = [...(settings.paymentMethods.bankAccounts || [])];
        const accountToUpdate = newAccounts[index];
        if (accountToUpdate) {
            accountToUpdate[field] = value;
        }
        setSettings({
            ...settings,
            paymentMethods: { ...settings.paymentMethods, bankAccounts: newAccounts }
        });
    };
    
    const handleAddBankAccount = () => {
        if (!settings) return;
        const newAccounts = [...(settings.paymentMethods.bankAccounts || []), { bankName: '', accountNumber: '', accountHolder: '' }];
        setSettings({
            ...settings,
            paymentMethods: { ...settings.paymentMethods, bankAccounts: newAccounts }
        });
    };
    
    const handleRemoveBankAccount = (index: number) => {
        if (!settings) return;
        const newAccounts = (settings.paymentMethods.bankAccounts || []).filter((_, i) => i !== index);
        setSettings({
            ...settings,
            paymentMethods: { ...settings.paymentMethods, bankAccounts: newAccounts }
        });
    };


    const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQrisFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setQrisPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (settings && currentUser) {
            setLoading(true);
            let updatedSettings = { ...settings };
            if (qrisFile) {
                try {
                    const base64 = await fileToBase64(qrisFile, { skipResizing: true });
                    const response = await fetch('/api/assets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'upload', imageBase64: base64, folder: 'payment_methods', publicId: 'qris_code' })
                    });
                    if (!response.ok) throw new Error('Upload QRIS gagal.');
                    const result = await response.json();
                    updatedSettings.paymentMethods.qrisImage = result.secure_url;
                } catch (error) {
                    alert((error as Error).message);
                    setLoading(false);
                    return;
                }
            }
            await updateSystemSettings(updatedSettings, currentUser.id);
            setLoading(false);
            alert('Pengaturan pembayaran berhasil disimpan!');
        }
    };
    
    if (loading || initialLoading || !settings) return <p>Loading payment settings...</p>;

    return (
        <div className="space-y-6">
             <SettingsCard title="Metode Pembayaran" description="Aktifkan atau nonaktifkan metode pembayaran yang tersedia untuk klien.">
                <div className="space-y-3">
                    <div className="flex justify-between items-center"><p>QRIS</p><ToggleSwitch enabled={settings.paymentMethods.qris} onChange={() => handlePaymentToggle('qris' as any)} /></div>
                    <div className="flex justify-between items-center"><p>Transfer Bank</p><ToggleSwitch enabled={settings.paymentMethods.bankTransfer} onChange={() => handlePaymentToggle('bankTransfer' as any)} /></div>
                    <div className="flex justify-between items-center"><p>Dana</p><ToggleSwitch enabled={settings.paymentMethods.dana} onChange={() => handlePaymentToggle('dana' as any)} /></div>
                    <div className="flex justify-between items-center"><p>ShopeePay</p><ToggleSwitch enabled={settings.paymentMethods.shopeepay} onChange={() => handlePaymentToggle('shopeepay' as any)} /></div>
                </div>
                {settings.paymentMethods.qris && (
                    <div className="mt-4 pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700">Gambar QRIS</label>
                        <div className="mt-2 flex items-center gap-4">
                            <img src={qrisPreview || settings.paymentMethods.qrisImage} alt="QRIS" className="w-24 h-24 object-contain border bg-gray-100"/>
                            <input type="file" accept="image/*" onChange={handleQrisUpload} />
                        </div>
                    </div>
                )}
                 {settings.paymentMethods.bankTransfer && (
                    <div className="mt-4 pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700">Rekening Bank</label>
                        <div className="space-y-2 mt-2">
                             {(settings.paymentMethods.bankAccounts || []).map((acc, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-base-100 rounded-md">
                                    <input value={acc.bankName} onChange={e => handleBankAccountChange(index, 'bankName', e.target.value)} placeholder="Nama Bank" className="p-1 border rounded w-1/4"/>
                                    <input value={acc.accountNumber} onChange={e => handleBankAccountChange(index, 'accountNumber', e.target.value)} placeholder="Nomor Rekening" className="p-1 border rounded w-1/3"/>
                                    <input value={acc.accountHolder} onChange={e => handleBankAccountChange(index, 'accountHolder', e.target.value)} placeholder="Atas Nama" className="p-1 border rounded flex-grow"/>
                                    <button onClick={() => handleRemoveBankAccount(index)} className="p-1 text-red-500"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button onClick={handleAddBankAccount} className="text-sm font-semibold text-primary"><PlusCircle size={16} className="inline-block mr-1"/> Tambah Rekening</button>
                        </div>
                    </div>
                )}
                 {(settings.paymentMethods.dana || settings.paymentMethods.shopeepay) && (
                     <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                        {settings.paymentMethods.dana && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Nomor DANA</label>
                                <input type="text" value={settings.paymentMethods.danaNumber || ''} onChange={e => handlePaymentContactChange('danaNumber', e.target.value)} className="w-full p-2 border rounded mt-1"/>
                            </div>
                        )}
                         {settings.paymentMethods.shopeepay && (
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Nomor ShopeePay</label>
                                <input type="text" value={settings.paymentMethods.shopeepayNumber || ''} onChange={e => handlePaymentContactChange('shopeepayNumber', e.target.value)} className="w-full p-2 border rounded mt-1"/>
                            </div>
                        )}
                    </div>
                 )}
             </SettingsCard>
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                    <Save size={16}/> Simpan Perubahan
                </button>
            </div>
        </div>
    );
};

const LoyaltySettingsTab = () => {
    const { user: currentUser } = useAuth();
    const { settings: initialSettings, loading: initialLoading } = useSystemSettings();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<{ isOpen: boolean, mode: ModalMode, tier?: LoyaltyTier }>({ isOpen: false, mode: 'add' });

    useEffect(() => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings)));
            setLoading(false);
        }
    }, [initialSettings]);

    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value } = e.target;
        setSettings({
            ...settings,
            loyaltySettings: { ...settings.loyaltySettings, [name]: Number(value) }
        });
    };

    const handleTierChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
         if (!settings) return;
         const { name, value } = e.target;
         const newTiers = [...settings.loyaltySettings.loyaltyTiers];
         (newTiers[index] as any)[name] = Number(value);
         setSettings({...settings, loyaltySettings: {...settings.loyaltySettings, loyaltyTiers: newTiers }});
    };
    
    const handleAddTier = () => {
         if (!settings) return;
         const newTiers = [...settings.loyaltySettings.loyaltyTiers, { id: `tier-${Date.now()}`, name: 'New Tier', bookingThreshold: 0, discountPercentage: 0 }];
         setSettings({...settings, loyaltySettings: {...settings.loyaltySettings, loyaltyTiers: newTiers }});
    };
    
    const handleRemoveTier = (id: string) => {
         if (!settings) return;
         const newTiers = settings.loyaltySettings.loyaltyTiers.filter(t => t.id !== id);
         setSettings({...settings, loyaltySettings: {...settings.loyaltySettings, loyaltyTiers: newTiers }});
    };
    
     const handleSave = async () => {
        if (settings && currentUser) {
            await updateSystemSettings(settings, currentUser.id);
            alert('Pengaturan loyalitas berhasil disimpan!');
        }
    };

    if (loading || initialLoading || !settings) return <p>Loading loyalty settings...</p>;

    return (
        <div className="space-y-6">
            <SettingsCard title="Konversi Poin" description="Atur bagaimana poin didapat dan digunakan oleh klien.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="text-sm font-medium">Poin per Rupiah</label><input type="number" name="pointsPerRupiah" value={settings.loyaltySettings.pointsPerRupiah} onChange={handleSettingChange} className="w-full p-2 border rounded mt-1" /></div>
                    <div><label className="text-sm font-medium">Rupiah per Poin (untuk redeem)</label><input type="number" name="rupiahPerPoint" value={settings.loyaltySettings.rupiahPerPoint} onChange={handleSettingChange} className="w-full p-2 border rounded mt-1" /></div>
                </div>
            </SettingsCard>
            <SettingsCard title="Bonus Referral" description="Atur bonus untuk program referral klien.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="text-sm font-medium">Bonus Poin (untuk referrer & referred)</label><input type="number" name="referralBonusPoints" value={settings.loyaltySettings.referralBonusPoints} onChange={handleSettingChange} className="w-full p-2 border rounded mt-1" /></div>
                    <div><label className="text-sm font-medium">Diskon Booking Pertama (Rupiah)</label><input type="number" name="firstBookingReferralDiscount" value={settings.loyaltySettings.firstBookingReferralDiscount} onChange={handleSettingChange} className="w-full p-2 border rounded mt-1" /></div>
                </div>
            </SettingsCard>
            <SettingsCard title="Tier Loyalitas" description="Buat tingkatan loyalitas berdasarkan jumlah booking.">
                 <div className="space-y-4">
                    {settings.loyaltySettings.loyaltyTiers.map((tier, index) => (
                        <div key={tier.id} className="flex items-center gap-2 p-2 bg-base-100 rounded-md">
                            <input value={tier.name} onChange={e => handleTierChange(index, { target: {name: 'name', value: e.target.value}} as any)} placeholder="Nama Tier" className="p-1 border rounded w-1/3"/>
                            <input type="number" name="bookingThreshold" value={tier.bookingThreshold} onChange={e => handleTierChange(index, e)} placeholder="Min. Bookings" className="p-1 border rounded w-1/3"/>
                            <input type="number" name="discountPercentage" value={tier.discountPercentage} onChange={e => handleTierChange(index, e)} placeholder="Diskon (%)" className="p-1 border rounded w-1/3"/>
                            <button onClick={() => handleRemoveTier(tier.id)} className="p-1 text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={handleAddTier} className="text-sm font-semibold text-primary"><PlusCircle size={16} className="inline-block mr-1"/> Tambah Tier</button>
                 </div>
            </SettingsCard>
            <div className="flex justify-end"><button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"><Save size={16}/> Simpan Perubahan</button></div>
        </div>
    );
};

const PartnershipSettingsTab = () => {
    const { user: currentUser } = useAuth();
    const { settings: initialSettings, loading: initialLoading } = useSystemSettings();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [newPartner, setNewPartner] = useState({ name: '', logoUrl: '' });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialSettings) {
            setSettings(JSON.parse(JSON.stringify(initialSettings)));
            setLoading(false);
        }
    }, [initialSettings]);

    const handleAddPartner = async () => {
        if (!settings || !newPartner.name || (!newPartner.logoUrl && !logoFile)) return;
        setIsSaving(true);
        let finalLogoUrl = newPartner.logoUrl;
        if (logoFile) {
            const base64 = await fileToBase64(logoFile, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upload', imageBase64: base64, folder: 'partners' })
            });
            if (!response.ok) { alert('Upload logo gagal.'); setIsSaving(false); return; }
            const result = await response.json();
            finalLogoUrl = result.secure_url;
        }

        const updatedPartners = [...(settings.partners || []), { id: `partner-${Date.now()}`, name: newPartner.name, logoUrl: finalLogoUrl }];
        setSettings({ ...settings, partners: updatedPartners });
        setNewPartner({ name: '', logoUrl: '' });
        setLogoFile(null);
        setIsSaving(false);
    };

    const handleRemovePartner = (id: string) => {
        if (!settings) return;
        setSettings({ ...settings, partners: settings.partners?.filter(p => p.id !== id) });
    };

    const handleSave = async () => {
        if (settings && currentUser) {
            setIsSaving(true);
            await updateSystemSettings(settings, currentUser.id);
            setIsSaving(false);
            alert('Data partner berhasil disimpan!');
        }
    };
    
    if (loading || initialLoading || !settings) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
             <SettingsCard title="Manajemen Partner Kolaborasi" description="Kelola logo partner yang akan ditampilkan di landing page.">
                <div className="space-y-3 mb-4">
                    {settings.partners?.map(partner => (
                        <div key={partner.id} className="flex items-center justify-between p-2 bg-base-100 rounded-md">
                            <div className="flex items-center gap-3">
                                <img src={partner.logoUrl} alt={partner.name} className="h-10 w-24 object-contain bg-white p-1 rounded"/>
                                <span className="font-semibold">{partner.name}</span>
                            </div>
                            <button onClick={() => handleRemovePartner(partner.id)} className="p-2 text-muted hover:text-error"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <div className="flex items-end gap-2 p-3 border-t">
                    <input type="text" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} placeholder="Nama Partner" className="p-2 border rounded flex-grow"/>
                    <input type="file" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="p-1 border rounded text-sm"/>
                    <button onClick={handleAddPartner} disabled={isSaving} className="px-4 py-2 bg-primary/20 text-primary font-semibold rounded-md">{isSaving ? <Loader2 className="animate-spin"/> : 'Tambah'}</button>
                </div>
             </SettingsCard>
              <div className="flex justify-end"><button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"><Save size={16}/> Simpan Perubahan</button></div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const AdminSettingsPage = () => {
    const [activeTab, setActiveTab] = useState('services');

    const tabs = [
        { id: 'services', label: 'Layanan & Paket', icon: <Box size={16} /> },
        { id: 'general', label: 'Umum & Kontak', icon: <Settings size={16} /> },
        { id: 'appearance', label: 'Tampilan', icon: <ImageIcon size={16} /> },
        { id: 'payment', label: 'Pembayaran', icon: <CreditCard size={16} /> },
        { id: 'loyalty', label: 'Loyalitas & Referral', icon: <Award size={16} /> },
        { id: 'partners', label: 'Partner', icon: <Handshake size={16} /> },
    ];
    
    const renderContent = () => {
        switch (activeTab) {
            case 'services': return <ServicesSettingsTab />;
            case 'general': return <GeneralSettingsTab />;
            case 'appearance': return <AppearanceSettingsTab />;
            case 'payment': return <PaymentSettingsTab />;
            case 'loyalty': return <LoyaltySettingsTab />;
            case 'partners': return <PartnershipSettingsTab />;
            default: return null;
        }
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Pengaturan Sistem</h1>
                <p className="text-muted mt-1">Kelola semua aspek operasional dan tampilan dari satu tempat.</p>
            </div>

            <div className="border-b mb-6">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors rounded-t-lg ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-primary'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div>{renderContent()}</div>
        </div>
    );
};

export default AdminSettingsPage;