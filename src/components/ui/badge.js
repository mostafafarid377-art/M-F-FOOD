import { jsx as _jsx } from "react/jsx-runtime";
export const Badge = ({ children, variant = "primary", }) => {
    const baseClass = "inline-flex items-center rounded text-xs px-2 py-0.5";
    const variantClass = variant === "primary"
        ? "bg-primary text-white"
        : "bg-gray-200 text-gray-800";
    return (_jsx("span", { className: `${baseClass} ${variantClass}`, children: children }));
};
