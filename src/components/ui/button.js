import { jsx as _jsx } from "react/jsx-runtime";
export const Button = ({ children, variant = "primary", onClick, className, }) => {
    const baseClass = variant === "primary"
        ? "bg-primary text-white hover:bg-secondary transition-colors"
        : "bg-white/10 text-white hover:bg-white/20 transition-colors";
    return (_jsx("button", { className: `${baseClass} px-4 py-2 rounded hover:transition-colors ${className || ""}`, onClick: onClick, children: children }));
};
