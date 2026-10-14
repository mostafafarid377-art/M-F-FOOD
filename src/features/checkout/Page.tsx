import React from "react";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-primary text-white p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Checkout</h2>
        <p className="text-white/80 mb-6">Checkout page - order processing</p>
        <div className="bg-white/20 rounded p-4 inline-block">
          <p className="text-sm text-white/80">Your order will be processed securely</p>
        </div>
      </div>
    </div>
  );
}