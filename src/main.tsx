import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/router";
import "./index.css";
import { isSupabaseConfigured } from "./lib/supabase";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    {import.meta.env.PROD && !isSupabaseConfigured ? <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Service unavailable</h1><p className="mt-3">The restaurant ordering service is not configured. Please contact the restaurant and try again later.</p></main> : <App />}
  </React.StrictMode>
);
