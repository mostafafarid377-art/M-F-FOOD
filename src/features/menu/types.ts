export interface ModifierOption {
  id: string;
  option_id: string;
  option_name: string;
  price_delta: number; // in piastres
  required?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in piastres
  image?: string;
  isAvailable: boolean;
  categoryId: string;
  modifiers?: ModifierOption[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  isVisible: boolean;
}

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

export interface SearchFilters {
  query: string;
  categoryId?: string;
  sort?: SortOption;
}