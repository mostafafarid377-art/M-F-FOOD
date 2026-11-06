import React from "react";
import { createBrowserRouter, createHashRouter, RouterProvider, Link } from "react-router-dom";
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
import { ManagementGate } from "../features/management/access";
import { FloorGate, Phase5Shell } from "../features/phase5/Shell";
const Tables = React.lazy(() => import("../features/phase5/Tables"));
const DeliveryAdmin = React.lazy(() => import("../features/phase5/DeliveryAdmin"));
const Driver = React.lazy(() => import("../features/phase5/Driver"));
const Tracking = React.lazy(() => import("../features/phase5/Tracking"));
const Dashboard = React.lazy(() => import("../features/management/Dashboard"));
const Kitchen = React.lazy(() => import("../features/management/Kitchen"));

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

// GitHub Pages has no SPA fallback for refreshed deep links. Use hash routes
// under a subdirectory, while keeping clean browser routes in local development.
const createRouter = import.meta.env.BASE_URL === "/" ? createBrowserRouter : createHashRouter;
export const router = createRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "admin", element: <ManagementGate><React.Suspense fallback={<p className="p-8">Loading dashboard…</p>}><Dashboard /></React.Suspense></ManagementGate> },
      { path: "kitchen", element: <ManagementGate kitchen><React.Suspense fallback={<p className="p-8">Loading kitchen…</p>}><Kitchen /></React.Suspense></ManagementGate> },
      { path: "tables", element: <FloorGate><Phase5Shell><React.Suspense fallback={<p className="p-8">Loading…</p>}><Tables /></React.Suspense></Phase5Shell></FloorGate> },
      { path: "delivery-admin", element: <ManagementGate><Phase5Shell><React.Suspense fallback={<p className="p-8">Loading…</p>}><DeliveryAdmin /></React.Suspense></Phase5Shell></ManagementGate> },
      { path: "driver", element: <Phase5Shell><React.Suspense fallback={<p className="p-8">Loading…</p>}><Driver /></React.Suspense></Phase5Shell> },
      { path: "track/:orderId", element: <Phase5Shell><React.Suspense fallback={<p className="p-8">Loading…</p>}><Tracking /></React.Suspense></Phase5Shell> },
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
