import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge, Button, Card, statusVariant } from "../../components/ui";
import { formatEGP } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { useAuth, useLayout } from "../../app/providers";
import { loadDemoOrders, type DemoOrder } from "../checkout/Page";
import type { OrderStatus, OrderWithItems } from "../../types/supabase";

type DisplayOrder = {
  id: string;
  created_at: string;
  status: OrderStatus | "pending";
  total_price: number;
  delivery_address: string | null;
  table_number: number | null;
  demo: boolean;
  lines: { name: string; quantity: number; price_at_order: number }[];
};

function fromRow(row: OrderWithItems): DisplayOrder {
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    total_price: row.total_price,
    delivery_address: row.delivery_address,
    table_number: row.table_number,
    demo: false,
    lines: row.order_items.map((item) => ({
      name: item.menu_items?.name ?? "Removed item",
      quantity: item.quantity,
      price_at_order: item.price_at_order,
    })),
  };
}

function fromDemo(order: DemoOrder): DisplayOrder {
  return {
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    total_price: order.total_price,
    delivery_address: order.delivery_address,
    table_number: order.table_number,
    demo: true,
    lines: order.items,
  };
}

/**
 * Order history — customers only ever see their own orders (enforced by RLS
 * when Supabase is connected).
 */
export default function OrdersPage() {
  const { user, isDemoMode } = useAuth();
  const { currencySymbol } = useLayout();
  const location = useLocation();
  const placedId = (location.state as { placed?: string } | null)?.placed;

  const [orders, setOrders] = useState<DisplayOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      if (!supabase) {
        setOrders(loadDemoOrders().map(fromDemo));
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name))")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setOrders([]);
      } else {
        setOrders(((data ?? []) as unknown as OrderWithItems[]).map(fromRow));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, placedId]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-6xl">📋</p>
        <h1 className="mt-4 text-2xl font-bold text-primary">Login required</h1>
        <p className="mt-2 text-gray-500">Log in to see your order history.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login" state={{ from: "/orders" }}>
            <Button size="lg">Login</Button>
          </Link>
          <Link to="/register" state={{ from: "/orders" }}>
            <Button size="lg" variant="outline">
              Register
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-primary">My Orders</h1>

      {placedId && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <p className="font-semibold text-green-800">✅ Order placed successfully!</p>
          <p className="text-sm text-green-700">
            Reference <span className="font-mono">{placedId.slice(0, 8)}</span> — the
            kitchen will confirm it shortly.
          </p>
        </Card>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn't load orders: {error}
        </p>
      )}

      {orders === null ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <Card key={n} className="animate-pulse">
              <div className="h-4 w-1/3 rounded bg-primary-100" />
              <div className="mt-3 h-3 w-2/3 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-4xl">🧾</p>
          <p className="mt-2 font-medium text-gray-700">No orders yet</p>
          <p className="text-sm text-gray-500">Your placed orders will appear here.</p>
          <Link to="/menu" className="mt-4 inline-block">
            <Button>Start an order</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-gray-500">
                    #{order.id.slice(0, 8)}
                    {order.demo && (
                      <Badge variant="warning" className="ml-2">
                        demo
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={statusVariant(order.status)} dot>
                  {order.status}
                </Badge>
              </div>

              <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                {order.lines.map((line, idx) => (
                  <li key={idx} className="flex justify-between py-1.5 text-sm">
                    <span>
                      {line.name} <span className="text-gray-400">× {line.quantity}</span>
                    </span>
                    <span className="font-medium">
                      {formatEGP(line.price_at_order * line.quantity, currencySymbol)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <p className="text-xs text-gray-500">
                  {order.delivery_address
                    ? `🛵 ${order.delivery_address}`
                    : order.table_number
                      ? `🍽️ Table ${order.table_number}`
                      : ""}
                </p>
                <p className="font-extrabold text-primary">
                  Total {formatEGP(order.total_price, currencySymbol)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
