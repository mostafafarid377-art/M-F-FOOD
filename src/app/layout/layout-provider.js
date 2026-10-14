import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
const LayoutContext = createContext(undefined);
export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within a LayoutProvider");
    }
    return context;
}
export function LayoutProvider({ children }) {
    const restaurantName = "M-F-FOOD";
    const currency = "EGP";
    const currencySymbol = "£";
    const isArabic = false;
    return (_jsx(LayoutContext.Provider, { value: { restaurantName, currency, currencySymbol, isArabic }, children: children }));
}
