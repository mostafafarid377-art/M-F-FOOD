import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "../features/menu/Page";
import Menu from "../features/menu/Page";
import Cart from "../features/cart/Page";
import Checkout from "../features/checkout/Page";
import OrderConfirmation from "../features/orders/OrderConfirmation";
import Login from "../features/auth/Login";
import Dashboard from "../features/admin/Dashboard";
import KitchenDashboard from "../features/kitchen/Dashboard";
import TablesDashboard from "../features/tables/Page";
import DeliveryDashboard from "../features/delivery/Page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    children: [
      {
        path: "menu",
        element: <Menu />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "checkout",
        element: <Checkout />,
      },
      {
        path: "order-confirmation",
        element: <OrderConfirmation />,
      },
    ],
  },
  {
    path: "/admin",
    element: <Dashboard />,
    children: [],
  },
  {
    path: "/kitchen",
    element: <KitchenDashboard />,
    children: [],
  },
  {
    path: "/tables",
    element: <TablesDashboard />,
    children: [],
  },
  {
    path: "/delivery",
    element: <DeliveryDashboard />,
    children: [],
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;