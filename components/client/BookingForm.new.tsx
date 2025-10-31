import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getPackages, getAddOns, getSystemSettings, getClientDetailsForBooking, validateReferralCode, validatePromoCode } from '../../services/api';
import { Package, AddOn, SubPackage, SubAddOn, SystemSettings, Client, Promo, CartItem } from '../../types';
import { User, Mail, Phone, Calendar, Clock, Users, MessageSquare, CreditCard, UploadCloud, CheckCircle, ArrowRight, ArrowLeft, Send, Home, Search, FileText, Loader2, AlertTriangle, Tag, Award, X, ShoppingCart, ChevronDown } from 'lucide-react';
import { fileToBase64 as fileUtilToBase64 } from '../../utils/fileUtils';
import { useCart } from '../../contexts/CartContext';

// --- Constants ---
const TOTAL_STEPS = 6;
const CONFIRMATION_STEP = 7;

// --- Types ---
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
    promoCode: string;
    usePoints: boolean;
};

type ReferralStatus = {
    isValid: boolean | null;
    message: string;
    loading: boolean;
};

interface InputWithIconProps {
    Icon: React.ElementType;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    error?: string;
    onBlur?: () => void;
    disabled?: boolean;
}

// --- Helper Components ---
const InputWithIcon: React.FC<InputWithIconProps> = ({ 
    Icon, 
    placeholder, 
    value, 
    onChange, 
    type = "text",
    error,
    onBlur,
    disabled = false
}) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <input
            type={type}
            className={`block w-full pl-10 sm:text-sm rounded-md ${
                error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100' : ''}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

// --- Form Validation ---
const validateForm = (data: FormData): Partial<Record<keyof FormData, string>> => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    
    if (!data.name.trim()) errors.name = 'Nama harus diisi';
    if (!data.email.trim()) errors.email = 'Email harus diisi';
    if (!data.whatsapp.trim()) errors.whatsapp = 'Nomor WhatsApp harus diisi';
    if (!data.date) errors.date = 'Tanggal harus dipilih';
    if (!data.time) errors.time = 'Waktu harus dipilih';
    if (!data.packageId) errors.packageId = 'Paket harus dipilih';
    if (!data.paymentMethod) errors.paymentMethod = 'Metode pembayaran harus dipilih';
    
    // Email validation
    if (data.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
        errors.email = 'Format email tidak valid';
    }
    
    // WhatsApp number validation (Indonesian format)
    if (data.whatsapp) {
        const whatsappClean = data.whatsapp.replace(/[-\\s]/g, '');
        if (!/^(\\+62|62|0)8[1-9][0-9]{6,10}$/.test(whatsappClean)) {
            errors.whatsapp = 'Format nomor WhatsApp tidak valid';
        }
    }
    
    return errors;
};

// --- File Handling ---
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

// --- Main Component ---
const BookingForm: React.FC = () => {
    const [step, setStep] = useState(1);
    const { cart, removeFromCart } = useCart();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState<FormData>({
        name: '', 
        email: '', 
        whatsapp: '', 
        date: '', 
        time: '', 
        packageId: '', 
        subPackageId: '',
        people: 1, 
        subAddOnIds: [], 
        notes: '', 
        paymentMethod: '', 
        paymentProof: null, 
        referralCode: '', 
        promoCode: '', 
        usePoints: false
    });
    
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string> & { api?: string }>>({});
    const [bookingCode, setBookingCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientData, setClientData] = useState<Client | null>(null);
    const [referralStatus, setReferralStatus] = useState<ReferralStatus>({ isValid: null, message: '', loading: false });
    const [promoStatus, setPromoStatus] = useState<ReferralStatus>({ isValid: null, message: '', loading: false });
    const [validatedPromo, setValidatedPromo] = useState<Promo | null>(null);

    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    
    const isFromCart = searchParams.get('fromCart') === 'true' && cart.length > 0;

    // --- Effects ---
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [packagesData, addOnsData, settingsData] = await Promise.all([
                    getPackages(),
                    getAddOns(),
                    getSystemSettings()
                ]);
                setPackages(packagesData);
                setAddOns(addOnsData);
                setSettings(settingsData);
                
                // If coming from cart, pre-fill package selection
                if (isFromCart && cart.length > 0) {
                    const cartItem = cart[0];
                    setFormData(prev => ({
                        ...prev,
                        packageId: cartItem.packageId,
                        subPackageId: cartItem.subPackageId,
                        subAddOnIds: cartItem.subAddOnIds || []
                    }));
                }
                
                setErrors({});
            } catch (error) {
                console.error('Failed to load booking data:', error);
                setErrors(prev => ({ ...prev, api: 'Failed to load booking data. Please try again.' }));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // --- Handlers ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            // Validate form
            const validationErrors = validateForm(formData);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setIsSubmitting(false);
                return;
            }

            // Handle file upload
            let paymentProofUrl = '';
            if (formData.paymentProof) {
                const fileData = await fileToBase64(formData.paymentProof);
                const uploadResponse = await fetch('/api/assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload',
                        imageBase64: fileData.base64,
                        folder: 'payment_proofs'
                    })
                });

                if (!uploadResponse.ok) {
                    throw new Error('Gagal mengunggah bukti pembayaran');
                }

                const uploadResult = await uploadResponse.json();
                paymentProofUrl = uploadResult.secure_url;
            }

            // Submit booking
            const bookingResponse = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createPublic',
                    ...formData,
                    paymentProof: undefined,
                    paymentProofUrl
                })
            });

            if (!bookingResponse.ok) {
                const errorData = await bookingResponse.json();
                throw new Error(errorData.message || 'Gagal membuat booking');
            }

            const bookingResult = await bookingResponse.json();
            setBookingCode(bookingResult.bookingCode);

            // Clear cart if booking was from cart
            if (isFromCart) {
                removeFromCart(cart[0].id);
                searchParams.delete('fromCart');
                setSearchParams(searchParams);
            }

            setStep(CONFIRMATION_STEP);
        } catch (error) {
            console.error('Booking submission error:', error);
            setErrors(prev => ({
                ...prev,
                api: error instanceof Error ? error.message : 'Terjadi kesalahan. Silakan coba lagi.'
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        const validationErrors = validateForm(formData);
        if (Object.keys(validationErrors).length === 0) {
            setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
        } else {
            setErrors(validationErrors);
        }
    };

    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

    const handleInputChange = (name: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            const validationErrors = validateForm({ ...formData, [name]: value });
            setErrors(prev => ({ ...prev, [name]: validationErrors[name] }));
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (step === CONFIRMATION_STEP) {
        return (
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Booking Berhasil!</h2>
                <p className="text-gray-600 mb-4">
                    Kode booking Anda: <span className="font-bold text-primary">{bookingCode}</span>
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    Konfirmasi telah dikirim ke email Anda. Silakan cek email untuk instruksi selanjutnya.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Kembali ke Beranda
                </Link>
            </div>
        );
    }

    // Render form steps...
    // (Form step rendering logic would go here)
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form steps would go here */}
            <div className="flex justify-between mt-8">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={handlePrev}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Sebelumnya
                    </button>
                )}
                {step < TOTAL_STEPS ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="ml-auto inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
                    >
                        Selanjutnya
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="ml-auto inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Kirim Booking
                            </>
                        )}
                    </button>
                )}
            </div>
            
            {errors.api && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errors.api}</p>
                </div>
            )}
        </form>
    );
};

export default BookingForm;