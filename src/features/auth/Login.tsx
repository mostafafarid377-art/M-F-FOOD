import React from "react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary text-white">
      <div className="bg-white/10 rounded p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
        <p className="text-gray-400 mb-6">Login page - Supabase auth to be integrated</p>
        <button className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary transition-colors">
          Continue as Guest
        </button>
      </div>
    </div>
  );
}