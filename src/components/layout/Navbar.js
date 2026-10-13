import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayout } from "../../app/providers";
import { useNavigate } from "react-router-dom";
export const Navbar = ({ children }) => {
    const { currencySymbol, isArabic } = useLayout();
    const navigate = useNavigate();
    const baseClasses = "bg-primary text-white border-b border-white/10";
    const rtlClass = isArabic ? "rtl" : "ltr";
    return (_jsx("header", { className: `${baseClasses} ${rtlClass}`, children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between", children: [_jsx("h1", { className: "font-bold text-2xl", children: isArabic ? "M-F-FOOD" : "M-F-Food" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("span", { className: "text-sm", children: [currencySymbol, " EGP"] }), _jsx("button", { onClick: () => navigate("/login"), className: "px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-sm", children: "Login" })] })] }) }));
};
