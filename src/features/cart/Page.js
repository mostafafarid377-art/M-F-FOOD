import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../app/providers";
export default function CartPage() {
    const navigate = useNavigate();
    const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCart();
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const handleRemove = (itemId) => {
        removeItem(itemId);
    };
    const handleQuantityChange = (itemId, event) => {
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value) && value >= 0) {
            updateQuantity(itemId, value);
        }
    };
    const handleCheckout = () => {
        if (items.length === 0) {
            alert("Your cart is empty");
            return;
        }
        navigate("/checkout");
    };
    if (items.length === 0) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white/10 rounded p-8 text-center max-w-md", children: [_jsx("h2", { className: "text-2xl font-bold text-white mb-4", children: "Your Cart" }), _jsx("p", { className: "text-gray-400 mb-6", children: "Your cart is empty" }), _jsx("p", { className: "text-gray-500 small", children: "Browse the menu to add items" })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen p-4 md:p-8", children: [_jsx("h2", { className: "text-2xl font-bold text-primary mb-6", children: "Your Cart" }), _jsx("div", { className: "overflow-x-auto rounded-lg bg-white/10 shadow-md", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-white border-b border-gray-200/50", children: [_jsx("th", { className: "p-3 text-primary", children: "Item" }), _jsx("th", { className: "p-3 text-primary", children: "Qty" }), _jsx("th", { className: "p-3 text-primary", children: "Price" }), _jsx("th", { className: "p-3 text-primary", children: "Remove" })] }) }), _jsx("tbody", { children: items.map((item) => (_jsxs("tr", { className: "border-b border-gray-200/50", children: [_jsxs("td", { className: "p-3", children: [_jsx("img", { src: item.image || "/placeholder-food.jpg", alt: item.name, className: "h-6 w-6 object-rounded mr-3" }), _jsx("span", { children: item.name }), item.modifiers?.length > 0 && (_jsx("div", { className: "mt-1 text-xs text-gray-500", children: item.modifiers.map((m) => {
                                                    const price = m.price_delta || 0;
                                                    return `${m.option_name} +${price}`;
                                                }).join(", ") }))] }), _jsx("td", { className: "p-3", children: _jsx("input", { type: "number", min: "1", value: item.quantity, onChange: (e) => handleQuantityChange(item.id, e), className: "w-20 rounded border border-gray-300 text-center" }) }), _jsxs("td", { className: "p-3", children: ["EGP ", item.price * item.quantity / 100] }), _jsx("td", { className: "p-3", children: _jsx("button", { onClick: () => handleRemove(item.id), className: "text-red-600 hover:text-red-400", children: "Remove" }) })] }, item.id))) })] }) }), _jsxs("div", { className: "mt-6 p-4 bg-primary/10 rounded border border-primary/20", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Subtotal:" }), _jsxs("span", { children: ["EGP ", subtotal / 100] })] }), items.length > 0 && (_jsxs("div", { className: "mt-2 flex justify-between text-xs text-gray-400", children: [_jsx("span", { children: "Items:" }), _jsx("span", { children: items.length })] }))] }), _jsxs("div", { className: "mt-8 p-4 bg-primary rounded", children: [_jsx("h3", { className: "text-lg font-bold text-primary mb-2", children: "Total" }), _jsxs("p", { className: "text-3xl font-bold", children: ["EGP ", total / 100] })] }), _jsx("div", { className: "mt-6", children: _jsx("button", { onClick: handleCheckout, className: "w-full bg-primary text-white py-3 rounded hover:bg-secondary transition-colors text-lg font-medium", children: "Checkout" }) }), _jsx("button", { onClick: clearCart, className: "mt-4 w-full text-red-600 hover:text-red-400 py-2 rounded text-sm", children: "Clear Cart" })] }));
}
