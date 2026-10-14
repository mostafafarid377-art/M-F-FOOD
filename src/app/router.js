import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "../features/menu/Page";
import Menu from "../features/menu/Page";
import Cart from "../features/cart/Page";
import Checkout from "../features/checkout/Page";
export const router = createBrowserRouter([
    {
        path: "/",
        element: _jsx(Home, {}),
        children: [
            { path: "menu", element: _jsx(Menu, {}) },
            { path: "cart", element: _jsx(Cart, {}) },
            { path: "checkout", element: _jsx(Checkout, {}) },
        ],
    },
]);
function App() {
    return _jsx(RouterProvider, { router: router });
}
export default App;
