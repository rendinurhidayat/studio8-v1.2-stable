
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, X, ArrowRight } from 'lucide-react';
import { Package } from '../../types';

interface AiRecommendation {
    recommendedPackageName: string;
    reasoning: string;
}

interface AiRecommenderModalProps {
    isOpen: boolean;
    onClose: () => void;
    packages: Package[];
    onRecommendationSelect: (pkg: Package) => void;
}

const AiRecommenderModal: React.FC<AiRecommenderModalProps> = ({ isOpen, onClose, packages, onRecommendationSelect }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AiRecommendation | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setTimeout(() => {
                setQuery('');
                setResult(null);
                setError('');
            }, 300); // delay to allow for exit animation
        }
    }, [isOpen]);

    const handleGetRecommendation = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setResult(null);
        setError('');

        try {
            const packageInfo = packages.map(p => ({
                name: p.name,
                description: p.description,
                subPackages: p.subPackages.map(sp => ({ name: sp.name, price: sp.price }))
            }));

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'recommendPackage',
                    userQuery: query,
                    packages: packageInfo
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Gagal mendapatkan rekomendasi dari AI.');
            }
            const data: AiRecommendation = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectPackage = () => {
        if (!result) return;
        const selected = packages.find(p => p.name === result.recommendedPackageName);
        if (selected) {
            onRecommendationSelect(selected);
        } else {
            setError(`Paket "${result.recommendedPackageName}" yang direkomendasikan AI tidak ditemukan. Coba jelaskan kebutuhanmu lebih spesifik.`);
            setResult(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl"
                    >
                        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-muted rounded-full hover:bg-base-200"><X size={20}/></button>
                         <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Sparkles /> Rekomendasi Paket AI</h2>
                         <p className="text-sm text-muted mt-2">Bingung pilih paket? Jelaskan kebutuhanmu di bawah ini, dan biarkan AI kami membantu!</p>
                         
                         <div className="mt-4 space-y-4">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Contoh: foto wisuda bareng pacar, foto grup 5 orang untuk buku tahunan..."
                                rows={3}
                                className="w-full p-3 bg-base-100 border rounded-lg focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                            <button onClick={handleGetRecommendation} disabled={isLoading || !query.trim()} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                {isLoading ? <Loader2 className="animate-spin"/> : 'Dapatkan Rekomendasi'}
                            </button>
                         </div>
                         
                         {error && <p className="mt-4 text-sm text-center text-error">{error}</p>}

                         {result && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 pt-4 border-t">
                                <h3 className="font-semibold text-primary">Rekomendasi Terbaik Untukmu:</h3>
                                <div className="mt-2 p-4 bg-accent/10 rounded-lg border border-accent/30">
                                    <p className="font-bold text-lg text-accent">{result.recommendedPackageName}</p>
                                    <p className="text-sm mt-1">{result.reasoning}</p>
                                    <button onClick={handleSelectPackage} className="mt-3 text-sm font-semibold text-accent hover:underline flex items-center gap-1">
                                        Pilih Paket Ini <ArrowRight size={16}/>
                                    </button>
                                </div>
                            </motion.div>
                         )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AiRecommenderModal;
