import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "../features/menu/Page";
import Menu from "../features/menu/Page";
import Cart from "../features/cart/Page";
import Checkout from "../features/checkout/Page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    children: [
      { path: "menu", element: <Menu /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;