import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../app/providers";
import { useLayout } from "../../app/providers";
import { useAuth } from "../../app/providers";
import { Card } from "../components/ui";
// @ts-ignore
// @ts-ignore
// @ts-ignore
export default function OrdersPage() {
    const { currency, currencySymbol } = useLayout();
    const { user } = useAuth();
    const { items, addItem, removeItem, clearCart, total } = useCart();
    const navigate = useNavigate();
    // Check if user is authenticated
    if (!user) {
        return (_jsxs("div", { className: "min-h-screen bg-primary text-white p-8 text-center", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Login Required" }), _jsx("p", { className: "text-white/80 mb-6", children: "Please log in or register to place an order" }), _jsxs("div", { className: "space-y-3", children: [_jsx("button", { onClick: () => navigate("/login"), className: "bg-white/20 text-white px-6 py-3 rounded hover:bg-white/30 transition-colors", children: "Login" }), _jsx("button", { onClick: () => navigate("/register"), className: "bg-white/20 text-white px-6 py-3 rounded hover:bg-white/30 transition-colors", children: "Register" })] })] }));
    }
    // Check if cart has items
    if (items.length === 0) {
        return (_jsxs("div", { className: "min-h-screen bg-primary text-white p-8 text-center", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Cart Empty" }), _jsx("p", { className: "text-white/80 mb-6", children: "Add items to your cart from the menu" }), _jsx("button", { onClick: () => navigate("/menu"), className: "bg-white/20 text-white px-6 py-3 rounded hover:bg-white/30 transition-colors", children: "Browse Menu" })] }));
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = 200; // 2.00 EGP in piastres
    const taxRate = 0.1; // 10%
    const tax = Math.round(subtotal * taxRate);
    const totalBeforePayment = subtotal + deliveryFee + tax;
    const handleCreateOrder = () => {
        if (!user) {
            alert("User not authenticated");
            return;
        }
        // Build order summary for display
        const orderSummary = {
            customerId: user.id,
            subtotal: subtotal / 100,
            deliveryFee: deliveryFee / 100,
            tax: tax,
            total: totalBeforePayment / 100,
            items: items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price / 100,
            })),
        };
        // Simulate order creation
        alert(`Order created successfully!\nTotal: ${currencySymbol}${totalBeforePayment / 100}\n\nOrder summary:\n${JSON.stringify(orderSummary, null, 2)}`);
        // Clear cart and navigate
        clearCart();
        navigate("/orders/history");
    };
    return (_jsx("div", { className: "min-h-screen bg-primary/10 p-8", children: _jsxs("div", { className: "max-w-3xl mx-auto bg-white/20 rounded-lg p-6 backdrop-blur-sm", children: [_jsxs("h2", { className: "text-2xl font-bold text-primary mb-6", children: [currencySymbol, " Order Summary"] }), _jsxs(Card, { className: "mb-4", children: [_jsx("h3", { className: "text-primary font-medium mb-4", children: "Cart Items" }), items.map((item) => (_jsxs("div", { className: "p-3 border-b border-primary/20 last:border-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-medium", children: item.name }), _jsxs("span", { className: "text-lg font-bold", children: [currencySymbol, item.price / 100, " \u00D7 ", item.quantity] })] }), item.modifiers?.length > 0 && (_jsx("div", { className: "mt-1 text-xs text-primary", children: item.modifiers.map((m) => `${m.option_name}`).join(", ") }))] }, item.id))), items.length === 0 && (_jsx("p", { className: "text-primary/60", children: "No items in cart" }))] }), _jsxs("div", { className: "mt-6 p-4 bg-primary/10 rounded", children: [_jsxs("div", { className: "flex justify-between text-sm mb-2", children: [_jsx("span", { children: "Subtotal:" }), _jsxs("span", { children: [currencySymbol, subtotal / 100] })] }), deliveryFee > 0 && (_jsxs("div", { className: "flex justify-between text-sm mb-2", children: [_jsx("span", { children: "Delivery Fee:" }), _jsxs("span", { children: [currencySymbol, deliveryFee / 100] })] })), _jsxs("div", { className: "flex justify-between text-sm mb-2", children: [_jsxs("span", { children: ["Tax (", Math.round(taxRate * 100), "%):"] }), _jsxs("span", { children: [currencySymbol, tax] })] }), _jsxs("div", { className: "flex justify-between text-lg font-bold mt-3", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { children: [currencySymbol, totalBeforePayment / 100] })] })] }), _jsx("button", { onClick: handleCreateOrder, className: "w-full bg-primary text-white py-3 rounded hover:bg-secondary transition-colors text-lg font-medium mt-6", disabled: items.length === 0, children: items.length === 0 ? "Cart is empty" : "Place Order" })] }) }));
}
