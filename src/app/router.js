import { jsx as _jsx } from "react/jsx-runtime";
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
        element: _jsx(Home, {}),
        children: [
            {
                path: "menu",
                element: _jsx(Menu, {}),
            },
            {
                path: "cart",
                element: _jsx(Cart, {}),
            },
            {
                path: "checkout",
                element: _jsx(Checkout, {}),
            },
            {
                path: "order-confirmation",
                element: _jsx(OrderConfirmation, {}),
            },
        ],
    },
    {
        path: "/admin",
        element: _jsx(Dashboard, {}),
        children: [],
    },
    {
        path: "/kitchen",
        element: _jsx(KitchenDashboard, {}),
        children: [],
    },
    {
        path: "/tables",
        element: _jsx(TablesDashboard, {}),
        children: [],
    },
    {
        path: "/delivery",
        element: _jsx(DeliveryDashboard, {}),
        children: [],
    },
    {
        path: "/login",
        element: _jsx(Login, {}),
    },
]);
function App() {
    return _jsx(RouterProvider, { router: router });
}
export default App;
