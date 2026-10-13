import { jsx as _jsx } from "react/jsx-runtime";
export const Card = ({ children, className, variant = "default", }) => {
    const variantClasses = {
        default: "bg-white dark:bg-gray-800 shadow-sm rounded-lg",
        elevated: "bg-white dark:bg-gray-800 shadow-md rounded-lg",
        outline: "border border-gray-200 dark:border-gray-700 rounded-lg",
    };
    return (_jsx("div", { className: variantClasses[variant] + (className || ""), children: children }));
};
