import React from "react";
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { AuthProvider, CartProvider, LayoutProvider } from "./providers";
import HomePage from "../features/home/Page";
import MenuPage from "../features/menu/Page";
import CartPage from "../features/cart/Page";
import CheckoutPage from "../features/checkout/Page";
import OrdersPage from "../features/orders/Page";
import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import { Button } from "../components/ui";

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-6xl">🍽️</p>
      <h1 className="text-2xl font-bold text-primary">Page not found</h1>
      <p className="text-gray-600">The page you are looking for doesn't exist.</p>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return (
    <LayoutProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </LayoutProvider>
  );
}
