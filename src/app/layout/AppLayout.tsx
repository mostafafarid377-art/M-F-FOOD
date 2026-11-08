import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, useCart, useLayout } from "../providers";
import { ButtonLink, Badge, Button } from "../../components/ui";
import {tr, useArabic} from "../../features/phase5/Shell";
import { useNavigationAccess } from "./navigationAccess";

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
  const ar=useArabic();
  const { restaurantName, currency, currencySymbol } = useLayout();
  const { user, logout, isDemoMode } = useAuth();
  const access = useNavigationAccess(user, isDemoMode);
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
      <button type="button" onClick={()=>document.getElementById("main-content")?.focus()} className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3 focus:text-primary">{tr(ar,'Skip to content','تخطى إلى المحتوى')}</button>
      {/* ------------------------------ Navbar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-primary-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:gap-4">
          {/* Mobile hamburger (<768px) */}
          <button
            type="button"
            aria-label={tr(ar,"Toggle navigation menu","فتح أو إغلاق قائمة التنقل")}
            aria-controls="mobile-navigation"
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
          <div className="ms-4 hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              {tr(ar,'Home','الرئيسية')}
            </NavLink>
            <NavLink to="/menu" className={navLinkClass}>
              {tr(ar,'Menu','القائمة')}
            </NavLink>
            <NavLink to="/orders" className={navLinkClass}>
              {tr(ar,'My Orders','طلباتي')}
            </NavLink>
            {access.kitchen && <NavLink to="/kitchen" className={navLinkClass}>{tr(ar,'Kitchen','المطبخ')}</NavLink>}
            {access.dashboard && <NavLink to="/admin" className={navLinkClass}>{tr(ar,'Dashboard','لوحة الإدارة')}</NavLink>}
            {access.tables && <NavLink to="/tables" className={navLinkClass}>{tr(ar,'Tables','الطاولات')}</NavLink>}
            {access.driver && <NavLink to="/driver" className={navLinkClass}>{tr(ar,'Driver','السائق')}</NavLink>}
          </div>

          <div className="ms-auto flex items-center gap-2">
            {/* Cart with item count */}
            <Link
              to="/cart"
              aria-label={tr(ar,`Cart, ${count} items`,`السلة، ${count} عناصر`)}
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
                  {tr(ar,'Logout','خروج')}
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <ButtonLink to="/login" variant="outline" size="sm">{tr(ar,'Login','دخول')}
                  </ButtonLink>
                <ButtonLink to="/register" size="sm">{tr(ar,'Register','تسجيل')}</ButtonLink>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile panel (<768px) */}
        {mobileOpen && (
          <div id="mobile-navigation" className="border-t border-primary-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-1">
              <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
                {tr(ar,'Home','الرئيسية')}
              </NavLink>
              <NavLink to="/menu" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                {tr(ar,'Menu','القائمة')}
              </NavLink>
              <NavLink to="/orders" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                {tr(ar,'My Orders','طلباتي')}
              </NavLink>
              {access.kitchen && <NavLink to="/kitchen" className={navLinkClass} onClick={() => setMobileOpen(false)}>{tr(ar,'Kitchen','المطبخ')}</NavLink>}
              {access.dashboard && <NavLink to="/admin" className={navLinkClass} onClick={() => setMobileOpen(false)}>{tr(ar,'Dashboard','لوحة الإدارة')}</NavLink>}
              {access.tables && <NavLink to="/tables" className={navLinkClass} onClick={() => setMobileOpen(false)}>{tr(ar,'Tables','الطاولات')}</NavLink>}
              {access.driver && <NavLink to="/driver" className={navLinkClass} onClick={() => setMobileOpen(false)}>{tr(ar,'Driver','السائق')}</NavLink>}
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
                  <ButtonLink to="/login" onClick={() => setMobileOpen(false)} variant="outline" size="sm" fullWidth className={["flex-1"].filter(Boolean).join(' ')}>{tr(ar,'Login','دخول')}
                    </ButtonLink>
                  <ButtonLink to="/register" onClick={() => setMobileOpen(false)} size="sm" fullWidth className={["flex-1"].filter(Boolean).join(' ')}>{tr(ar,'Register','تسجيل')}
                    </ButtonLink>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------ Content ----------------------------- */}
      <main id="main-content" tabIndex={-1} className="flex-1">
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
