import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, Badge } from "../../components/ui";
import { useLayout } from "../../app/providers";
import { useCart } from "../../app/providers";
import { getMenuItems, type ModifierOption, SAMPLE_MENU_CATEGORIES } from "../../services/menu.service";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  categoryId: string;
  modifiers?: ModifierOption[];
};

export default function MenuPage() {
  const { currency, currencySymbol } = useLayout();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState<{ query: string; categoryId?: string }>({ query: "", categoryId: undefined });
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse search params for category filter
  const urlParams = new URLSearchParams(location.search);
  const categoryIdFromUrl = urlParams.get("c") || undefined;

  useEffect(() => {
    setFilters({ query: "", categoryId: categoryIdFromUrl });
  }, [categoryIdFromUrl]);

  useEffect(() => {
    const { items: fetchedItems, categories: fetchedCategories } = getMenuItems(filters);
    setItems(fetchedItems);
    setCategories(fetchedCategories.map(c => c.id));
    setLoading(false);
  }, [filters]);

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      modifiers: item.modifiers?.map(m => ({
        option_id: m.option_id,
        option_name: m.option_name,
        priceDelta: m.price_delta,
      })) || [],
      quantity: 1,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary">Loading menu...</div>
      </div>
    );
  }

  const filteredItems = items.filter(item => item.isAvailable);

  // Helper to compute sidebar state based on window width
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <main className="min-h-screen">
      {/* Sidebar - visible on desktop, hidden on mobile */}
      <aside
        className={isMobile ? "hidden" : "fixed left-0 top-0 bottom-0 z-10 bg-primary text-white w-64"}
      >
        <div className="h-16 flex items-center px-4 border-b text-white">
          <h1 className="font-bold text-xl">M-F-FOOD</h1>
        </div>
        <nav className="mt-4 flex flex-col space-y-2 px-4">
          <Link to="/" onClick={() => setFilters({ query: "", categoryId: undefined })} className="text-white rounded px-3 py-2 transition-colors hover:bg-white/5">
            All Items
          </Link>
          {categories.map((catId) => {
            const category = SAMPLE_MENU_CATEGORIES.find(c => c.id === catId);
            if (!category) return null;
            return (
              <Link
                key={catId}
                to={`/?c=${catId}`}
                className="text-white rounded px-3 py-2 transition-colors hover:bg-white/5"
              >
                {category.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 p-4 md:p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-primary">
            {currencySymbol} Menu
            <Badge variant="secondary" className="ml-2">
              {filteredItems.length} items
            </Badge>
          </h2>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Search menu items..."
              className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) =>
                setFilters({ query: e.target.value, categoryId: filters.categoryId })
              }
            />
            <select
              onChange={(e) =>
                setFilters({ query: filters.query, categoryId: e.target.value })
              }
              className="rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm background-white/10 hover:bg-white/20"
            >
              <option value="">All Categories</option>
              {categories.map((catId) => {
                const category = SAMPLE_MENU_CATEGORIES.find(c => c.id === catId);
                if (!category) return <option key={catId} value={catId}>{catId}</option>;
                return (
                  <option
                    key={catId}
                    value={catId}
                    selected={filters.categoryId === catId}
                  >
                    {category.name}
                  </option>
                );
              })}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            if (!item.isAvailable) return null;
            return (
              <Card
                key={item.id}
                className="hover:shadow-lg hover:transition-shadow cursor-pointer border border-primary/20"
              >
                <img
                  src={item.image || "/placeholder-food.jpg"}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded-t-md"
                />
                <div className="p-3">
                  <h3 className="font-medium text-primary line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="mt-2 flex justify-between items-baseline">
                    <span className="text-lg font-bold">
                      {currencySymbol}{item.price / 100}
                    </span>
                    <Badge variant="secondary">Available</Badge>
                  </p>
                </div>
                <div className="p-3 border-t border-primary/10">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-full bg-primary text-white py-2 rounded hover:bg-secondary transition-colors text-sm"
                  >
                    Add to Order
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="mt-8 text-center text-gray-600">
            <p>No items found matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}