import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card } from "../../components/ui";
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
        <Link to="/menu" className="mt-6">
          <Button size="lg">Browse Menu</Button>
        </Link>
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
          <Card key={item.id} className="flex flex-wrap items-center gap-4">
            <img
              src={item.image ?? "/images/placeholder.jpg"}
              alt={item.name}
              className="h-16 w-16 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-500">
                {formatEGP(item.price, currencySymbol)} each
              </p>
            </div>

            {/* Quantity stepper */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Decrease quantity of ${item.name}`}
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-primary-200 text-primary transition-colors hover:bg-primary-50"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{item.quantity}</span>
              <button
                type="button"
                aria-label={`Increase quantity of ${item.name}`}
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-primary-200 text-primary transition-colors hover:bg-primary-50"
              >
                +
              </button>
            </div>

            <p className="w-24 text-right font-bold text-gray-900">
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
