import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card } from "../../components/ui";
import { formatEGP } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { useCart, useLayout } from "../../app/providers";
import { SAMPLE_CATEGORIES, SAMPLE_MENU_ITEMS } from "./data";
import type { Category, MenuItem } from "./types";
import type { CategoryRow, MenuItemRow } from "../../types/supabase";

const ALL_CATEGORIES = "all";

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, description: row.description };
}

function mapMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    image: row.image_url ?? undefined,
    isAvailable: row.is_available,
    categoryId: row.category_id ?? "",
  };
}

/**
 * Menu page — 6 categories, live search, category filter via a responsive
 * sidebar (static on desktop ≥768px, slide-over drawer on mobile), and
 * "Add to Order" on every item.
 */
export default function MenuPage() {
  const { currencySymbol } = useLayout();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>(SAMPLE_CATEGORIES);
  const [items, setItems] = useState<MenuItem[]>(SAMPLE_MENU_ITEMS);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeCategory = searchParams.get("cat") ?? ALL_CATEGORIES;
  const query = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(query);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  /* ------------------------- Load from Supabase ------------------------- */
  useEffect(() => {
    if (!supabase) return; // demo mode — bundled sample data
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      const [catRes, itemRes] = await Promise.all([
        supabase!
          .from("categories")
          .select("*")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),
        supabase!
          .from("menu_items")
          .select("*")
          .eq("is_available", true)
          .order("name", { ascending: true }),
      ]);

      if (cancelled) return;

      if (catRes.error || itemRes.error) {
        // Fall back to sample data so the UI keeps working.
        setLoadError("Couldn't load the live menu — showing sample data instead.");
        setCategories(SAMPLE_CATEGORIES);
        setItems(SAMPLE_MENU_ITEMS);
      } else {
        const cats = (catRes.data as CategoryRow[]).map(mapCategory);
        const menuItems = (itemRes.data as MenuItemRow[]).map(mapMenuItem);
        if (cats.length > 0) setCategories(cats);
        if (menuItems.length > 0) setItems(menuItems);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------- Search / category filtering --------------------- */
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) next.set("q", searchInput.trim());
          else next.delete("q");
          return next;
        },
        { replace: true }
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput, setSearchParams]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const inCategory =
        activeCategory === ALL_CATEGORIES || item.categoryId === activeCategory;
      const matchesQuery =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return inCategory && matchesQuery && item.isAvailable;
    });
  }, [items, activeCategory, query]);

  const selectCategory = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === ALL_CATEGORIES) next.delete("cat");
        else next.set("cat", id);
        return next;
      },
      { replace: true }
    );
    setSidebarOpen(false);
  };

  const handleAdd = (item: MenuItem) => {
    addItem({ id: item.id, name: item.name, price: item.price, image: item.image });
    setJustAdded(item.id);
    setTimeout(() => setJustAdded((current) => (current === item.id ? null : current)), 1200);
  };

  /* ------------------------------ Sidebar ------------------------------- */
  const categoryList = (
    <nav aria-label="Menu categories" className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => selectCategory(ALL_CATEGORIES)}
        className={[
          "rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors",
          activeCategory === ALL_CATEGORIES
            ? "bg-primary text-white shadow"
            : "text-gray-700 hover:bg-primary-50 hover:text-primary",
        ].join(" ")}
      >
        🍽️ All Items
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => selectCategory(category.id)}
          className={[
            "rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors",
            activeCategory === category.id
              ? "bg-primary text-white shadow"
              : "text-gray-700 hover:bg-primary-50 hover:text-primary",
          ].join(" ")}
        >
          {category.name}
          {category.description && (
            <span
              className={[
                "block text-xs font-normal",
                activeCategory === category.id ? "text-white/80" : "text-gray-400",
              ].join(" ")}
            >
              {category.description}
            </span>
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      {/* Desktop sidebar (≥768px) */}
      <aside className="sticky top-20 hidden h-fit w-64 shrink-0 rounded-xl border border-primary-100 bg-white p-3 shadow-sm md:block">
        <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          Categories
        </h2>
        {categoryList}
      </aside>

      {/* Mobile drawer (<768px) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Categories
              </h2>
              <button
                type="button"
                aria-label="Close categories"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {categoryList}
          </aside>
        </div>
      )}

      {/* ------------------------------ Main area ------------------------------ */}
      <section className="min-w-0 flex-1">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Mobile filter toggle */}
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10m-7 8h4" />
            </svg>
            Categories
          </Button>

          {/* Search bar */}
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search the menu… (e.g. burger, juice)"
              aria-label="Search the menu"
              className="w-full rounded-md border border-primary-200 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {loadError && (
          <div className="mb-4">
            <Badge variant="warning">{loadError}</Badge>
          </div>
        )}

        <h1 className="mb-1 text-2xl font-extrabold text-primary">Our Menu</h1>
        <p className="mb-6 text-sm text-gray-500">
          {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
          {activeCategory !== ALL_CATEGORIES &&
            ` in ${categories.find((c) => c.id === activeCategory)?.name ?? ""}`}
          {query && ` matching “${query}”`}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} flush className="animate-pulse">
                <div className="h-44 rounded-t-xl bg-primary-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 rounded bg-primary-100" />
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-9 w-full rounded bg-gray-100" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 font-medium text-gray-700">No dishes found</p>
            <p className="text-sm text-gray-500">
              Try a different search term or category.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} flush hoverable className="flex flex-col overflow-hidden">
                <div className="relative">
                  <img
                    src={item.image ?? "/images/placeholder.jpg"}
                    alt={item.name}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/placeholder.jpg";
                    }}
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-primary shadow">
                    {formatEGP(item.price, currencySymbol)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-gray-500">
                    {item.description}
                  </p>
                  <Button
                    fullWidth
                    className="mt-3"
                    variant={justAdded === item.id ? "secondary" : "primary"}
                    onClick={() => handleAdd(item)}
                  >
                    {justAdded === item.id ? "✓ Added to order" : "Add to Order"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
