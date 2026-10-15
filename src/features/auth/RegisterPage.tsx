import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card } from "../../components/ui";
import { useAuth } from "../../app/providers";

export default function RegisterPage() {
  const { register, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/menu";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), password, fullName.trim());
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card className="p-6">
        <h1 className="text-2xl font-extrabold text-primary">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          New accounts get the <strong>customer</strong> role by default.
        </p>

        {isDemoMode && (
          <div className="mt-4">
            <Badge variant="warning">
              Demo mode — accounts are stored locally in your browser
            </Badge>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Mostafa Farid"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Repeat your password"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? "Creating account…" : "Register"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" state={{ from }} className="font-semibold text-primary hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
