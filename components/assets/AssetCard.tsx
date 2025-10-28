
import React from 'react';
import { motion } from 'framer-motion';
import { Asset } from '../../types';
import { Video, File } from 'lucide-react';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

interface AssetCardProps {
    asset: Asset;
    onClick: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick }) => {
    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.05 }}
            onClick={onClick}
            className="group relative aspect-square bg-base-200 rounded-lg overflow-hidden shadow-md cursor-pointer"
        >
            <img 
                src={asset.url} 
                alt={asset.fileName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                <p className="text-xs font-semibold truncate">{asset.fileName}</p>
                <div className="flex items-center gap-1 text-xs text-white/80">
                   {asset.fileType === 'video' ? <Video size={12} /> : <File size={12} />}
                   <span>{asset.category}</span>
                </div>
            </div>
        </motion.div>
    );
};

export default AssetCard;
