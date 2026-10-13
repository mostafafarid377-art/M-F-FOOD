import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

// Cart context for managing the shopping cart
type CartItem = {
  id: string;
  name: string;
  price: number; // in piastres (integer minor units)
  quantity: number;
  image?: string;
  modifiers: { option_id: string; option_name: string }[];
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

export { CartContext };

// Auth context placeholder - will be integrated with Supabase later
type AuthContextValue = {
  user: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
  const [user, setUser] = useState<any>(null);
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
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login: async () => {}, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

// Layout provider for restaurant settings
type LayoutProviderValue = {
  restaurantName: string;
  currency: string;
  currencySymbol: string;
  isArabic: boolean;
};

const LayoutContext = createContext<LayoutProviderValue | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const restaurantName = "M-F-FOOD";
  const currency = "EGP";
  const currencySymbol = "£";
  const isArabic = false;

  return (
    <LayoutContext.Provider value={{ restaurantName, currency, currencySymbol, isArabic }}>
      {children}
    </LayoutContext.Provider>
  );
}

export { LayoutContext };