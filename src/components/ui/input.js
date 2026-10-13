import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Input = ({ type = "text", placeholder, value, onChange, label, error, disabled, className, }) => {
    const baseClasses = "w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";
    const errorClasses = "text-sm text-red-600 dark:text-red-400";
    return (_jsxs("div", { className: "space-y-1", children: [label && (_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-200", children: label })), _jsx("input", { type: type, placeholder: placeholder, value: value, onChange: onChange, disabled: disabled, className: baseClasses + (className || "") }), error && (_jsx("p", { className: errorClasses, children: error }))] }));
};
