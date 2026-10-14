import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLayout } from "./layout/layout-provider";
// Export useLayout for use in other components
export { useLayout };
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
        const initializeSession = async () => {
            // TODO: Initialize Supabase auth session check
            setIsLoading(false);
        };
        initializeSession();
    }, []);
    const login = async (email, password) => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual Supabase Auth signin
            setUser({
                id: "anon",
                email,
                full_name: email.split("@")[0],
                role: "customer",
            });
            setIsLoading(false);
        }
        catch (error) {
            console.error("Login error:", error);
            setIsLoading(false);
            throw new Error(error?.message || "Login failed");
        }
    };
    const register = async (email, password, fullName) => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual Supabase Auth signup
            setUser({
                id: "new-user",
                email,
                full_name: fullName,
                role: "customer",
            });
            setIsLoading(false);
        }
        catch (error) {
            console.error("Registration error:", error);
            setIsLoading(false);
            throw new Error(error?.message || "Registration failed");
        }
    };
    const logout = () => {
        setUser(null);
        // TODO: Replace with actual Supabase Auth signout
        setIsLoading(false);
    };
    const refresh = async () => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual Supabase Auth session refresh
            setIsLoading(false);
        }
        catch (error) {
            console.error("Refresh error:", error);
            setIsLoading(false);
        }
    };
    if (isLoading) {
        return _jsx("div", { children: "Loading auth..." });
    }
    return (_jsx(AuthContext.Provider, { value: { user, isLoading, login, register, logout, refresh }, children: children }));
}
