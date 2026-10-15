/**
 * Row types mirroring the PostgreSQL schema in supabase/migrations.
 * Monetary values are integer piastres everywhere.
 */

export type UserRole = "customer" | "staff" | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cash" | "card" | "mobile";

export type TableSessionStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "checked_out";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemRow {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number; // piastres
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  total_price: number; // piastres, computed server-side
  delivery_address: string | null;
  table_number: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  price_at_order: number; // piastres snapshot taken by the server
  created_at: string;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  transaction_id: string | null;
  amount: number; // piastres
  created_at: string;
  updated_at: string;
}

export interface RestaurantSettingsRow {
  id: string;
  currency: string;
  currency_symbol: string;
  delivery_fee: number; // piastres
  minimum_order: number; // piastres
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends OrderRow {
  order_items: (OrderItemRow & { menu_items: { name: string } | null })[];
}

/** Payload accepted by the create_order RPC — ids + quantities only, never prices. */
export interface CreateOrderItemInput {
  menu_item_id: string;
  quantity: number;
}
