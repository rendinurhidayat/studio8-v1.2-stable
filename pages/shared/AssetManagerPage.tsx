
import React, { useState, useEffect } from 'react';
import { getAssets } from '../../services/api';
import { Asset } from '../../types';
import { motion } from 'framer-motion';
import { Loader2, PlusCircle, Image as ImageIcon } from 'lucide-react';
import AssetCard from '../../components/assets/AssetCard';
import UploadModal from '../../components/assets/UploadModal';
import AssetDetailModal from '../../components/assets/AssetDetailModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const AssetManagerPage = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const assetsData = await getAssets();
        setAssets(assetsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUploadComplete = () => {
        setIsUploadModalOpen(false);
        fetchData(); // Refresh the list
    };
    
    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
    };

    const handleCloseDetailModal = () => {
        setSelectedAsset(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Aset</h1>
                <button 
                    onClick={() => setIsUploadModalOpen(true)} 
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusCircle size={18} />
                    Upload Aset Baru
                </button>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-primary" size={48} />
                </div>
            ) : assets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
                    <ImageIcon className="mx-auto text-base-300" size={64} />
                    <h3 className="mt-4 text-xl font-semibold text-primary">Belum Ada Aset</h3>
                    <p className="mt-1 text-muted">Mulai dengan mengunggah aset pertama Anda.</p>
                </div>
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                >
                    {assets.map(asset => (
                        <AssetCard key={asset.id} asset={asset} onClick={() => handleAssetClick(asset)} />
                    ))}
                </motion.div>
            )}

            <UploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)}
                onUploadComplete={handleUploadComplete}
            />
            
            <AssetDetailModal
                isOpen={!!selectedAsset}
                onClose={handleCloseDetailModal}
                asset={selectedAsset}
            />
        </div>
    );
};

export default AssetManagerPage;
