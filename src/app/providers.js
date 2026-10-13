import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const CartContext = createContext(undefined);
export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
export function CartProvider({ children }) {
    const [items, setItems] = useState([]);
    const navigate = useNavigate();
    const addItem = (item) => {
        setItems(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };
    const removeItem = (itemId) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    };
    const updateQuantity = (itemId, quantity) => {
        if (quantity <= 0) {
            removeItem(itemId);
            return;
        }
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    };
    const clearCart = () => setItems([]);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return (_jsx(CartContext.Provider, { value: { items, addItem, removeItem, updateQuantity, clearCart, total }, children: children }));
}
export { CartContext };
const AuthContext = createContext(undefined);
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        // TODO: Initialize Supabase auth here
        const checkAuth = async () => {
            // Placeholder - will be replaced with actual Supabase auth
            setIsLoading(false);
        };
        checkAuth();
    }, []);
    if (isLoading) {
        return _jsx("div", { children: "Loading..." });
    }
    return (_jsx(AuthContext.Provider, { value: { user, isLoading, login: async () => { }, logout: () => { } }, children: children }));
}
export { AuthContext };
const LayoutContext = createContext(undefined);
export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within a LayoutProvider");
    }
    return context;
}
export function LayoutProvider({ children }) {
    const restaurantName = "M-F-FOOD";
    const currency = "EGP";
    const currencySymbol = "£";
    const isArabic = false;
    return (_jsx(LayoutContext.Provider, { value: { restaurantName, currency, currencySymbol, isArabic }, children: children }));
}
export { LayoutContext };
