import { jsx as _jsx } from "react/jsx-runtime";
export const Card = ({ children, className, }) => {
    return (_jsx("div", { className: `bg-white dark:bg-gray-800 rounded-lg p-4 ${className || ""}`, children: children }));
};
