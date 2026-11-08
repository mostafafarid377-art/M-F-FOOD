import { imageUrl } from "../../lib/assets";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ButtonLink, Button, Card } from "../../components/ui";
import { formatEGP } from "../../lib/format";
import { useCart, useLayout } from "../../app/providers";

/**
 * Cart page — item quantities, removal, subtotal/total in EGP and a
 * checkout button. The cart itself is persisted by CartProvider.
 */
export default function CartPage() {
  const navigate = useNavigate();
  const { currencySymbol } = useLayout();
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart();

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <p className="text-6xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold text-primary">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">
          Browse the menu and add something delicious.
        </p>
        <ButtonLink to="/menu" size="lg" className={["mt-6"].filter(Boolean).join(' ')}>Browse Menu</ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-primary">Your Cart</h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Clear cart
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-3 gap-y-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
            <img
              src={imageUrl(item.image)}
              alt={item.name}
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.visibility = "hidden";
              }}
            />

            <div className="min-w-0">
              <p className="break-words font-semibold text-gray-900 [overflow-wrap:anywhere]">{item.name}</p>
              <p className="text-sm text-gray-500">
                {formatEGP(item.price, currencySymbol)} each
              </p>
            </div>

            {/* On phones, controls get their own row so names never collapse. */}
            <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:col-span-1 sm:flex-nowrap">
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${item.name}`}
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-primary-200 text-primary transition-colors hover:bg-primary-50"
                >
                  −
                </button>
                <output aria-label={`Quantity of ${item.name}`} aria-live="polite" className="min-w-[2rem] text-center font-semibold">{item.quantity}</output>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${item.name}`}
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-primary-200 text-primary transition-colors hover:bg-primary-50"
                >
                  +
                </button>
              </div>

              <p className="ml-auto min-w-0 shrink-0 whitespace-nowrap text-right font-bold text-gray-900 sm:min-w-24">
                {formatEGP(item.price * item.quantity, currencySymbol)}
              </p>

              <button
                type="button"
                aria-label={`Remove ${item.name} from cart`}
                onClick={() => removeItem(item.id)}
                className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-2-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Totals */}
      <Card className="mt-6">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span className="font-semibold text-gray-900">
            {formatEGP(subtotal, currencySymbol)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-extrabold text-primary">
            {formatEGP(subtotal, currencySymbol)}
          </span>
        </div>
        <p className="mt-1 text-right text-xs text-gray-400">
          Delivery fees (if any) are added at checkout. Final totals are verified
          by the server.
        </p>
      </Card>

      <Button size="lg" fullWidth className="mt-6" onClick={handleCheckout}>
        Proceed to Checkout
      </Button>
    </div>
  );
}
