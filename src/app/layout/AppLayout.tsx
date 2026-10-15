import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, useCart, useLayout } from "../providers";
import { Badge, Button } from "../../components/ui";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary-50 text-primary"
      : "text-gray-700 hover:bg-primary-50 hover:text-primary",
  ].join(" ");

/**
 * Application shell: adaptive navbar (collapses to a hamburger menu on
 * mobile <768px), routed content via <Outlet/>, and a footer.
 */
export function AppLayout() {
  const { restaurantName, currency, currencySymbol } = useLayout();
  const { user, logout, isDemoMode } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-sand">
      {/* ------------------------------ Navbar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:gap-4">
          {/* Mobile hamburger (<768px) */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-md p-2 text-primary hover:bg-primary-50 md:hidden"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🍔
            </span>
            <span className="text-lg font-extrabold tracking-tight text-primary">
              {restaurantName}
            </span>
          </Link>

          {isDemoMode && (
            <Badge variant="warning" className="hidden sm:inline-flex">
              demo mode
            </Badge>
          )}

          {/* Desktop links */}
          <div className="ml-4 hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/menu" className={navLinkClass}>
              Menu
            </NavLink>
            <NavLink to="/orders" className={navLinkClass}>
              My Orders
            </NavLink>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Cart with item count */}
            <Link
              to="/cart"
              aria-label={`Cart, ${count} items`}
              className="relative rounded-md p-2 text-primary hover:bg-primary-50"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4H19M9 22a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
                />
              </svg>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>

            {/* Auth area — adapts to signed-in state */}
            {user ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="max-w-[10rem] truncate text-sm font-medium text-gray-700">
                  {user.full_name || user.email}
                </span>
                <Badge variant={user.role === "customer" ? "secondary" : "info"}>
                  {user.role}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile panel (<768px) */}
        {mobileOpen && (
          <div className="border-t border-primary-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-1">
              <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Home
              </NavLink>
              <NavLink to="/menu" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                Menu
              </NavLink>
              <NavLink to="/orders" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                My Orders
              </NavLink>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-gray-700">
                    {user.full_name || user.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" fullWidth>
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" fullWidth>
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------ Content ----------------------------- */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="border-t border-primary-100 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm text-gray-500 md:flex-row">
          <p>
            <span className="font-semibold text-primary">{restaurantName}</span> — fresh
            food, made to order.
          </p>
          <p>
            Prices in {currency} ({currencySymbol}) · Powered by Supabase / PostgreSQL
          </p>
        </div>
      </footer>
    </div>
  );
}
