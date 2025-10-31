

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Menu, ShoppingCart, Shield } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';
import { useCart } from '../../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserRole } from '../../types';

const ProfileDropdown: React.FC = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDashboardLink = () => {
        if (!user) return '/';
        switch (user.role) {
            case UserRole.Admin: return '/admin/dashboard';
            case UserRole.Staff: return '/staff/dashboard';
            case UserRole.AnakMagang:
            case UserRole.AnakPKL:
                 return '/intern/dashboard';
            default: return '/';
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
                {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="font-bold text-primary">{user?.name?.charAt(0)}</span>
                )}
            </motion.button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-base-200 z-50 overflow-hidden"
                    >
                        <div className="p-4 border-b">
                            <p className="font-semibold text-base-content truncate">{user?.name}</p>
                            <p className="text-sm text-muted">{user?.role}</p>
                        </div>
                        <div className="p-2">
                            <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg text-base-content hover:bg-base-100">
                                <Shield size={16} /> Dashboard
                            </Link>
                             <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg text-error hover:bg-error/10">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const { cartCount } = useCart();
  
  const openCart = () => {
      window.dispatchEvent(new CustomEvent('open-cart'));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-sm border-b border-base-200">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    title="Toggle menu"
                    className="p-2 text-muted rounded-full hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
                >
                    <Menu size={20} />
                </button>
                <Link to="/" className="text-xl sm:text-2xl font-bold text-primary">
                    STUDIO <span className="text-accent">8</span>
                </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell />
                <button
                    onClick={openCart}
                    title="Keranjang"
                    className="relative p-2 text-muted rounded-full hover:bg-base-200 hover:text-base-content focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
                >
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-4 w-4">
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-accent text-white text-xs items-center justify-center">{cartCount}</span>
                        </span>
                    )}
                </button>
                <div className="w-px h-6 bg-base-200 mx-1"></div>
                <ProfileDropdown />
            </div>
        </div>
    </header>
  );
};

export default Header;