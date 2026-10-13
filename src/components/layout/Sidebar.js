import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export const Sidebar = ({ isCollapsed, onToggle, selectedPage, onSelect, }) => {
    const menuItems = [
        { name: "Dashboard", path: "/admin" },
        { name: "Menu", path: "/admin/menu" },
        { name: "Orders", path: "/admin/orders" },
        { name: "Staff", path: "/admin/staff" },
        { name: "Settings", path: "/admin/settings" },
        { name: "Reports", path: "/admin/reports" },
    ];
    return (_jsxs("aside", { className: "fixed left-0 top-0 h-full w-64 bg-primary text-white transition-transform duration-300 ease-in-out transform-x-0 md:block md:w-auto", children: [_jsxs("div", { className: "h-16 flex items-center px-4 border-b text-white", children: [_jsx("h1", { className: "font-bold text-xl", children: selectedPage === "dashboard" ? "M-F-FOOD" : "" }), _jsx("button", { onClick: onToggle, className: "ml-auto p-2 rounded hover:bg-white/10", "aria-label": "Toggle sidebar", children: "\u2261" })] }), _jsx("nav", { className: "mt-4 flex flex-col space-y-2 px-4", children: menuItems.map((item) => (_jsx(Link, { to: item.path, className: "text-white rounded px-3 py-2 transition-colors duration-150 hover:bg-white/5", onClick: () => onSelect(item.path), children: item.name }, item.name))) })] }));
};
