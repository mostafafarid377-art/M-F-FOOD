import type { MenuItem, MenuCategory, ModifierOption, SearchFilters } from "../features/menu/types";
import { SAMPLE_MENU_ITEMS as SampleItems, SAMPLE_MENU_CATEGORIES as SampleCategories } from "./sample-data";

// Export ModifierOption for use in other modules
export type { ModifierOption };

// Sample menu data - will be replaced with Supabase data in later phases
export const SAMPLE_MENU_ITEMS: MenuItem[] = SampleItems;
export const SAMPLE_MENU_CATEGORIES: MenuCategory[] = SampleCategories;

export const getMenuItems = (filters?: SearchFilters): { items: MenuItem[]; categories: MenuCategory[] } => {
  let items = [...SAMPLE_MENU_ITEMS];
  let categories = [...SAMPLE_MENU_CATEGORIES];

  // Filter by category
  if (filters?.categoryId) {
    items = items.filter(item => item.categoryId === filters.categoryId && item.isAvailable);
    categories = categories.filter(c => c.id !== filters.categoryId || items.some(i => i.categoryId === filters.categoryId));
  } else {
    items = items.filter(item => item.isAvailable);
  }

  // Filter by search query
  if (filters?.query) {
    const query = filters.query.toLowerCase();
    items = items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  }

  // Sort items
  if (filters?.sort) {
    switch (filters.sort) {
      case "name-asc":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        items.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        items.sort((a, b) => b.price - a.price);
        break;
    }
  }

  return { items, categories };
};

export const getMenuItemById = (id: string): MenuItem | undefined => {
  return SAMPLE_MENU_ITEMS.find(item => item.id === id);
};

export const getCategoryById = (id: string): MenuCategory | undefined => {
  return SAMPLE_MENU_CATEGORIES.find(cat => cat.id === id);
};