import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { RestaurantSettingsRow, UserRole } from "../types/supabase";

/* ------------------------------------------------------------------------ */
/* Layout / restaurant settings                                              */
/* ------------------------------------------------------------------------ */

type LayoutContextValue = {
  restaurantName: string;
  currency: string;
  currencySymbol: string;
  deliveryFee: number; // piastres
  minimumOrder: number; // piastres
  isArabic: boolean;
};

const defaultLayout: LayoutContextValue = {
  restaurantName: "M-F-FOOD",
  currency: "EGP",
  currencySymbol: "£",
  deliveryFee: 200, // 2.00 EGP
  minimumOrder: 1000, // 10.00 EGP
  isArabic: false,
};

const LayoutContext = createContext<LayoutContextValue>(defaultLayout);

export function useLayout() {
  return useContext(LayoutContext);
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LayoutContextValue>(defaultLayout);

  useEffect(() => {
    // restaurant_settings is publicly readable per RLS — hydrate the UI
    // (currency, symbol, fees) from the database when Supabase is configured.
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("restaurant_settings")
      .select("currency, currency_symbol, delivery_fee, minimum_order")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as Pick<
          RestaurantSettingsRow,
          "currency" | "currency_symbol" | "delivery_fee" | "minimum_order"
        >;
        setSettings((prev) => ({
          ...prev,
          currency: row.currency ?? prev.currency,
          currencySymbol: row.currency_symbol ?? prev.currencySymbol,
          deliveryFee: row.delivery_fee ?? prev.deliveryFee,
          minimumOrder: row.minimum_order ?? prev.minimumOrder,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LayoutContext.Provider value={settings}>{children}</LayoutContext.Provider>
  );
}

/* ------------------------------------------------------------------------ */
/* Cart — persists across interactions via localStorage                      */
/* ------------------------------------------------------------------------ */

export type CartItem = {
  id: string;
  name: string;
  price: number; // piastres — display only; the server recomputes real prices
  quantity: number;
  image?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number; // piastres
  count: number;
};

const CART_STORAGE_KEY = "mf-food-cart";
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (i) =>
            typeof i?.id === "string" &&
            typeof i?.price === "number" &&
            typeof i?.quantity === "number"
        )
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / private mode — cart simply won't persist */
    }
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.id !== itemId);
      return prev.map((i) => (i.id === itemId ? { ...i, quantity } : i));
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, subtotal, count }),
    [items, addItem, removeItem, updateQuantity, clearCart, subtotal, count]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/* ------------------------------------------------------------------------ */
/* Auth — Supabase Auth (email/password) with a demo-mode fallback           */
/* ------------------------------------------------------------------------ */

export type AuthUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
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

/** Fetch the app-level profile (role, name). The role always comes from the
 *  database — never from anything the frontend submits. */
async function fetchAuthUser(userId: string, email: string | null): Promise<AuthUser> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();
  return {
    id: userId,
    email,
    full_name: (data?.full_name as string | null) ?? null,
    role: ((data?.role as UserRole) ?? "customer") as UserRole,
  };
}

/* ----- demo-mode helpers (only when Supabase env vars are missing) ------- */
const DEMO_USER_KEY = "mf-food-demo-user";
const DEMO_USERS_KEY = "mf-food-demo-users";

type DemoRecord = { email: string; password: string; fullName: string };

function demoUsers(): DemoRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) ?? "[]") as DemoRecord[];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDemoMode = !isSupabaseConfigured;

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchAuthUser(session.user.id, session.user.email ?? null);
      setUser(profile);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!supabase) {
      // Demo mode: restore a locally simulated session (no network involved).
      try {
        const raw = localStorage.getItem(DEMO_USER_KEY);
        if (raw) setUser(JSON.parse(raw) as AuthUser);
      } catch {
        /* ignore */
      }
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          const profile = await fetchAuthUser(
            session.user.id,
            session.user.email ?? null
          );
          if (!cancelled) setUser(profile);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Defer to avoid Supabase lock re-entrancy issues.
        setTimeout(async () => {
          const profile = await fetchAuthUser(
            session.user.id,
            session.user.email ?? null
          );
          setUser(profile);
        }, 0);
      } else {
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        // onAuthStateChange will populate the profile.
        return;
      }
      // ---- demo mode ----
      const record = demoUsers().find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (!record || record.password !== password) {
        throw new Error("Invalid email or password");
      }
      const demo: AuthUser = {
        id: `demo-${record.email}`,
        email: record.email,
        full_name: record.fullName,
        role: "customer",
      };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
      setUser(demo);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      setIsLoading(true);
      try {
        if (supabase) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });
          if (error) throw new Error(error.message);
          // The handle_new_user trigger creates the profiles row with the
          // default 'customer' role; onAuthStateChange picks up the session.
          return;
        }
        // ---- demo mode ----
        const users = demoUsers();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          throw new Error("An account with this email already exists");
        }
        users.push({ email, password, fullName });
        localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
        const demo: AuthUser = {
          id: `demo-${email}`,
          email,
          full_name: fullName,
          role: "customer",
        };
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
        setUser(demo);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isDemoMode, login, register, logout, refresh }),
    [user, isLoading, isDemoMode, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
