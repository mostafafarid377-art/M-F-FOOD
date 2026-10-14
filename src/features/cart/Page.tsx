import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../app/providers";

type CartItem = {
  id: string;
  name: string;
  price: number; // in piastres
  quantity: number;
  image?: string;
};

export default function CartPage() {
  const navigate = useNavigate();
  const { items, addItem, removeItem, updateQuantity, clearCart, total } = useCart();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleRemove = (itemId: string) => {
    removeItem(itemId);
  };

  const handleQuantityChange = (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      updateQuantity(itemId, value);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      alert("Your cart is empty");
      return;
    }
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 rounded p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Your Cart</h2>
          <p className="text-white/80 mb-6">Your cart is empty</p>
          <p className="text-white/60 small">
            Browse the menu to add items
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <h2 className="text-2xl font-bold text-primary mb-6">Your Cart</h2>

      <div className="overflow-x-auto rounded-lg bg-white/10 shadow-md">
        <table className="w-full">
          <thead>
            <tr className="text-left text-white border-b border-gray-200/50">
              <th className="p-3 text-primary">Item</th>
              <th className="p-3 text-primary">Qty</th>
              <th className="p-3 text-primary">Price</th>
              <th className="p-3 text-primary">Remove</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-200/50">
                <td className="p-3">
                  <img
                    src={item.image || "/placeholder-food.jpg"}
                    alt={item.name}
                    className="h-6 w-6 object-rounded mr-3"
                  />
                  <span>{item.name}</span>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.id, e)}
                    className="w-20 rounded border border-gray-300 text-center"
                  />
                </td>
                <td className="p-3">
                  EGP {item.price * item.quantity / 100}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-red-600 hover:text-red-400"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-primary/10 rounded border border-primary/20">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>EGP {subtotal / 100}</span>
        </div>
      </div>

      <div className="mt-8 p-4 bg-primary rounded">
        <h3 className="text-lg font-bold text-primary mb-2">Total</h3>
        <p className="text-3xl font-bold">
          EGP {total / 100}
        </p>
      </div>

      <div className="mt-6">
        <button
          onClick={handleCheckout}
          className="w-full bg-primary text-white py-3 rounded hover:bg-secondary transition-colors text-lg font-medium"
        >
          Checkout
        </button>
      </div>

      <button
        onClick={clearCart}
        className="mt-4 w-full text-red-600 hover:text-red-400 py-2 rounded text-sm"
      >
        Clear Cart
      </button>
    </div>
  );
}