import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { CartItem } from '../../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose }) => {
    const { cart, removeFromCart, cartCount } = useCart();
    const navigate = useNavigate();

    const handleCheckout = () => {
        onClose();
        navigate('/pesan-sesi?fromCart=true');
    };

    const total = cart.reduce((sum, item) => {
        const addOnsPrice = item.addOns.reduce((addOnSum, addOn) => addOnSum + addOn.price, 0);
        return sum + item.subPkg.price + addOnsPrice;
    }, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    ></motion.div>

                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-md h-full bg-white shadow-xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 id="modal-title" className="text-xl font-bold text-primary flex items-center gap-2">
                                <ShoppingCart />
                                Keranjang Belanja ({cartCount})
                            </h2>
                            <button type="button" onClick={onClose} className="p-1 text-muted rounded-full hover:bg-base-200 hover:text-base-content">
                                <X size={24} />
                            </button>
                        </div>
                        
                        {cart.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <ShoppingCart size={48} className="text-base-300 mb-4" />
                                <h3 className="font-semibold text-primary">Keranjangmu kosong</h3>
                                <p className="text-sm text-muted mt-1">Ayo cari paket foto yang kamu suka!</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {cart.map(item => (
                                    <div key={item.id} className="flex items-start gap-4 p-3 bg-base-100 rounded-lg">
                                        <img src={item.pkg.imageUrls?.[0] || '/images/hero-1.jpg'} alt={item.pkg.name} className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-sm">{item.pkg.name}</p>
                                            <p className="text-xs text-muted">{item.subPkg.name}</p>
                                            {item.addOns.length > 0 && (
                                                <ul className="text-xs text-muted mt-1 list-disc list-inside">
                                                    {item.addOns.map(addon => <li key={addon.id}>{addon.name}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-accent">Rp {(item.subPkg.price + item.addOns.reduce((a,b)=>a+b.price, 0)).toLocaleString('id-ID')}</p>
                                            <button onClick={() => removeFromCart(item.id)} className="mt-2 text-error hover:underline text-xs">Hapus</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {cart.length > 0 && (
                            <div className="p-4 border-t bg-white">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-semibold text-lg text-primary">Total</span>
                                    <span className="font-bold text-xl text-accent">Rp {total.toLocaleString('id-ID')}</span>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors shadow-lg"
                                >
                                    Lanjut ke Pemesanan
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CartModal;