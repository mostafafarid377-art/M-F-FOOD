import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";

type LayoutProviderValue = {
  restaurantName: string;
  currency: string;
  currencySymbol: string;
  isArabic: boolean;
};

const LayoutContext = createContext<LayoutProviderValue | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const restaurantName = "M-F-FOOD";
  const currency = "EGP";
  const currencySymbol = "£";
  const isArabic = false;

  return (
    <LayoutContext.Provider value={{ restaurantName, currency, currencySymbol, isArabic }}>
      {children}
    </LayoutContext.Provider>
  );
}