





import React, { useState, useEffect, useMemo } from 'react';
import { Package, AddOn, SystemSettings, Client, Promo, CartItem } from '../../types';
import { validateReferralCode, validatePromoCode, calculateDpAmount as apiCalculateDpAmount } from '../../services/api';
import { User, Mail, Phone, Calendar, Clock, Users, MessageSquare, CreditCard, UploadCloud, CheckCircle, Send, Loader2, AlertTriangle, Tag, Award, X, ShoppingCart, Copy, Check, Download, Sparkles } from 'lucide-react';
import { fileToBase64 as fileUtilToBase64 } from '../../utils/fileUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemSettings } from '../../App';
// FIX: Use named import for date-fns isPast function
import { isPast } from 'date-fns';

// --- Type Definitions ---
type FormData = {
    name: string; email: string; whatsapp: string; date: string; time: string;
    subPackageId: string; people: number; subAddOnIds: string[]; notes: string;
    paymentMethod: 'QRIS' | 'Bank Transfer' | 'Dana' | 'Shopeepay' | '';
    paymentProof: File | null; referralCode: string; promoCode: string; usePoints: boolean;
};
type FormErrors = Partial<Record<keyof FormData, string>>;


// --- Helper Components ---
const FormSection: React.FC<{ title: string, children: React.ReactNode, step: number }> = ({ title, children, step }) => (
    <div className="py-6 border-b border-base-200">
        <h3 className="text-xl font-bold text-primary flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 bg-primary text-primary-content rounded-full font-bold">{step}</span>
            {title}
        </h3>
        <div className="pl-11 mt-4 space-y-4">{children}</div>
    </div>
);

const calculateDpAmount = (totalPrice: number, pkg: Package): number => {
    return apiCalculateDpAmount({ totalPrice, package: pkg });
};

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

// --- Main Form Component ---
const BookingForm: React.FC<{ pkg: Package; addOns: AddOn[]; onOpenAiRecommender: () => void; }> = ({ pkg, addOns, onOpenAiRecommender }) => {
    const [formData, setFormData] = useState<FormData>({
        name: '', email: '', whatsapp: '', date: '', time: '', subPackageId: '', people: 1, subAddOnIds: [], notes: '', paymentMethod: '', paymentProof: null, referralCode: '', promoCode: '', usePoints: false
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [bookingCode, setBookingCode] = useState('');
    const [clientData, setClientData] = useState<Client | null>(null);
    const { settings, loading: settingsLoading } = useSystemSettings();
    const [validatedPromo, setValidatedPromo] = useState<Promo | null>(null);
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus({ [key]: true });
        setTimeout(() => setCopyStatus(prev => ({ ...prev, [key]: false })), 2000);
    };

    // --- Validation Logic ---
    const validateField = (name: keyof FormData, value: any): string => {
        switch (name) {
            case 'name':
                return value.trim() ? '' : 'Nama lengkap wajib diisi.';
            case 'email':
                if (!value.trim()) return 'Alamat email wajib diisi.';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Format email tidak valid.';
                return '';
            case 'whatsapp':
                if (!value.trim()) return 'Nomor WhatsApp wajib diisi.';
                if (!/^(08|\+62|62)\d{8,15}$/.test(value)) return 'Format nomor WhatsApp tidak valid (contoh: 08123456789).';
                return '';
            case 'date':
                if (!value) return 'Tanggal booking wajib dipilih.';
                if (isPast(new Date(value)) && !(new Date(value).toDateString() === new Date().toDateString())) return 'Tanggal tidak boleh di masa lalu.';
                return '';
             case 'time':
                if (!value) return 'Waktu booking wajib dipilih.';
                if (formData.date && isPast(new Date(`${formData.date}T${value}`))) return 'Waktu tidak boleh di masa lalu.';
                return '';
            case 'subPackageId':
                return value ? '' : 'Harap pilih varian paket.';
            case 'people':
                return value > 0 ? '' : 'Jumlah orang minimal 1.';
            case 'paymentMethod':
                return value ? '' : 'Metode pembayaran wajib dipilih.';
            case 'paymentProof':
                return value ? '' : 'Bukti pembayaran DP wajib diunggah.';
            default:
                return '';
        }
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};
        (Object.keys(formData) as Array<keyof FormData>).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                newErrors[key] = error;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof FormData, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormData]) {
             const error = validateField(name as keyof FormData, value);
             setErrors(prev => ({ ...prev, [name]: error }));
        }
    };


    // Price Calculation Logic
    const { subtotal, discountAmount, discountReason, pointsValue, totalPrice, dpAmount } = useMemo(() => {
        const selectedSubPackage = pkg.subPackages.find(sp => sp.id === formData.subPackageId);
        const allSubAddOns = addOns.flatMap(a => a.subAddOns);
        const selectedAddOns = allSubAddOns.filter(sa => formData.subAddOnIds.includes(sa.id));

        const subPackagePrice = selectedSubPackage?.price || 0;
        const addOnsPrice = selectedAddOns.reduce((sum, item) => sum + item.price, 0);
        const extraPersonCharge = (pkg.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
        
        const subtotal = subPackagePrice + addOnsPrice + extraPersonCharge;

        let discountAmount = 0;
        let discountReason = '';
        if (validatedPromo) {
            discountAmount = subtotal * (validatedPromo.discountPercentage / 100);
            discountReason = validatedPromo.description;
        } else if (clientData?.totalBookings === 0 && formData.referralCode) {
            discountAmount = settings?.loyaltySettings.firstBookingReferralDiscount || 0;
            discountReason = 'Diskon Referral';
        } else if (clientData && clientData.totalBookings > 0 && settings) {
            const clientTier = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => b.bookingThreshold - a.bookingThreshold).find(t => clientData.totalBookings >= t.bookingThreshold);
            if (clientTier) {
                discountAmount = subtotal * (clientTier.discountPercentage / 100);
                discountReason = `Diskon Tier ${clientTier.name}`;
            }
        }
        
        let pointsValue = 0;
        if (formData.usePoints && clientData && settings && clientData.loyaltyPoints > 0) {
            pointsValue = Math.min(subtotal - discountAmount, clientData.loyaltyPoints * settings.loyaltySettings.rupiahPerPoint);
        }
        
        const totalPrice = subtotal - discountAmount - pointsValue;
        const dpAmount = calculateDpAmount(totalPrice, pkg);

        return { subtotal, discountAmount, discountReason, pointsValue, totalPrice, dpAmount };
    }, [formData, pkg, addOns, clientData, settings, validatedPromo]);

    const { minTime, maxTime } = useMemo(() => {
        if (!settings || !formData.date) return { minTime: '09:00', maxTime: '17:00' };
        
        const selectedDate = new Date(formData.date);
        const day = selectedDate.getDay(); // 0 for Sunday, 6 for Saturday
        const isWeekend = day === 0 || day === 6;
        
        const hours = isWeekend ? settings.operationalHours.weekend : settings.operationalHours.weekday;
        return { minTime: hours.open, maxTime: hours.close };
    }, [settings, formData.date]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }
        
        setIsSubmitting(true);
        try {
            let paymentProofBase64 = null;
            if (formData.paymentProof) {
                const result = await fileToBase64(formData.paymentProof);
                paymentProofBase64 = result;
            }

            const item: CartItem = {
                id: 'some-id',
                pkg: pkg,
                subPkg: pkg.subPackages.find(sp => sp.id === formData.subPackageId)!,
                addOns: addOns.flatMap(a => a.subAddOns).filter(sa => formData.subAddOnIds.includes(sa.id)),
                packageId: pkg.id,
                subPackageId: formData.subPackageId,
                subAddOnIds: formData.subAddOnIds,
            };

            const payload = {
                action: 'createPublic',
                ...formData,
                packageId: item.pkg.id,
                subPackageId: item.subPkg.id,
                subAddOnIds: item.addOns.map(sa => sa.id),
                paymentProof: undefined,
                paymentProofBase64: paymentProofBase64 ? { base64: paymentProofBase64.base64, fileName: paymentProofBase64.fileName, mimeType: paymentProofBase64.mimeType } : null
            };

            const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            
            if (!response.ok) {
                let errorMessage = 'Gagal membuat booking.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    const textError = await response.text();
                    errorMessage = textError || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            setBookingCode(result.bookingCode);
            setIsSubmitted(true);
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isSubmitted) {
        return (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-8 bg-white rounded-2xl shadow-xl border">
                <CheckCircle className="w-16 h-16 mx-auto text-success" />
                <h2 className="mt-4 text-3xl font-extrabold text-primary">Booking Berhasil!</h2>
                <p className="mt-2 text-muted">Kode Booking Anda: <strong className="text-accent font-mono">{bookingCode}</strong></p>
                <p className="mt-2 text-muted">Konfirmasi telah dikirim ke email & WhatsApp Anda.</p>
            </motion.div>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Form Content */}
                <div className="flex-grow">
                    <div className="mb-4">
                        <h1 className="text-3xl font-bold text-primary">{pkg.name}</h1>
                        <p className="text-muted mt-1">{pkg.description}</p>
                    </div>

                    <div className="my-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 text-center">
                        <h3 className="font-bold text-primary">Bingung Pilih Paket?</h3>
                        <p className="text-sm text-muted mt-1">Biarkan AI kami membantu menemukan paket yang paling cocok untukmu!</p>
                        <button type="button" onClick={onOpenAiRecommender} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90">
                            <Sparkles size={16} />
                            Dapatkan Rekomendasi
                        </button>
                    </div>

                    <FormSection title="Kustomisasi Paket" step={1}>
                        <h4 className="font-semibold">Pilih Varian</h4>
                        <div className="space-y-2">
                             {pkg.subPackages.map(sub => (
                                <div key={sub.id} onClick={() => { setFormData({...formData, subPackageId: sub.id}); if(errors.subPackageId) setErrors(p => ({...p, subPackageId: ''})) }} className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${formData.subPackageId === sub.id ? 'border-accent bg-accent/10' : errors.subPackageId ? 'border-error' : 'border-base-200 hover:border-base-300'}`}>
                                    <div className="flex justify-between items-center font-semibold">{sub.name}<span>Rp {sub.price.toLocaleString('id-ID')}</span></div>
                                    {sub.description && <p className="text-xs text-muted mt-1">{sub.description}</p>}
                                </div>
                            ))}
                        </div>
                        {errors.subPackageId && <p className="text-xs text-error mt-1">{errors.subPackageId}</p>}

                        <h4 className="font-semibold pt-4">Layanan Tambahan</h4>
                         <div className="space-y-2">
                            {addOns.flatMap(a => a.subAddOns).map(sub => (
                                <label key={sub.id} className="flex items-center gap-3 p-3 bg-base-100 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={formData.subAddOnIds.includes(sub.id)} onChange={() => {
                                        const newIds = formData.subAddOnIds.includes(sub.id) ? formData.subAddOnIds.filter(id => id !== sub.id) : [...formData.subAddOnIds, sub.id];
                                        setFormData({...formData, subAddOnIds: newIds});
                                    }} className="h-4 w-4 rounded text-primary focus:ring-primary/50"/>
                                    <span className="flex-grow text-sm">{sub.name}</span>
                                    <span className="text-sm font-semibold">+ Rp {sub.price.toLocaleString('id-ID')}</span>
                                </label>
                            ))}
                        </div>
                    </FormSection>

                     <FormSection title="Jadwal & Data Diri" step={2}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <input type="date" name="date" value={formData.date} onChange={handleChange} onBlur={handleBlur} className={`w-full p-3 border rounded-lg bg-base-100 ${errors.date ? 'border-error' : 'border-base-200'}`} required />
                                {errors.date && <p className="text-xs text-error mt-1">{errors.date}</p>}
                            </div>
                             <div>
                                <input type="time" name="time" value={formData.time} onChange={handleChange} onBlur={handleBlur} className={`w-full p-3 border rounded-lg bg-base-100 ${errors.time ? 'border-error' : 'border-base-200'}`} required min={minTime} max={maxTime} />
                                 {errors.time && <p className="text-xs text-error mt-1">{errors.time}</p>}
                            </div>
                        </div>
                        <div>
                            <input type="number" name="people" placeholder="Jumlah Orang" value={formData.people} onChange={handleChange} onBlur={handleBlur} min="1" className={`w-full p-3 border rounded-lg bg-base-100 ${errors.people ? 'border-error' : 'border-base-200'}`} required />
                            {errors.people && <p className="text-xs text-error mt-1">{errors.people}</p>}
                        </div>
                        <div>
                            <input type="text" name="name" placeholder="Nama Lengkap" value={formData.name} onChange={handleChange} onBlur={handleBlur} className={`w-full p-3 border rounded-lg bg-base-100 ${errors.name ? 'border-error' : 'border-base-200'}`} required />
                             {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
                        </div>
                         <div>
                            <input type="email" name="email" placeholder="Alamat Email" value={formData.email} onChange={handleChange} onBlur={handleBlur} className={`w-full p-3 border rounded-lg bg-base-100 ${errors.email ? 'border-error' : 'border-base-200'}`} required />
                             {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <input type="tel" name="whatsapp" placeholder="Nomor WhatsApp (+62)" value={formData.whatsapp} onChange={handleChange} onBlur={handleBlur} className={`w-full p-3 border rounded-lg bg-base-100 ${errors.whatsapp ? 'border-error' : 'border-base-200'}`} required />
                            {errors.whatsapp && <p className="text-xs text-error mt-1">{errors.whatsapp}</p>}
                        </div>
                    </FormSection>
                    
                     <FormSection title="Pembayaran" step={3}>
                        <div>
                            <select name="paymentMethod" value={formData.paymentMethod} onChange={e => {setFormData({...formData, paymentMethod: e.target.value as any}); if(errors.paymentMethod) setErrors(p => ({...p, paymentMethod: ''}))}} className={`w-full p-3 border rounded-lg bg-base-100 ${errors.paymentMethod ? 'border-error' : 'border-base-200'}`} required>
                                <option value="" disabled>Pilih Metode Pembayaran</option>
                                {settings?.paymentMethods.qris && <option value="QRIS">QRIS</option>}
                                {settings?.paymentMethods.bankTransfer && <option value="Bank Transfer">Bank Transfer</option>}
                                {settings?.paymentMethods.dana && <option value="Dana">Dana</option>}
                                {settings?.paymentMethods.shopeepay && <option value="Shopeepay">Shopeepay</option>}
                            </select>
                            {errors.paymentMethod && <p className="text-xs text-error mt-1">{errors.paymentMethod}</p>}
                        </div>

                        <AnimatePresence>
                           {formData.paymentMethod && (
                               <motion.div
                                   initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                   animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                   exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                   className="overflow-hidden"
                               >
                                   {formData.paymentMethod === 'QRIS' && settings?.paymentMethods.qrisImage && (
                                       <div className="p-4 bg-base-200 rounded-lg text-center">
                                           <h4 className="font-semibold mb-2">Pindai QRIS di bawah ini</h4>
                                           <img src={settings.paymentMethods.qrisImage} alt="QRIS Code Studio 8" className="mx-auto w-48 h-48 object-contain rounded-md" />
                                           <a href={settings.paymentMethods.qrisImage} download="QRIS_Studio8.jpg" className="inline-flex items-center gap-2 mt-2 text-sm text-accent font-semibold hover:underline">
                                               <Download size={16} /> Unduh QRIS
                                           </a>
                                       </div>
                                   )}
                                   {formData.paymentMethod === 'Bank Transfer' && settings?.paymentMethods.bankAccounts && (
                                        <div className="p-4 bg-base-200 rounded-lg space-y-3">
                                            <h4 className="font-semibold">Transfer ke salah satu rekening berikut:</h4>
                                            {settings.paymentMethods.bankAccounts.map((acc, index) => (
                                                <div key={index} className="p-3 bg-white rounded-md border">
                                                    <p className="font-bold text-lg">{acc.bankName}</p>
                                                    <p className="text-sm text-muted">{acc.accountHolder}</p>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <p className="font-mono text-primary font-semibold">{acc.accountNumber}</p>
                                                        <button type="button" onClick={() => handleCopy(acc.accountNumber, `acc-${index}`)} className="p-2 text-muted hover:text-primary rounded-md transition-colors text-sm flex items-center gap-1">
                                                           {copyStatus[`acc-${index}`] ? <><Check size={16} className="text-success"/> Disalin</> : <><Copy size={16} /> Salin</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                   )}
                                    {formData.paymentMethod === 'Dana' && settings?.paymentMethods.danaNumber && (
                                       <div className="p-4 bg-base-200 rounded-lg">
                                           <h4 className="font-semibold">Transfer ke DANA:</h4>
                                           <div className="flex items-center justify-between mt-2 p-3 bg-white rounded-md border">
                                               <p className="font-mono text-primary font-semibold">{settings.paymentMethods.danaNumber}</p>
                                               <button type="button" onClick={() => handleCopy(settings.paymentMethods.danaNumber!, 'dana')} className="p-2 text-muted hover:text-primary rounded-md transition-colors text-sm flex items-center gap-1">
                                                   {copyStatus['dana'] ? <><Check size={16} className="text-success"/> Disalin</> : <><Copy size={16} /> Salin</>}
                                               </button>
                                           </div>
                                            <p className="text-xs text-muted mt-1">a/n CV. DELAPAN KREATIF MEDIA</p>
                                       </div>
                                   )}
                                   {formData.paymentMethod === 'Shopeepay' && settings?.paymentMethods.shopeepayNumber && (
                                       <div className="p-4 bg-base-200 rounded-lg">
                                           <h4 className="font-semibold">Transfer ke ShopeePay:</h4>
                                           <div className="flex items-center justify-between mt-2 p-3 bg-white rounded-md border">
                                               <p className="font-mono text-primary font-semibold">{settings.paymentMethods.shopeepayNumber}</p>
                                                <button type="button" onClick={() => handleCopy(settings.paymentMethods.shopeepayNumber!, 'shopeepay')} className="p-2 text-muted hover:text-primary rounded-md transition-colors text-sm flex items-center gap-1">
                                                   {copyStatus['shopeepay'] ? <><Check size={16} className="text-success"/> Disalin</> : <><Copy size={16} /> Salin</>}
                                               </button>
                                           </div>
                                           <p className="text-xs text-muted mt-1">a/n CV. DELAPAN KREATIF MEDIA</p>
                                       </div>
                                   )}
                               </motion.div>
                           )}
                        </AnimatePresence>

                         <div>
                            <label htmlFor="payment-proof" className={`flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-base-100 ${errors.paymentProof ? 'border-error' : 'border-base-200'}`}>
                                <UploadCloud size={20} className="text-muted" />
                                <span className="text-sm text-muted flex-grow truncate">{formData.paymentProof ? formData.paymentProof.name : 'Upload Bukti Pembayaran (Wajib)'}</span>
                                <input id="payment-proof" type="file" className="hidden" onChange={e => {setFormData({...formData, paymentProof: e.target.files ? e.target.files[0] : null}); if(errors.paymentProof) setErrors(p => ({...p, paymentProof: ''}))}} required />
                             </label>
                             {errors.paymentProof && <p className="text-xs text-error mt-1">{errors.paymentProof}</p>}
                        </div>
                    </FormSection>
                </div>

                {/* Sticky Order Summary */}
                <div className="w-full lg:w-96 flex-shrink-0">
                    <div className="sticky top-24 space-y-4">
                         <div className="bg-white p-6 rounded-2xl shadow-xl border">
                            <h3 className="text-lg font-bold border-b pb-2 mb-3 text-primary">Ringkasan Pesanan</h3>
                            {formData.subPackageId ? (
                                <>
                                    <div className="text-sm space-y-2">
                                        <p className="flex justify-between font-semibold"><span>{pkg.subPackages.find(sp => sp.id === formData.subPackageId)?.name}</span> <span>Rp {pkg.subPackages.find(sp => sp.id === formData.subPackageId)?.price.toLocaleString('id-ID')}</span></p>
                                        {formData.subAddOnIds.map(id => {
                                            const addon = addOns.flatMap(a => a.subAddOns).find(sa => sa.id === id);
                                            return <p key={id} className="flex justify-between text-muted"><span>+ {addon?.name}</span> <span>Rp {addon?.price.toLocaleString('id-ID')}</span></p>
                                        })}
                                    </div>
                                    <hr className="my-3"/>
                                    <p className="flex justify-between font-semibold"><span>Subtotal</span> <span>Rp {subtotal.toLocaleString('id-ID')}</span></p>
                                    {discountAmount > 0 && <p className="flex justify-between text-success"><span>Diskon</span> <span>- Rp {discountAmount.toLocaleString('id-ID')}</span></p>}
                                    {pointsValue > 0 && <p className="flex justify-between text-success"><span>Poin</span> <span>- Rp {pointsValue.toLocaleString('id-ID')}</span></p>}
                                    <hr className="my-3"/>
                                     <p className="flex justify-between text-xl font-bold"><span>Total</span> <span>Rp {totalPrice.toLocaleString('id-ID')}</span></p>
                                     <p className="flex justify-between text-lg font-bold text-accent mt-2"><span>DP Dibayar</span> <span>Rp {dpAmount.toLocaleString('id-ID')}</span></p>
                                </>
                            ) : (
                                <p className="text-sm text-muted text-center py-4">Pilih varian paket untuk melihat rincian harga.</p>
                            )}
                         </div>
                         <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 px-6 py-3 font-semibold text-white bg-primary rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-60">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16}/> Kirim & Konfirmasi Booking</>}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default BookingForm;
