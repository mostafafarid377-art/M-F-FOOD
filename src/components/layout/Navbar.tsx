import React from "react";
import { useLayout } from "../../app/providers";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  children: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const { currencySymbol, isArabic } = useLayout();
  const navigate = useNavigate();

  const baseClasses = "bg-primary text-white border-b border-white/10";
  const rtlClass = isArabic ? "rtl" : "ltr";

  return (
    <header className={`${baseClasses} ${rtlClass}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="font-bold text-2xl">
          {isArabic ? "M-F-FOOD" : "M-F-Food"}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            {currencySymbol} EGP
          </span>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-sm"
          >
            Login
          </button>
        </div>
      </div>
    </header>
  );
};