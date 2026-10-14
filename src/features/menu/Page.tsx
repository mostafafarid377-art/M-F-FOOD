import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, Badge } from "../components/ui";
// @ts-ignore
import { useLayout } from "../../app/providers";
import { useCart } from "../../app/providers";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  categoryId: string;
};

export default function MenuPage() {
  const { currency, currencySymbol } = useLayout();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sample data - in production, this would come from Supabase
    const sampleItems: MenuItem[] = [
      {
        id: "1",
        name: "Classic Burger",
        description: "Juicy beef patty with lettuce, tomato, and special sauce",
        price: 1250,
        image: "/placeholder-food.jpg",
        isAvailable: true,
        categoryId: "burgers",
      },
      {
        id: "2",
        name: "Margherita Pizza",
        description: "Fresh mozzarella, tomato sauce, and basil",
        price: 1800,
        image: "/placeholder-food.jpg",
        isAvailable: true,
        categoryId: "pizzas",
      },
    ];

    setItems(sampleItems);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary">Loading menu...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="flex-1 p-4 md:p-8">
        <h2 className="text-2xl font-bold text-primary">
          {currencySymbol} Menu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            if (!item.isAvailable) return null;
            return (
              <Card
                key={item.id}
                className="hover:shadow-lg cursor-pointer border border-primary/20"
              >
                <img
                  src={item.image || "/placeholder-food.jpg"}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded-t-md"
                />
                <div className="p-3">
                  <h3 className="font-medium text-primary">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  <p className="mt-2">
                    <span className="text-lg font-bold">
                      {currencySymbol}{item.price / 100}
                    </span>
                  </p>
                  <button
                    onClick={() => addItem({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      quantity: 1,
                    })}
                    className="w-full bg-primary text-white py-2 rounded hover:bg-secondary transition-colors text-sm mt-2"
                  >
                    Add to Order
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}