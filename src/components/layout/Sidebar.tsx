import React from "react";
import { Link } from "react-router-dom";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedPage: string;
  onSelect: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle,
  selectedPage,
  onSelect,
}) => {
  const menuItems = [
    { name: "Dashboard", path: "/admin" },
    { name: "Menu", path: "/admin/menu" },
    { name: "Orders", path: "/admin/orders" },
    { name: "Staff", path: "/admin/staff" },
    { name: "Settings", path: "/admin/settings" },
    { name: "Reports", path: "/admin/reports" },
  ];

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 bg-primary text-white transition-transform duration-300 ease-in-out transform-x-0 md:block md:w-auto"
    >
      <div className="h-16 flex items-center px-4 border-b text-white">
        <h1 className="font-bold text-xl">
          {selectedPage === "dashboard" ? "M-F-FOOD" : ""}
        </h1>
        <button
          onClick={onToggle}
          className="ml-auto p-2 rounded hover:bg-white/10"
          aria-label="Toggle sidebar"
        >
          ≡
        </button>
      </div>
      <nav className="mt-4 flex flex-col space-y-2 px-4">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="text-white rounded px-3 py-2 transition-colors duration-150 hover:bg-white/5"
            onClick={() => onSelect(item.path)}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
};