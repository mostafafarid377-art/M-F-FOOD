import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../app/providers";
import { useLayout } from "../../app/providers";
import { useAuth } from "../../app/providers";
import { Card, Badge } from "../components/ui";
// @ts-ignore
// @ts-ignore
// @ts-ignore

export default function OrdersPage() {
  const { currency, currencySymbol } = useLayout();
  const { user } = useAuth();
  const { items, addItem, removeItem, clearCart, total } = useCart();
  const navigate = useNavigate();

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-primary text-white p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <p className="text-white/80 mb-6">
          Please log in or register to place an order
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate("/login")}
            className="bg-white/20 text-white px-6 py-3 rounded hover:bg-white/30 transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/register")}
            className="bg-white/20 text-white px-6 py-3 rounded hover:bg-white/30 transition-colors"
          >
            Register
          </button>
        </div>
      </div>
    );
  }

  // Check if cart has items
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-primary text-white p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Cart Empty</h2>
        <p className="text-white/80 mb-6">
          Add items to your cart from the menu
        </p>
        <button
          onClick={() => navigate("/menu")}
          className="bg-white/20 text-white px-6 py-3 rounded hover:bg-white/30 transition-colors"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 200; // 2.00 EGP in piastres
  const taxRate = 0.1; // 10%
  const tax = Math.round(subtotal * taxRate);
  const totalBeforePayment = subtotal + deliveryFee + tax;

  const handleCreateOrder = () => {
    if (!user) {
      alert("User not authenticated");
      return;
    }

    // Build order summary for display
    const orderSummary = {
      customerId: user.id,
      subtotal: subtotal / 100,
      deliveryFee: deliveryFee / 100,
      tax: tax,
      total: totalBeforePayment / 100,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price / 100,
      })),
    };

    // Simulate order creation
    alert(
      `Order created successfully!\nTotal: ${currencySymbol}${totalBeforePayment / 100}\n\nOrder summary:\n${JSON.stringify(orderSummary, null, 2)}`
    );

    // Clear cart and navigate
    clearCart();
    navigate("/orders/history");
  };

  return (
    <div className="min-h-screen bg-primary/10 p-8">
      <div className="max-w-3xl mx-auto bg-white/20 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-primary mb-6">
          {currencySymbol} Order Summary
        </h2>

        <Card className="mb-4">
          <h3 className="text-primary font-medium mb-4">Cart Items</h3>
          {items.map((item) => (
            <div key={item.id} className="p-3 border-b border-primary/20 last:border-0">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.name}</span>
                <span className="text-lg font-bold">
                  {currencySymbol}{item.price / 100} × {item.quantity}
                </span>
              </div>
              {item.modifiers?.length > 0 && (
                <div className="mt-1 text-xs text-primary">
                  {item.modifiers.map((m) => `${m.option_name}`).join(", ")}
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-primary/60">No items in cart</p>
          )}
        </Card>

        <div className="mt-6 p-4 bg-primary/10 rounded">
          <div className="flex justify-between text-sm mb-2">
            <span>Subtotal:</span>
            <span>{currencySymbol}{subtotal / 100}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span>Delivery Fee:</span>
              <span>{currencySymbol}{deliveryFee / 100}</span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2">
            <span>Tax ({Math.round(taxRate * 100)}%):</span>
            <span>{currencySymbol}{tax}</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-3">
            <span>Total:</span>
            <span>{currencySymbol}{totalBeforePayment / 100}</span>
          </div>
        </div>

        <button
          onClick={handleCreateOrder}
          className="w-full bg-primary text-white py-3 rounded hover:bg-secondary transition-colors text-lg font-medium mt-6"
          disabled={items.length === 0}
        >
          {items.length === 0 ? "Cart is empty" : "Place Order"}
        </button>
      </div>
    </div>
  );
}