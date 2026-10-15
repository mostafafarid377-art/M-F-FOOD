import React from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "../../components/ui";
import { useLayout } from "../../app/providers";
import { SAMPLE_CATEGORIES } from "../menu/data";

export default function HomePage() {
  const { restaurantName, currencySymbol, deliveryFee, minimumOrder } = useLayout();

  return (
    <div>
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="bg-gradient-to-br from-primary-700 via-primary to-primary-500 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary-100">
              Fresh · Fast · Flame-grilled
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              Hungry? {restaurantName} has you covered.
            </h1>
            <p className="mt-4 max-w-md text-lg text-primary-50">
              Burgers, pizzas, salads, pastas, wraps and fresh drinks — made to
              order and delivered hot to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/menu">
                <Button size="lg" className="bg-white !text-primary hover:bg-primary-50">
                  Browse the Menu
                </Button>
              </Link>
              <Link to="/cart">
                <Button
                  size="lg"
                  variant="outline"
                  className="!border-white !text-white hover:!bg-white/10"
                >
                  View Cart
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-primary-100">
              Delivery fee {currencySymbol}
              {(deliveryFee / 100).toFixed(2)} · minimum order {currencySymbol}
              {(minimumOrder / 100).toFixed(2)}
            </p>
          </div>
          <div className="hidden md:block">
            <img
              src="/images/burger.jpg"
              alt="Classic beef burger"
              className="mx-auto w-full max-w-md rounded-2xl shadow-2xl ring-4 ring-white/20"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      </section>

      {/* ---------------------------- Categories ---------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">What are you craving?</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SAMPLE_CATEGORIES.map((category) => (
            <Link key={category.id} to={`/menu?cat=${category.id}`}>
              <Card hoverable className="flex h-full flex-col items-center justify-center py-6 text-center">
                <span className="font-semibold text-gray-800">{category.name}</span>
                <span className="mt-1 text-xs text-gray-400">{category.description}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ----------------------------- Features ----------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="text-center">
            <p className="text-3xl">🔥</p>
            <h3 className="mt-2 font-bold text-gray-900">Made to order</h3>
            <p className="mt-1 text-sm text-gray-500">
              Every dish is prepared fresh the moment you order — never before.
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl">🛵</p>
            <h3 className="mt-2 font-bold text-gray-900">Fast delivery</h3>
            <p className="mt-1 text-sm text-gray-500">
              Hot food at your door, or dine in with table service.
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl">🔒</p>
            <h3 className="mt-2 font-bold text-gray-900">Secure ordering</h3>
            <p className="mt-1 text-sm text-gray-500">
              Prices and totals are verified server-side on PostgreSQL via Supabase.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
