import React from 'react';
import { motion } from 'framer-motion';
import { HighlightWork } from '../../types';

interface HighlightCardProps {
  work: HighlightWork;
  index: number;
  onClick: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

const HighlightCard: React.FC<HighlightCardProps> = ({ work, index, onClick }) => {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group relative shadow-lg hover:shadow-xl border border-base-200"
    >
      <div className="relative aspect-video">
        <img 
          src={work.thumbnailUrl} 
          alt={work.title} 
          className="w-full h-full object-cover transition-transform duration-300" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <h3 className="text-lg font-bold text-white">{work.title}</h3>
          <p className="text-sm text-white/70">{work.author}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default HighlightCard;