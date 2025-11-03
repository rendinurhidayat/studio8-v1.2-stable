"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPackages, getAddOns } from '../services/api';
import type { Package, AddOn } from '../types';
import BookingForm from '../components/client/BookingForm';
import InstitutionalBookingForm from '../components/client/InstitutionalBookingForm';
import SponsorshipForm from '../components/client/SponsorshipForm';
import { Camera, Briefcase, Award, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AiRecommenderModal from '../components/client/AiRecommenderModal';

const PackageSidebar: React.FC<{
    packages: Package[];
    selectedPackageId: string | null;
    onSelect: (id: string) => void;
}> = ({ packages, selectedPackageId, onSelect }) => (
    <aside className="w-full md:w-72 flex-shrink-0 bg-white border-r border-base-200">
        <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-primary">Pilih Paket Foto</h2>
        </div>
        <nav className="p-2 space-y-1">
            {packages.map(pkg => (
                <button
                    key={pkg.id}
                    onClick={() => onSelect(pkg.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium flex items-center gap-3 ${
                        selectedPackageId === pkg.id ? 'bg-accent/10 text-accent' : 'text-base-content hover:bg-base-100'
                    }`}
                >
                    {pkg.imageUrls && pkg.imageUrls[0] ? (
                        <img src={pkg.imageUrls[0]} alt={pkg.name} className="w-8 h-8 object-cover rounded-md flex-shrink-0" />
                    ) : (
                        <div className="w-8 h-8 bg-base-200 rounded-md flex-shrink-0" />
                    )}
                    <span className="flex-grow">{pkg.name}</span>
                </button>
            ))}
        </nav>
    </aside>
);

const BookingPage = () => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeForm, setActiveForm] = useState<'package' | 'institutional' | 'sponsorship'>('package');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [packagesData, addOnsData] = await Promise.all([getPackages(), getAddOns()]);
                setPackages(packagesData);
                setAddOns(addOnsData);
                if (packagesData.length > 0 && !selectedPackageId) {
                    setSelectedPackageId(packagesData[0].id);
                }
            } catch (error) {
                console.error("Failed to load booking data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const selectedPackage = packages.find(p => p.id === selectedPackageId);

    const handleRecommendationSelect = (recommendedPackage: Package) => {
        setSelectedPackageId(recommendedPackage.id);
        setIsAiModalOpen(false);
    };

    const renderContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={32}/></div>;
        }

        switch (activeForm) {
            case 'package':
                if (selectedPackage) {
                    return <BookingForm key={selectedPackage.id} pkg={selectedPackage} addOns={addOns} onOpenAiRecommender={() => setIsAiModalOpen(true)} />;
                }
                return <div className="p-8 text-center text-muted">Pilih paket dari daftar di samping untuk memulai, atau <button onClick={() => setIsAiModalOpen(true)} className="text-accent font-semibold hover:underline">dapatkan rekomendasi dari AI</button>.</div>;
            case 'institutional':
                return <InstitutionalBookingForm />;
            case 'sponsorship':
                return <SponsorshipForm />;
            default:
                return null;
        }
    };
    
    return (
        <div className="min-h-screen bg-base-100 flex flex-col">
            <header className="p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
                 <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold text-primary">STUDIO <span className="text-accent">8</span></Link>
                    <div className="flex items-center gap-1 p-1 bg-base-200 rounded-lg">
                        <TabButton active={activeForm === 'package'} onClick={() => setActiveForm('package')} icon={<Camera size={16}/>}>Paket Foto</TabButton>
                        <TabButton active={activeForm === 'institutional'} onClick={() => setActiveForm('institutional')} icon={<Briefcase size={16}/>}>Instansi</TabButton>
                        <TabButton active={activeForm === 'sponsorship'} onClick={() => setActiveForm('sponsorship')} icon={<Award size={16}/>}>Sponsor</TabButton>
                    </div>
                </div>
            </header>
            <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full">
                {activeForm === 'package' && (
                    <PackageSidebar packages={packages} selectedPackageId={selectedPackageId} onSelect={setSelectedPackageId} />
                )}
                <main className="flex-grow p-4 md:p-8 overflow-y-auto">
                    <motion.div
                        key={activeForm + (selectedPackageId || '')}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderContent()}
                    </motion.div>
                </main>
            </div>
             <AiRecommenderModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                packages={packages}
                onRecommendationSelect={handleRecommendationSelect}
            />
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode; }> = ({ active, onClick, children, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${active ? 'bg-white text-primary shadow-sm' : 'text-muted hover:bg-white/50'}`}
    >
        {icon}{children}
    </button>
);


export default BookingPage;
