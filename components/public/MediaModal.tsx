

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HighlightWork } from '../../types';
import { X, User, Briefcase, Award, Calendar, Instagram } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';

interface MediaModalProps {
  work: HighlightWork | null;
  isOpen: boolean;
  onClose: () => void;
}

const getOptimizedMediaUrl = (url: string, width: number): string => {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url;
    }
    const parts = url.split('/upload/');
    if (parts.length !== 2) {
        return url;
    }
    // This transformation works for both images and videos on Cloudinary
    const transformations = `w_${width},c_limit,q_auto,f_auto`;
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

const MediaViewer: React.FC<{ work: HighlightWork }> = ({ work }) => {
    if (work.type === 'Video') {
      return <video src={getOptimizedMediaUrl(work.mediaUrl, 1200)} controls autoPlay className="w-full h-full object-contain" />;
    }
    return <img src={getOptimizedMediaUrl(work.mediaUrl, 1200)} alt={work.title} className="w-full h-full object-contain" />;
};

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value?: string }> = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="p-2 bg-accent/10 rounded-full text-accent mt-1 flex-shrink-0">{icon}</div>
            <div>
                <p className="text-sm text-muted">{label}</p>
                <p className="font-semibold text-primary">{value}</p>
            </div>
        </div>
    );
};


const MediaModal: React.FC<MediaModalProps> = ({ work, isOpen, onClose }) => {
  if (!isOpen || !work) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl flex flex-col lg:flex-row overflow-hidden border border-base-200"
          >
            <button onClick={onClose} className="absolute top-3 right-3 z-10 p-2 text-muted bg-base-200 rounded-full hover:bg-base-300 transition-colors">
              <X size={24} />
            </button>
            
            <div className="w-full lg:w-2/3 bg-black flex items-center justify-center">
              <MediaViewer work={work} />
            </div>

            <div className="w-full lg:w-1/3 p-6 space-y-4 overflow-y-auto">
              <h2 className="text-2xl font-bold text-primary">{work.title}</h2>
              <p className="text-muted leading-relaxed text-sm">{work.description}</p>
              
              {work.instagramUrl && (
                <a 
                    href={work.instagramUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                    <Instagram size={20} />
                    Lihat di Instagram
                </a>
              )}

              <div className="pt-4 border-t border-base-200 space-y-4">
                  <InfoItem icon={<User size={18} />} label="Kreator" value={work.author} />
                  <InfoItem icon={<Briefcase size={18} />} label="Jurusan" value={work.major} />
                  <InfoItem icon={<Award size={18} />} label="Mentor" value={work.mentor} />
                  <InfoItem icon={<Calendar size={18} />} label="Tanggal" value={format(new Date(work.highlightDate), 'd MMMM yyyy', { locale: id })} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MediaModal;
