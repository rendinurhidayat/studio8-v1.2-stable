

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, User, Phone, Users, Calendar, MessageSquare, UploadCloud, CheckCircle, Loader2, AlertTriangle, Send, Tag } from 'lucide-react';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject('Failed to read file');
        reader.onerror = error => reject(error);
    });
};

const InstitutionalBookingForm = () => {
    const [formData, setFormData] = useState({
        institutionName: '',
        activityType: '',
        picName: '',
        picContact: '',
        numberOfParticipants: '',
        bookingDate: '',
        notes: '',
        promoCode: ''
    });
    const [requestLetterFile, setRequestLetterFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const payload: any = { action: 'createPublicInstitutional', ...formData };
            if (requestLetterFile) {
                payload.requestLetterBase64 = await fileToBase64(requestLetterFile);
            }
            
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if(!response.ok) {
                let errorMessage = 'Gagal mengirim permintaan booking.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    const textError = await response.text();
                    errorMessage = textError || errorMessage;
                }
                throw new Error(errorMessage);
            }

            setIsSubmitted(true);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-8 mt-8 border border-base-200 text-center"
            >
                <CheckCircle className="w-16 h-16 mx-auto text-success" />
                <h2 className="mt-4 text-2xl font-bold text-primary">Permintaan Terkirim!</h2>
                <p className="mt-2 text-muted">
                    Terima kasih! Tim kami akan segera meninjau permintaan Anda dan akan menghubungi <strong>{formData.picContact}</strong> untuk konfirmasi lebih lanjut.
                </p>
            </motion.div>
        );
    }


    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mt-8 border border-base-200">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {error && (
                    <div className="bg-error/10 text-error text-sm p-3 rounded-lg flex items-center gap-2">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputWithIcon Icon={Briefcase} name="institutionName" placeholder="Nama Sekolah / Perusahaan" value={formData.institutionName} onChange={handleChange} required />
                    <InputWithIcon Icon={Briefcase} name="activityType" placeholder="Jenis Kegiatan (cth: Foto Kelas, Acara Kantor)" value={formData.activityType} onChange={handleChange} required />
                    <InputWithIcon Icon={User} name="picName" placeholder="Nama Penanggung Jawab (PIC)" value={formData.picName} onChange={handleChange} required />
                    <InputWithIcon Icon={Phone} type="tel" name="picContact" placeholder="Nomor WhatsApp PIC" value={formData.picContact} onChange={handleChange} required />
                    <InputWithIcon Icon={Users} type="number" name="numberOfParticipants" placeholder="Jumlah Peserta" value={formData.numberOfParticipants} onChange={handleChange} required min="1" />
                    <InputWithIcon Icon={Calendar} type="datetime-local" name="bookingDate" value={formData.bookingDate} onChange={handleChange} required />
                </div>
                 <TextareaWithIcon Icon={MessageSquare} name="notes" placeholder="Ada permintaan atau catatan khusus? Tulis di sini..." value={formData.notes} onChange={handleChange} />
                 <div>
                    <label className="text-sm font-semibold text-base-content block mb-2">Surat Permintaan (Opsional)</label>
                    <label htmlFor="letter-upload" className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                        <UploadCloud size={20} className="text-muted" />
                        <span className="text-sm text-muted flex-grow truncate">{requestLetterFile ? requestLetterFile.name : 'Pilih file...'}</span>
                        <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-md">Browse</span>
                        <input id="letter-upload" type="file" className="hidden" onChange={e => setRequestLetterFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx,image/*" />
                    </label>
                </div>
                <div>
                    <label className="text-sm font-semibold text-base-content block mb-2">Kode Promo / Voucher (Opsional)</label>
                    <InputWithIcon Icon={Tag} name="promoCode" placeholder="Masukkan kode di sini" value={formData.promoCode} onChange={handleChange} />
                </div>
                 <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 px-6 py-3 text-sm font-semibold text-primary-content bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-60">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16}/> Kirim Permintaan</>}
                </button>
            </form>
        </div>
    );
};


const InputWithIcon: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { Icon: React.ElementType }> = ({ Icon, ...props }) => (
    <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="w-5 h-5 text-muted" />
        </span>
        <input {...props} className="w-full pl-10 pr-3 py-3 text-base-content bg-base-100 border-2 border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
    </div>
);

const TextareaWithIcon: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { Icon: React.ElementType }> = ({ Icon, ...props }) => (
    <div className="relative">
         <span className="absolute top-3.5 left-0 flex items-center pl-3">
            <Icon className="w-5 h-5 text-muted" />
        </span>
        <textarea {...props} rows={3} className="w-full pl-10 pr-3 py-3 text-base-content bg-base-100 border-2 border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent transition-colors" ></textarea>
    </div>
);


export default InstitutionalBookingForm;