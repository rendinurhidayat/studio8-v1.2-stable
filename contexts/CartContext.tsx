import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { CartItem } from '../types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// A unique key to store the anonymous user's session ID in localStorage.
const ANONYMOUS_ID_KEY = 'studio8-anonymous-session-id';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Get or create a unique ID for the anonymous user session.
    // useMemo ensures this only runs once per component lifecycle.
    const anonymousUserId = useMemo(() => {
        try {
            let userId = localStorage.getItem(ANONYMOUS_ID_KEY);
            if (!userId) {
                userId = crypto.randomUUID();
                localStorage.setItem(ANONYMOUS_ID_KEY, userId);
            }
            return userId;
        } catch (error) {
            console.error("Failed to access localStorage for session ID, generating temporary ID:", error);
            // Fallback for environments where localStorage is not available (e.g., private browsing)
            return crypto.randomUUID();
        }
    }, []);

    // 2. Create a dynamic key for the cart based on the session ID.
    const CART_STORAGE_KEY = `studio8-cart-${anonymousUserId}`;

    // 3. Initialize state from localStorage using the dynamic key.
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const storedCart = localStorage.getItem(CART_STORAGE_KEY);
            return storedCart ? JSON.parse(storedCart) : [];
        } catch (error) {
            console.error("Failed to parse cart from localStorage", error);
            localStorage.removeItem(CART_STORAGE_KEY); // Clear corrupted data
            return [];
        }
    });

    // 4. Save to localStorage using the dynamic key whenever the cart changes.
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch (error) {
            console.error("Failed to save cart to localStorage:", error);
        }
    }, [cart, CART_STORAGE_KEY]);

    const addToCart = (item: CartItem) => {
        setCart(prevCart => [...prevCart, item]);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartCount = cart.length;

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
