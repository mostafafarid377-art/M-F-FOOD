import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "../components/ui";
// @ts-ignore
import { useLayout } from "../../app/providers";
import { useCart } from "../../app/providers";
export default function MenuPage() {
    const { currency, currencySymbol } = useLayout();
    const { addItem } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Sample data - in production, this would come from Supabase
        const sampleItems = [
            {
                id: "1",
                name: "Classic Burger",
                description: "Juicy beef patty with lettuce, tomato, and special sauce",
                price: 1250,
                image: "/placeholder-food.jpg",
                isAvailable: true,
                categoryId: "burgers",
            },
            {
                id: "2",
                name: "Margherita Pizza",
                description: "Fresh mozzarella, tomato sauce, and basil",
                price: 1800,
                image: "/placeholder-food.jpg",
                isAvailable: true,
                categoryId: "pizzas",
            },
        ];
        setItems(sampleItems);
        setLoading(false);
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-primary", children: "Loading menu..." }) }));
    }
    return (_jsx("main", { className: "min-h-screen", children: _jsxs("div", { className: "flex-1 p-4 md:p-8", children: [_jsxs("h2", { className: "text-2xl font-bold text-primary", children: [currencySymbol, " Menu"] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: items.map((item) => {
                        if (!item.isAvailable)
                            return null;
                        return (_jsxs(Card, { className: "hover:shadow-lg cursor-pointer border border-primary/20", children: [_jsx("img", { src: item.image || "/placeholder-food.jpg", alt: item.name, className: "w-full h-48 object-cover rounded-t-md" }), _jsxs("div", { className: "p-3", children: [_jsx("h3", { className: "font-medium text-primary", children: item.name }), _jsx("p", { className: "text-sm text-gray-600", children: item.description }), _jsx("p", { className: "mt-2", children: _jsxs("span", { className: "text-lg font-bold", children: [currencySymbol, item.price / 100] }) }), _jsx("button", { onClick: () => addItem({
                                                id: item.id,
                                                name: item.name,
                                                price: item.price,
                                                quantity: 1,
                                            }), className: "w-full bg-primary text-white py-2 rounded hover:bg-secondary transition-colors text-sm mt-2", children: "Add to Order" })] })] }, item.id));
                    }) })] }) }));
}
