import React from "react";

export default function OrderConfirmation() {
  return (
    <div className="min-h-screen bg-primary text-white p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Order Confirmation</h2>
        <p className="text-gray-400 mb-6">Order has been placed successfully</p>
        <div className="bg-white/10 rounded p-4 inline-block">
          <p className="text-4xl font-bold">#ORDER-12345</p>
        </div>
      </div>
    </div>
  );
}