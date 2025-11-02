
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface AiTipsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageContext: string;
}

const AiTipsModal: React.FC<AiTipsModalProps> = ({ isOpen, onClose, pageContext }) => {
    const { user } = useAuth();
    const [tip, setTip] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchTip = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError('');
        setTip('');

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generateProductivityTip',
                    userRole: user.role,
                    pageContext: pageContext,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error('Gagal mendapatkan tips dari AI.');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while(true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setTip(prev => prev + chunk);
            }

        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan.');
        } finally {
            setIsLoading(false);
        }
    }, [user, pageContext]);

    useEffect(() => {
        if (isOpen) {
            fetchTip();
        }
    }, [isOpen, fetchTip]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="💡 AI Productivity Tip">
            <div className="min-h-[150px] flex flex-col justify-center items-center">
                {isLoading && (
                    <div className="text-center">
                        <Loader2 className="animate-spin text-primary mx-auto" size={32} />
                        <p className="mt-2 text-sm text-muted">AI sedang menyiapkan tips untukmu...</p>
                    </div>
                )}
                {error && <p className="text-error text-sm text-center">{error}</p>}
                {!isLoading && tip && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-base text-center text-base-content italic"
                    >
                        "{tip}"
                    </motion.p>
                )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button
                    onClick={fetchTip}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-base-100 text-base-content rounded-lg hover:bg-base-200 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/>
                    Generate Ulang
                </button>
            </div>
        </Modal>
    );
};

export default AiTipsModal;
