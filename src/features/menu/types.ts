export interface Category {
  id: string;
  name: string;
  description?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // integer piastres (100 piastres = 1 EGP)
  image?: string;
  isAvailable: boolean;
  categoryId: string;
}
