import { jsx as _jsx } from "react/jsx-runtime";
export const Button = ({ children, variant = "primary", size = "md", disabled, onClick, className, }) => {
    const variantStyles = {
        primary: "inline-flex items-center justify-center rounded bg-primary text-white hover:bg-secondary transition-colors",
        secondary: "inline-flex items-center justify-center rounded bg-white/10 text-white hover:bg-white/20 transition-colors",
        danger: "inline-flex items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 transition-colors",
        link: "text-primary underline underline-offset-4 hover-opacity-80",
    };
    const sizeStyles = {
        sm: "h-8 px-3 text-sm rounded",
        md: "h-10 px-4 text-base rounded",
        lg: "h-12 px-6 text-lg rounded",
    };
    const baseClasses = variantStyles[variant] +
        " " +
        sizeStyles[size] +
        " disabled:opacity-50 disabled:cursor-not-allowed ";
    const classes = `${baseClasses}${className || ""}`;
    return (_jsx("button", { className: classes, disabled: disabled, onClick: onClick, children: children }));
};
