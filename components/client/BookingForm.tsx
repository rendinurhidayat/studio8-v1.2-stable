import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPackages, getAddOns, getSystemSettings, getClientDetailsForBooking, validateReferralCode } from '../../services/api';
import { Package, AddOn, SubPackage, SubAddOn, SystemSettings, Client } from '../../types';
import { User, Mail, Phone, Calendar, Clock, Users, MessageSquare, CreditCard, UploadCloud, CheckCircle, ArrowRight, ArrowLeft, Send, Home, Search, FileText, Loader2, AlertTriangle, Tag, Award, X } from 'lucide-react';
import { fileToBase64 as fileUtilToBase64 } from '../../utils/fileUtils';


// --- Type Definitions ---
type FormData = {
    name: string;
    email: string;
    whatsapp: string;
    date: string;
    time: string;
    packageId: string;
    subPackageId: string;
    people: number;
    subAddOnIds: string[];
    notes: string;
    paymentMethod: 'QRIS' | 'Bank Transfer' | 'Dana' | 'Shopeepay' | '';
    paymentProof: File | null;
    referralCode: string;
    usePoints: boolean;
};

// --- Constants ---
const TOTAL_STEPS_DISPLAY = 5; // Total steps shown in progress bar
const PAYMENT_STEP = 5;
const CONFIRMATION_STEP = 6;

const motivationalMessages = [
    "", // Index 0 placeholder
    "Langkah kecil menuju momen besar 📸",
    "Pilih tanggal dan paket terbaikmu!",
    "Sedikit tambahan untuk hasil maksimal ✨",
    "Cek lagi detail pesananmu, ya. Biar gak ada yang salah.",
    "Hampir selesai! Tinggal selangkah lagi.",
    "Siapin pose terbaikmu ya 👀✨" // For confirmation page, though not shown with progress bar
];

type ReferralStatus = {
    isValid: boolean | null;
    message: string;
    loading: boolean;
}

const calculateDpAmount = (totalPrice: number, pkg: Package | undefined): number => {
    if (!pkg) return 35000;
    
    const packageType = pkg.type || 'Studio';

    if (packageType === 'Outdoor') {
        return totalPrice * 0.5;
    }
    // Studio type
    if (totalPrice > 150000) {
        return totalPrice * 0.5;
    }
     // Studio under or equal 150k
    return 35000;
};

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<{ base64: string, fileName: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        fileUtilToBase64(file).then(dataUrl => {
            const base64String = dataUrl.split(',')[1];
            resolve({
                base64: base64String,
                fileName: file.name,
                mimeType: file.type,
            });
        }).catch(reject);
    });
};


// --- Helper Components ---
const InputWithIcon: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { Icon: React.ElementType, label?: string, error?: string }> = ({ Icon, label, error, ...props }) => (
    <div>
        {label && <label className="text-sm font-semibold text-base-content block mb-2">{label}</label>}
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon className="w-5 h-5 text-muted" />
            </span>
            <input
                {...props}
                className={`w-full pl-10 pr-3 py-2.5 sm:py-3 text-base-content bg-base-100 border-2 ${error ? 'border-error' : 'border-base-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors`}
            />
        </div>
        {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
);

const SelectWithIcon: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { Icon: React.ElementType, label?: string, error?: string, children: React.ReactNode }> = ({ Icon, label, error, children, ...props }) => (
     <div>
        {label && <label className="text-sm font-semibold text-base-content block mb-2">{label}</label>}
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icon className="w-5 h-5 text-muted" />
            </span>
            <select
                {...props}
                className={`w-full pl-10 pr-10 py-2.5 sm:py-3 text-base-content bg-base-100 border-2 ${error ? 'border-error' : 'border-base-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors appearance-none`}
            >
                {children}
            </select>
             <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </span>
        </div>
        {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
);

const TextareaWithIcon: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { Icon: React.ElementType, label?: string, error?: string }> = ({ Icon, label, error, ...props }) => (
    <div>
        {label && <label className="text-sm font-semibold text-base-content block mb-2">{label}</label>}
        <div className="relative">
             <span className="absolute top-3.5 left-0 flex items-center pl-3">
                <Icon className="w-5 h-5 text-muted" />
            </span>
            <textarea
                {...props}
                rows={4}
                className={`w-full pl-10 pr-3 py-3 text-base-content bg-base-100 border-2 ${error ? 'border-error' : 'border-base-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors`}
            ></textarea>
        </div>
        {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
);


// --- Step Components ---
const Step1Personal: React.FC<{formData: FormData, setFormData: Function, errors: Partial<Record<keyof FormData, string>>, onWhatsappChange: any, validateField: Function, onEmailBlur: () => void}> = ({ formData, setFormData, errors, onWhatsappChange, validateField, onEmailBlur }) => (
    <div className="space-y-6">
        <InputWithIcon 
            Icon={User} 
            type="text" 
            placeholder="Nama kamu siapa nih, Bos?" 
            value={formData.name} 
            onChange={e => {
                setFormData({...formData, name: e.target.value})
                if (errors.name) validateField('name', e.target.value);
            }} 
            onBlur={() => validateField('name', formData.name)}
            error={errors.name} 
        />
        <InputWithIcon 
            Icon={Mail} 
            type="email" 
            placeholder="Email untuk konfirmasi" 
            value={formData.email} 
            onChange={e => {
                setFormData({...formData, email: e.target.value})
                if (errors.email) validateField('email', e.target.value);
            }}
            onBlur={() => {
                validateField('email', formData.email);
                onEmailBlur();
            }}
            error={errors.email} 
        />
        <InputWithIcon 
            Icon={Phone} 
            type="tel" 
            placeholder="WA aktif ya, biar kita kirim konfirmasi nanti 😄" 
            value={formData.whatsapp} 
            onChange={onWhatsappChange} 
            onBlur={() => validateField('whatsapp', formData.whatsapp)}
            error={errors.whatsapp} 
        />
    </div>
);

const Step2Details: React.FC<{formData: FormData, setFormData: Function, errors: Partial<Record<keyof FormData, string>>, packages: Package[], validateField: Function}> = ({ formData, setFormData, errors, packages, validateField }) => {
    const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
    const selectedPackage = packages.find(p => p.id === formData.packageId);

    const handlePackageSelect = (packageId: string) => {
        setFormData({ ...formData, packageId, subPackageId: '' }); // Reset sub-package on new package selection
        validateField('packageId', packageId);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputWithIcon 
                    Icon={Calendar} 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    onBlur={() => validateField('date', formData.date)}
                    error={errors.date} 
                    min={new Date().toISOString().split('T')[0]}
                />
                <SelectWithIcon 
                    Icon={Clock} 
                    value={formData.time} 
                    onChange={e => setFormData({...formData, time: e.target.value})} 
                    onBlur={() => validateField('time', formData.time)}
                    error={errors.time}
                >
                    <option value="" disabled>Pilih Jam</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </SelectWithIcon>
            </div>
            <div>
                <label className="text-sm font-semibold text-base-content block mb-2">Pilih Paket</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {packages.map(pkg => (
                        <div key={pkg.id} onClick={() => handlePackageSelect(pkg.id)} className={`p-3 text-center border-2 rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center gap-2 ${formData.packageId === pkg.id ? 'border-accent bg-accent/10 scale-105' : 'border-base-200 hover:border-base-300'}`}>
                            {pkg.imageUrls && pkg.imageUrls[0] && <img src={pkg.imageUrls[0]} alt={pkg.name} className="w-full h-20 object-cover rounded-md mb-2"/>}
                            <p className="font-semibold text-sm text-base-content">{pkg.name}</p>
                            <p className="text-xs text-muted">{pkg.description}</p>
                        </div>
                    ))}
                </div>
                {errors.packageId && <p className="text-xs text-error mt-1">{errors.packageId}</p>}
            </div>

            <AnimatePresence>
            {selectedPackage && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="pt-4">
                        <label className="text-sm font-semibold text-base-content block mb-2">Pilih Varian Paket {selectedPackage.name}</label>
                        <div className="space-y-2">
                             {selectedPackage.subPackages.map(sub => (
                                <div key={sub.id} onClick={() => {
                                    setFormData({...formData, subPackageId: sub.id});
                                    validateField('subPackageId', sub.id);
                                }} className={`flex justify-between items-center p-3 border-2 rounded-xl cursor-pointer ${formData.subPackageId === sub.id ? 'border-accent bg-accent/10' : 'border-base-200'}`}>
                                    <div>
                                        <p className="font-semibold text-sm text-base-content">{sub.name}</p>
                                        {sub.description && <p className="text-xs text-muted">{sub.description}</p>}
                                    </div>
                                    <p className="font-bold text-sm text-accent">Rp {sub.price.toLocaleString('id-ID')}</p>
                                </div>
                            ))}
                        </div>
                        {errors.subPackageId && <p className="text-xs text-error mt-1">{errors.subPackageId}</p>}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            <InputWithIcon 
                Icon={Users} 
                type="number" 
                label="Jumlah Orang" 
                value={formData.people} 
                onChange={e => setFormData({...formData, people: parseInt(e.target.value, 10) || 1})} 
                onBlur={() => validateField('people', formData.people)}
                error={errors.people} min={1} 
            />
        </div>
    );
}

const Step3Addons: React.FC<{
    formData: FormData, setFormData: Function, addOns: AddOn[],
    referralStatus: ReferralStatus, onValidateReferral: () => void, setReferralStatus: (status: ReferralStatus) => void
}> = ({ formData, setFormData, addOns, referralStatus, onValidateReferral, setReferralStatus }) => {
    const handleToggleSubAddOn = (subId: string) => {
        const newSubAddOns = formData.subAddOnIds.includes(subId)
            ? formData.subAddOnIds.filter(id => id !== subId)
            : [...formData.subAddOnIds, subId];
        setFormData({ ...formData, subAddOnIds: newSubAddOns });
    };

    const isReferralApplied = referralStatus.isValid === true;

    return (
        <div className="space-y-4">
            <div className="space-y-4">
                {addOns.map(addon => (
                    <div key={addon.id} className="p-4 border border-base-200 rounded-2xl bg-white">
                        <p className="font-semibold text-base-content mb-2">{addon.name}</p>
                        <div className="space-y-2">
                        {addon.subAddOns.map(sub => (
                            <div key={sub.id} onClick={() => handleToggleSubAddOn(sub.id)} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${formData.subAddOnIds.includes(sub.id) ? 'border-accent bg-accent/10' : 'border-base-200'}`}>
                                <p className="text-sm text-base-content">{sub.name}</p>
                                <div className="flex items-center gap-3">
                                <p className="text-sm font-semibold text-base-content">Rp {sub.price.toLocaleString('id-ID')}</p>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${formData.subAddOnIds.includes(sub.id) ? 'bg-accent border-accent' : 'border-base-300'}`}>
                                        {formData.subAddOnIds.includes(sub.id) && <CheckCircle className="w-3 h-3 text-white"/>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                ))}
            </div>
             <TextareaWithIcon Icon={MessageSquare} placeholder="Ada konsep tertentu? Ceritain di sini~" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
             <div className="pt-4">
                <label className="text-sm font-semibold text-base-content block mb-2">Punya Kode Referral?</label>
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"/>
                        <input type="text" placeholder="Masukkan kode di sini" disabled={isReferralApplied} value={formData.referralCode} onChange={e => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })} className="w-full pl-10 pr-3 py-3 text-base-content bg-base-100 border-2 border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors disabled:bg-base-200"/>
                    </div>
                    {isReferralApplied ? (
                        <button type="button" onClick={() => { setFormData({...formData, referralCode: ''}); setReferralStatus({ isValid: null, message: '', loading: false }); }} className="p-3 bg-base-200 text-muted rounded-xl hover:bg-base-300"><X size={20}/></button>
                    ) : (
                        <button type="button" onClick={onValidateReferral} disabled={referralStatus.loading} className="px-4 bg-primary text-primary-content rounded-xl hover:bg-primary/90 disabled:opacity-50 w-32 flex justify-center items-center">
                            {referralStatus.loading ? <Loader2 className="animate-spin"/> : 'Validasi'}
                        </button>
                    )}
                </div>
                {referralStatus.message && (
                    <p className={`text-xs mt-1 ${referralStatus.isValid ? 'text-success' : 'text-error'}`}>{referralStatus.message}</p>
                )}
            </div>
        </div>
    );
};

const Step4Summary: React.FC<{
    formData: FormData, packages: Package[], addOns: AddOn[], clientData: Client | null, settings: SystemSettings | null, setFormData: Function
}> = ({ formData, packages, addOns, clientData, settings, setFormData }) => {
    
    const selectedPackage = packages.find(p => p.id === formData.packageId);
    const selectedSubPackage = selectedPackage?.subPackages.find(sp => sp.id === formData.subPackageId);
    const selectedSubAddOns = addOns.flatMap(addon => addon.subAddOns).filter(sub => formData.subAddOnIds.includes(sub.id));

    const extraPersonCharge = (selectedPackage?.isGroupPackage && formData.people > 2)
        ? (formData.people - 2) * 15000
        : 0;
        
    const subtotal = (selectedSubPackage?.price || 0) + selectedSubAddOns.reduce((sum, addon) => sum + addon.price, 0) + extraPersonCharge;

    let discountAmount = 0;
    let discountReason = '';
    let pointsValue = 0;
    
    // Calculate loyalty/referral discount
    if (clientData?.totalBookings === 0 && formData.referralCode) {
        discountAmount = settings?.loyaltySettings.firstBookingReferralDiscount || 0;
        discountReason = 'Diskon Referral Pengguna Baru';
    } else if (clientData && clientData.totalBookings > 0 && settings) {
        const sortedTiers = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => b.bookingThreshold - a.bookingThreshold);
        const clientTier = sortedTiers.find(t => clientData.totalBookings >= t.bookingThreshold);
        if (clientTier) {
            discountAmount = subtotal * (clientTier.discountPercentage / 100);
            discountReason = `Diskon Tier ${clientTier.name} (${clientTier.discountPercentage}%)`;
        }
    }
    
    // Calculate points redemption
    if (formData.usePoints && clientData && settings && clientData.loyaltyPoints > 0) {
        pointsValue = Math.min(
            subtotal - discountAmount, 
            clientData.loyaltyPoints * settings.loyaltySettings.rupiahPerPoint
        );
    }
    
    const totalPrice = subtotal - discountAmount - pointsValue;
    const dpAmount = calculateDpAmount(totalPrice, selectedPackage);

    return (
        <div className="space-y-6">
            <div className="text-center">
                <FileText className="w-10 h-10 mx-auto text-accent"/>
                <h2 className="text-2xl font-bold text-primary mt-2">Ringkasan Pesanan</h2>
                <p className="text-muted">Mohon periksa kembali detail pesanan Anda sebelum melanjutkan.</p>
            </div>

            {clientData && clientData.loyaltyPoints > 0 && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center">
                        <input type="checkbox" id="usePoints" checked={formData.usePoints} onChange={e => setFormData({...formData, usePoints: e.target.checked})} className="h-4 w-4 rounded text-primary focus:ring-primary/50" />
                        <label htmlFor="usePoints" className="ml-3">
                            <p className="font-semibold text-primary">Gunakan {clientData.loyaltyPoints.toLocaleString('id-ID')} Poin Loyalitas?</p>
                            <p className="text-xs text-blue-800">Anda akan mendapat potongan sebesar Rp {pointsValue.toLocaleString('id-ID')}</p>
                        </label>
                    </div>
                </div>
            )}


            <div className="border border-base-200 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center"><span className="text-muted">Paket {selectedPackage?.name || '-'} ({selectedSubPackage?.name || ''})</span><span className="text-base-content">Rp {selectedSubPackage?.price.toLocaleString('id-ID')}</span></div>
                {selectedSubAddOns.map(addon => ( <div key={addon.id} className="flex justify-between items-center"><span className="text-muted text-sm pl-2">+ {addon.name}</span><span className="text-base-content text-sm">Rp {addon.price.toLocaleString('id-ID')}</span></div> ))}
                {extraPersonCharge > 0 && <div className="flex justify-between items-center"><span className="text-muted text-sm pl-2">Biaya Tambahan Orang ({formData.people - 2} org)</span><span className="text-base-content text-sm">Rp {extraPersonCharge.toLocaleString('id-ID')}</span></div>}
                <hr className="my-2 border-base-200"/>
                <div className="flex justify-between items-center"><span className="text-muted">Subtotal</span><span className="text-base-content font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span></div>
                {discountAmount > 0 && <div className="flex justify-between items-center"><span className="text-success">{discountReason}</span><span className="text-success font-semibold">- Rp {discountAmount.toLocaleString('id-ID')}</span></div>}
                {pointsValue > 0 && <div className="flex justify-between items-center"><span className="text-success">Potongan Poin</span><span className="text-success font-semibold">- Rp {pointsValue.toLocaleString('id-ID')}</span></div>}

                <hr className="my-2 border-dashed border-base-200"/>

                 <div className="flex justify-between items-center text-lg">
                    <span className="text-primary font-bold">Total Biaya</span>
                    <span className="text-accent font-extrabold">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
            </div>

             <div className="bg-accent/10 border-l-4 border-accent p-4 rounded-r-lg">
                <p className="text-sm text-accent/90">
                    Langkah selanjutnya adalah pembayaran <strong>Uang Muka (DP)</strong> sebesar <strong>Rp {dpAmount.toLocaleString('id-ID')}</strong> untuk mengamankan slot Anda.
                </p>
            </div>
        </div>
    );
};

const PaymentInfo: React.FC<{ method: FormData['paymentMethod']; settings: SystemSettings | null }> = ({ method, settings }) => {
    const paymentDetails = {
      dana: { name: 'Dana', account: '085724025425', user: 'Rendi Nurhidayat' },
      shopeepay: { name: 'Shopeepay', account: '085156103349', user: 'Rendi Nurhidayat' },
      bni: { name: 'Bank BNI', account: '1401083258', user: 'Rendi Nurhidayat' },
      bri: { name: 'Bank BRI', account: '400601003711501', user: 'Rendi Nurhidayat' },
    };

    const renderDetail = (title: string, value: string, name: string) => (
      <div className="flex justify-between items-center text-sm">
        <div>
          <p className="text-muted">{title}</p>
          <p className="font-bold text-base-content">{value}</p>
          <p className="text-muted text-xs">a/n {name}</p>
        </div>
        <button type="button" onClick={() => navigator.clipboard.writeText(value)} className="text-xs text-accent font-semibold px-2 py-1 rounded-md bg-accent/10 hover:bg-accent/20">Salin</button>
      </div>
    );
    
    if (!method) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-base-100 p-4 rounded-xl border border-base-200 overflow-hidden"
        >
            {method === 'QRIS' && (
                settings?.paymentMethods.qrisImage ? (
                    <div className="text-center">
                        <img src={settings.paymentMethods.qrisImage} alt="QRIS Payment" className="mx-auto rounded-lg w-48 h-48 md:w-56 md:h-56 object-contain" />
                        <p className="text-sm mt-2 text-muted">Scan QR code ini dengan aplikasi pembayaran favoritmu.</p>
                    </div>
                ) : (
                     <div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                        <p className="font-semibold">QR Code Tidak Tersedia</p>
                        <p className="text-sm">Silakan hubungi admin untuk informasi pembayaran QRIS.</p>
                    </div>
                )
            )}
            {method === 'Bank Transfer' && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-center text-base-content">Transfer ke salah satu rekening berikut:</h3>
                    {renderDetail(paymentDetails.bni.name, paymentDetails.bni.account, paymentDetails.bni.user)}
                    <hr className="border-base-200"/>
                    {renderDetail(paymentDetails.bri.name, paymentDetails.bri.account, paymentDetails.bri.user)}
                </div>
            )}
            {method === 'Dana' && (
                <div className="space-y-2">
                    {renderDetail(paymentDetails.dana.name, paymentDetails.dana.account, paymentDetails.dana.user)}
                </div>
            )}
            {method === 'Shopeepay' && (
                <div className="space-y-2">
                    {renderDetail(paymentDetails.shopeepay.name, paymentDetails.shopeepay.account, paymentDetails.shopeepay.user)}
                </div>
            )}
        </motion.div>
    );
}

const Step5Payment: React.FC<{formData: FormData, setFormData: Function, errors: Partial<Record<keyof FormData, string>>, settings: SystemSettings | null, packages: Package[]}> = ({ formData, setFormData, errors, settings, packages }) => {
    const [isDragging, setIsDragging] = useState(false);
    
    const allPaymentMethods: { name: FormData['paymentMethod'], key: keyof SystemSettings['paymentMethods'] }[] = [
        { name: 'QRIS', key: 'qris' },
        { name: 'Bank Transfer', key: 'bankTransfer' },
        { name: 'Dana', key: 'dana' },
        { name: 'Shopeepay', key: 'shopeepay' },
    ];

    const availablePaymentMethods = allPaymentMethods.filter(method => 
        settings ? settings.paymentMethods[method.key] : true
    );

    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            setFormData({ ...formData, paymentProof: files[0] });
        }
    };

    const dragEvents = {
        onDragEnter: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); },
        onDragLeave: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); },
        onDragOver: (e: React.DragEvent) => { e.preventDefault(); }, // Necessary to allow drop
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileChange(e.dataTransfer.files);
        },
    };
    
    // Recalculate total price to get DP amount
    const selectedPackage = packages.find(p => p.id === formData.packageId);
    const selectedSubPackage = selectedPackage?.subPackages.find(sp => sp.id === formData.subPackageId);
    const extraPersonCharge = (selectedPackage?.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
    const subtotal = (selectedSubPackage?.price || 0) + extraPersonCharge; // Simplified for DP calc
    const dpAmount = calculateDpAmount(subtotal, selectedPackage); // Use subtotal as totalPrice proxy

    return (
        <div className="space-y-6">
            <div className="text-center">
                <CreditCard className="w-10 h-10 mx-auto text-accent"/>
                <h2 className="text-2xl font-bold text-primary mt-2">Pembayaran Uang Muka</h2>
                <p className="text-muted">Pilih metode pembayaran dan unggah bukti transfer DP sebesar Rp {dpAmount.toLocaleString('id-ID')}.</p>
            </div>
            <div>
                <label className="text-sm font-semibold text-base-content block mb-2">Pilih Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-3">
                    {availablePaymentMethods.map(method => (
                        <button
                            type="button"
                            key={method.name}
                            onClick={() => setFormData({ ...formData, paymentMethod: method.name })}
                            className={`p-3 text-center border-2 rounded-xl cursor-pointer transition-all duration-200 ${formData.paymentMethod === method.name ? 'border-accent bg-accent/10 scale-105' : 'border-base-200 hover:border-base-300'}`}
                        >
                            <p className="font-semibold text-sm text-base-content">{method.name}</p>
                        </button>
                    ))}
                </div>
                {errors.paymentMethod && <p className="text-xs text-error mt-1">{errors.paymentMethod}</p>}
                
                <AnimatePresence>
                    {formData.paymentMethod && <PaymentInfo method={formData.paymentMethod} settings={settings} />}
                </AnimatePresence>
            </div>

            <div>
                <label className="text-sm font-semibold text-base-content block mb-2">Upload Bukti Pembayaran</label>
                <div
                    {...dragEvents}
                    className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${isDragging ? 'border-accent bg-accent/10' : errors.paymentProof ? 'border-error' : 'border-base-300 hover:border-base-300/80 bg-base-100'}`}
                >
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => handleFileChange(e.target.files)} accept="image/*,.pdf" />
                    {formData.paymentProof ? (
                        <div className="text-center">
                            <CheckCircle className="w-10 h-10 mx-auto text-success mb-2"/>
                            <p className="font-medium text-base-content">{formData.paymentProof.name}</p>
                            <p className="text-xs text-muted">Klik atau drag untuk mengganti file</p>
                        </div>
                    ) : (
                        <div className="text-center text-muted">
                             <UploadCloud className="w-10 h-10 mx-auto mb-2"/>
                            <p className="font-medium">Drag & drop file di sini</p>
                            <p className="text-sm">atau klik untuk memilih file</p>
                        </div>
                    )}
                </div>
                 {errors.paymentProof && <p className="text-xs text-error mt-1">{errors.paymentProof}</p>}
            </div>
        </div>
    );
};

const ConfirmationStep: React.FC<{ bookingCode: string, formData: FormData }> = ({ bookingCode, formData }) => (
    <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
    >
        <CheckCircle className="w-16 h-16 mx-auto text-success"/>
        <h2 className="mt-4 text-3xl font-extrabold text-primary">Booking Berhasil!</h2>
        <p className="mt-2 text-muted">Terima kasih, {formData.name}. Slot fotomu sudah kami amankan.</p>
        
        <div className="mt-6 text-left bg-base-100 p-6 rounded-2xl border border-base-200">
            <p className="text-sm text-muted">Kode Booking Kamu:</p>
            <p className="text-2xl font-bold text-accent tracking-widest bg-accent/10 p-3 rounded-lg text-center my-2">{bookingCode}</p>
            <p className="text-xs text-muted text-center">Simpan kode ini untuk mengecek status pesananmu.</p>
        </div>

        <p className="mt-6 text-sm text-muted">
           Kami telah mengirimkan detail konfirmasi ke <strong>{formData.email}</strong> dan notifikasi ke WhatsApp <strong>{formData.whatsapp}</strong>.
           Silakan periksa folder spam jika tidak menemukannya.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/cek-status" className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-sm font-semibold text-primary-content bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-lg">
                <Search className="w-4 h-4 mr-2"/>
                Lihat Status Booking
            </Link>
             <Link to="/" className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-sm font-semibold text-base-content bg-base-200 rounded-xl hover:bg-base-300 transition-colors">
                 <Home className="w-4 h-4 mr-2"/>
                Kembali ke Beranda
            </Link>
        </div>
    </motion.div>
);


const ProgressBar: React.FC<{currentStep: number, totalSteps: number}> = ({ currentStep, totalSteps }) => (
    <div className="mb-4">
        <div className="flex justify-between mb-1">
            <span className="text-sm font-semibold text-primary">Langkah {currentStep > totalSteps ? totalSteps : currentStep} dari {totalSteps}</span>
        </div>
        <div className="w-full bg-base-200 rounded-full h-2.5">
            <div className="bg-accent h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%`, transition: 'width 0.5s ease-in-out' }}></div>
        </div>
    </div>
);

const NavigationButtons: React.FC<{ step: number, handlePrev: () => void, handleNext: () => void, isLoading: boolean }> = ({ step, handlePrev, handleNext, isLoading }) => {
    if (step >= CONFIRMATION_STEP) return null; // No buttons on confirmation screen

    const isLastFormStep = step === PAYMENT_STEP;

    return (
        <div className={`mt-8 flex ${step === 1 ? 'justify-end' : 'justify-between'}`}>
            {step > 1 && step <= PAYMENT_STEP && (
                 <button type="button" onClick={handlePrev} className="flex items-center px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-base-content bg-base-200 rounded-xl hover:bg-base-300 transition-colors disabled:opacity-50" disabled={isLoading}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    Kembali
                </button>
            )}

            {isLastFormStep ? (
                 <button type="submit" className="flex items-center px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-primary-content bg-primary rounded-xl hover:bg-primary/90 transition-colors flex-grow justify-center ml-2 disabled:opacity-60 shadow-lg" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                            Memproses...
                        </>
                    ) : (
                        <>
                            Kirim & Konfirmasi Booking
                            <Send className="w-4 h-4 ml-2"/>
                        </>
                    )}
                </button>
            ) : (
                 <button type="button" onClick={handleNext} className={`flex items-center px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-primary-content bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-lg ${step === 1 ? 'ml-auto' : ''}`}>
                    Selanjutnya
                    <ArrowRight className="w-4 h-4 ml-2"/>
                </button>
            )}
        </div>
    );
};

// --- Main Component ---
const BookingForm = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        name: '', email: '', whatsapp: '', date: '', time: '', packageId: '', subPackageId: '',
        people: 1, subAddOnIds: [], notes: '', paymentMethod: '', paymentProof: null, referralCode: '', usePoints: false
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string> & { api?: string }>>({});
    const [bookingCode, setBookingCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [clientData, setClientData] = useState<Client | null>(null);
    const [referralStatus, setReferralStatus] = useState<ReferralStatus>({ isValid: null, message: '', loading: false });

    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [packagesData, addOnsData, settingsData] = await Promise.all([
                getPackages(),
                getAddOns(),
                getSystemSettings()
            ]);
            setPackages(packagesData);
            setAddOns(addOnsData);
            setSettings(settingsData);
        };
        loadData();
    }, []);

    const handleEmailBlur = async () => {
        const client = await getClientDetailsForBooking(formData.email);
        setClientData(client);
    };

    const handleValidateReferral = async () => {
        setReferralStatus({ isValid: null, message: '', loading: true });
        const result = await validateReferralCode(formData.referralCode, formData.email);
        setReferralStatus({ isValid: result.valid, message: result.message, loading: false });
        if (!result.valid) {
            setFormData({...formData, referralCode: ''});
        }
    };

    const validateField = (name: keyof FormData, value: any): boolean => {
        let error = '';
        switch (name) {
            case 'name':
                if (!value.trim()) error = 'Nama lengkap wajib diisi.';
                break;
            case 'email':
                if (!value || !/\S+@\S+\.\S+/.test(value)) error = 'Format email tidak valid.';
                break;
            case 'whatsapp':
                if (!value || !/^\+62\d{9,12}$/.test(value)) error = 'Format WhatsApp harus: +628xxxxxxxxxx.';
                break;
            case 'date':
                if (!value) error = 'Tanggal wajib dipilih.';
                break;
            case 'time':
                if (!value) error = 'Jam wajib dipilih.';
                break;
            case 'packageId':
                if (!value) error = 'Paket wajib dipilih.';
                break;
            case 'subPackageId':
                if (!value) error = 'Varian paket wajib dipilih.';
                break;
            case 'people':
                if (value < 1) error = 'Jumlah orang minimal 1.';
                break;
            case 'paymentMethod':
                if (!value) error = 'Metode pembayaran wajib dipilih.';
                break;
            case 'paymentProof':
                if (!value) error = 'Bukti pembayaran wajib diunggah.';
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return !error;
    };

    const validateStep1 = () => {
        const isNameValid = validateField('name', formData.name);
        const isEmailValid = validateField('email', formData.email);
        const isWhatsappValid = validateField('whatsapp', formData.whatsapp);
        return isNameValid && isEmailValid && isWhatsappValid;
    };

    const validateStep2 = () => {
        const isDateValid = validateField('date', formData.date);
        const isTimeValid = validateField('time', formData.time);
        const isPackageValid = validateField('packageId', formData.packageId);
        const isSubPackageValid = validateField('subPackageId', formData.subPackageId);
        const isPeopleValid = validateField('people', formData.people);
        return isDateValid && isTimeValid && isPackageValid && isSubPackageValid && isPeopleValid;
    };
    
    const validateStep5 = () => {
        const isMethodValid = validateField('paymentMethod', formData.paymentMethod);
        const isProofValid = validateField('paymentProof', formData.paymentProof);
        return isMethodValid && isProofValid;
    };
    
    const handleNext = () => {
        let isValid = false;
        if (step === 1) isValid = validateStep1();
        else if (step === 2) isValid = validateStep2();
        else isValid = true; // Steps 3 & 4 have no specific validation before proceeding

        if (isValid) {
            setStep(prev => prev + 1);
        }
    };
    
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isStep1Valid = validateStep1();
        const isStep2Valid = validateStep2();
        const isStep5Valid = validateStep5();

        if (!isStep1Valid || !isStep2Valid || !isStep5Valid) {
            if (!isStep1Valid) setStep(1);
            else if (!isStep2Valid) setStep(2);
            else if (!isStep5Valid) setStep(5);
            return;
        };

        setIsLoading(true);
        setErrors(prev => ({ ...prev, api: undefined }));
        try {
            let paymentProofBase64 = null;
            if (formData.paymentProof) {
                paymentProofBase64 = await fileToBase64(formData.paymentProof);
            }

            const payload = {
                ...formData,
                paymentProof: undefined, // remove file object
                paymentProofBase64: paymentProofBase64
            };

            const response = await fetch('/api/createPublicBooking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMessage = `Gagal membuat booking. Status: ${response.status}`;
                const contentType = response.headers.get("content-type");

                if (contentType && contentType.includes("application/json")) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (jsonError) {
                        console.error("Could not parse JSON error response:", jsonError);
                        errorMessage = "Gagal memproses respons error dari server.";
                    }
                } else {
                    try {
                        const errorText = await response.text();
                        console.error("Server error response (not JSON):", errorText);
                        errorMessage = "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi support jika masalah berlanjut.";
                    } catch (textError) {
                         console.error("Could not read text error response:", textError);
                         errorMessage = "Gagal membaca respons error dari server.";
                    }
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            if(result.bookingCode) {
                setBookingCode(result.bookingCode);
                setStep(CONFIRMATION_STEP);
            } else {
                throw new Error("Kode booking tidak diterima dari server.");
            }
        } catch (error) {
            console.error("Failed to create booking:", error);
            setErrors(prev => ({ ...prev, api: (error as Error).message }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric
        if (value.startsWith('08')) {
            value = '62' + value.substring(1);
        } else if (value.startsWith('8')) {
             value = '62' + value;
        }
        
        if (value && !value.startsWith('62')) {
            value = '62' + value;
        }

        const formattedValue = value ? '+' + value : '';
        setFormData({ ...formData, whatsapp: formattedValue });
        if (errors.whatsapp) validateField('whatsapp', formattedValue);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mt-8 border border-base-200">
            {errors.api && (
                <div className="bg-error/10 text-error text-sm p-4 rounded-lg mb-4 border border-error/20">
                    <strong>Gagal membuat booking:</strong> {errors.api}
                </div>
            )}
            {step < CONFIRMATION_STEP && (
                <>
                    <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS_DISPLAY} />
                    <p className="text-center text-sm text-muted mb-6 h-5">{motivationalMessages[step]}</p>
                </>
            )}
            
            <form onSubmit={handleSubmit} noValidate>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {step === 1 && <Step1Personal formData={formData} setFormData={setFormData} errors={errors} onWhatsappChange={handleWhatsappChange} validateField={validateField} onEmailBlur={handleEmailBlur} />}
                        {step === 2 && <Step2Details formData={formData} setFormData={setFormData} errors={errors} packages={packages} validateField={validateField} />}
                        {step === 3 && <Step3Addons formData={formData} setFormData={setFormData} addOns={addOns} referralStatus={referralStatus} onValidateReferral={handleValidateReferral} setReferralStatus={setReferralStatus}/>}
                        {step === 4 && <Step4Summary formData={formData} packages={packages} addOns={addOns} clientData={clientData} settings={settings} setFormData={setFormData} />}
                        {step === 5 && <Step5Payment formData={formData} setFormData={setFormData} errors={errors} settings={settings} packages={packages}/>}
                        {step === 6 && <ConfirmationStep bookingCode={bookingCode} formData={formData} />}
                    </motion.div>
                </AnimatePresence>
                
                <NavigationButtons step={step} handlePrev={handlePrev} handleNext={handleNext} isLoading={isLoading} />
            </form>
        </div>
    );
};


export default BookingForm;
