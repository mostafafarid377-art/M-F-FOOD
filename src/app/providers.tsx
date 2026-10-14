import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useLayout } from "./layout/layout-provider";

// Export useLayout for use in other components
export { useLayout };

// Cart context for managing the shopping cart
type CartItem = {
  id: string;
  name: string;
  price: number; // in piastres (integer minor units)
  quantity: number;
  image?: string;
  modifiers?: { option_id: string; option_name: string }[];
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id"> & { id: string }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();

  const addItem = (item: Omit<CartItem, "id"> & { id: string }) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, quantity } : i
    ));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

// Auth context for Supabase authentication
type AuthUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "customer" | "staff" | "admin";
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      // TODO: Initialize Supabase auth session check
      setIsLoading(false);
    };

    initializeSession();
  }, []);

  const login = async (email: string, password: string) => {
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
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoading(false);
      throw new Error(error?.message || "Login failed");
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
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
    } catch (error: any) {
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
    } catch (error) {
      console.error("Refresh error:", error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading auth...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}