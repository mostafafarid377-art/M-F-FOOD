import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, Badge } from "../../components/ui";
import { useLayout } from "../../app/providers";
import { useCart } from "../../app/providers";
import { getMenuItems, SAMPLE_MENU_CATEGORIES } from "../../services/menu.service";
export default function MenuPage() {
    const { currency, currencySymbol } = useLayout();
    const { addItem } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [filters, setFilters] = useState({ query: "", categoryId: undefined });
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
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
    const handleAddToCart = (item) => {
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
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-primary", children: "Loading menu..." }) }));
    }
    const filteredItems = items.filter(item => item.isAvailable);
    // Helper to compute sidebar state based on window width
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return (_jsxs("main", { className: "min-h-screen", children: [_jsxs("aside", { className: isMobile ? "hidden" : "fixed left-0 top-0 bottom-0 z-10 bg-primary text-white w-64", children: [_jsx("div", { className: "h-16 flex items-center px-4 border-b text-white", children: _jsx("h1", { className: "font-bold text-xl", children: "M-F-FOOD" }) }), _jsxs("nav", { className: "mt-4 flex flex-col space-y-2 px-4", children: [_jsx(Link, { to: "/", onClick: () => setFilters({ query: "", categoryId: undefined }), className: "text-white rounded px-3 py-2 transition-colors hover:bg-white/5", children: "All Items" }), categories.map((catId) => {
                                const category = SAMPLE_MENU_CATEGORIES.find(c => c.id === catId);
                                if (!category)
                                    return null;
                                return (_jsx(Link, { to: `/?c=${catId}`, className: "text-white rounded px-3 py-2 transition-colors hover:bg-white/5", children: category.name }, catId));
                            })] })] }), _jsxs("div", { className: "flex-1 p-4 md:p-8", children: [_jsxs("header", { className: "mb-6", children: [_jsxs("h2", { className: "text-2xl font-bold text-primary", children: [currencySymbol, " Menu", _jsxs(Badge, { variant: "secondary", className: "ml-2", children: [filteredItems.length, " items"] })] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("input", { type: "text", placeholder: "Search menu items...", className: "flex-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary", onChange: (e) => setFilters({ query: e.target.value, categoryId: filters.categoryId }) }), _jsxs("select", { onChange: (e) => setFilters({ query: filters.query, categoryId: e.target.value }), className: "rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm background-white/10 hover:bg-white/20", children: [_jsx("option", { value: "", children: "All Categories" }), categories.map((catId) => {
                                                const category = SAMPLE_MENU_CATEGORIES.find(c => c.id === catId);
                                                if (!category)
                                                    return _jsx("option", { value: catId, children: catId }, catId);
                                                return (_jsx("option", { value: catId, selected: filters.categoryId === catId, children: category.name }, catId));
                                            })] })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: items.map((item) => {
                            if (!item.isAvailable)
                                return null;
                            return (_jsxs(Card, { className: "hover:shadow-lg hover:transition-shadow cursor-pointer border border-primary/20", children: [_jsx("img", { src: item.image || "/placeholder-food.jpg", alt: item.name, className: "w-full h-48 object-cover rounded-t-md" }), _jsxs("div", { className: "p-3", children: [_jsx("h3", { className: "font-medium text-primary line-clamp-2", children: item.name }), _jsx("p", { className: "text-sm text-gray-600 line-clamp-2", children: item.description }), _jsxs("p", { className: "mt-2 flex justify-between items-baseline", children: [_jsxs("span", { className: "text-lg font-bold", children: [currencySymbol, item.price / 100] }), _jsx(Badge, { variant: "secondary", children: "Available" })] })] }), _jsx("div", { className: "p-3 border-t border-primary/10", children: _jsx("button", { onClick: () => handleAddToCart(item), className: "w-full bg-primary text-white py-2 rounded hover:bg-secondary transition-colors text-sm", children: "Add to Order" }) })] }, item.id));
                        }) }), filteredItems.length === 0 && (_jsx("div", { className: "mt-8 text-center text-gray-600", children: _jsx("p", { children: "No items found matching your search." }) }))] })] }));
}
