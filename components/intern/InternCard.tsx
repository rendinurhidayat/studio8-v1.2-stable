import React from 'react';
import { motion } from 'framer-motion';

interface InternCardProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    actionButton?: React.ReactNode;
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const InternCard: React.FC<InternCardProps> = ({ title, icon, children, className, actionButton }) => {
    return (
        <motion.div 
            variants={cardVariants}
            className={`bg-white border border-base-200/50 rounded-2xl p-6 shadow-lg flex flex-col ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {icon && (
                         <div className="p-2 bg-accent/10 rounded-lg text-accent">
                            {icon}
                        </div>
                    )}
                    <h3 className="font-bold text-lg text-primary">{title}</h3>
                </div>
                {actionButton}
            </div>
            <div className="flex-grow">
                {children}
            </div>
        </motion.div>
    );
};

export default InternCard;
