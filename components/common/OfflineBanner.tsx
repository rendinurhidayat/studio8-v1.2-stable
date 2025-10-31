import React from 'react';
import { WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

const OfflineBanner = () => {
    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-error text-white p-3 text-center text-sm z-50 flex items-center justify-center gap-2"
        >
            <WifiOff size={16} />
            Anda sedang offline. Beberapa fitur mungkin tidak tersedia.
        </motion.div>
    );
};

export default OfflineBanner;