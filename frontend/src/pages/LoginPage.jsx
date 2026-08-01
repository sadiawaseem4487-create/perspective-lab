import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageAlert, PageHero, PagePanel } from "@/components/PageChrome";

export default function LoginPage() {
  const { login, isAuthenticated, authRequired, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/question" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await login(email.trim(), password);
      navigate("/settings?tab=api");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <PageHero
        badge="Account"
        title="Sign in"
        size="sm"
        description={
          <p className="text-slate-400">
            {authRequired
              ? "Use your PerspectiveLab account. Each person uses their own API key."
              : "Sign in to save your own API key and run agents."}
          </p>
        }
      />
      {error && <PageAlert>{error}</PageAlert>}
      <PagePanel>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              className="page-input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Password
            </label>
            <input
              className="page-input w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={saving} className="page-btn-primary w-full py-2.5 text-sm">
            {saving ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </PagePanel>
      <p className="text-center text-sm text-slate-400">
        No account?{" "}
        <Link to="/register" className="text-orange-400 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
