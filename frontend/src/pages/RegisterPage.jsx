import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageAlert, PageHero, PagePanel } from "@/components/PageChrome";

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/settings?tab=api" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await register(email.trim(), password, name.trim());
      navigate("/settings?tab=api");
    } catch (err) {
      setError(err.message || "Could not create account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <PageHero
        badge="Account"
        title="Create account"
        size="sm"
        description={
          <p className="text-slate-400">
            After signing up, paste <strong className="text-slate-200">your own</strong> OpenRouter
            or OpenAI key. The lab admin key is not shared.
          </p>
        }
      />
      {error && <PageAlert>{error}</PageAlert>}
      <PagePanel>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Name
            </label>
            <input
              className="page-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
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
              Password (min 8)
            </label>
            <input
              className="page-input w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={saving} className="page-btn-primary w-full py-2.5 text-sm">
            {saving ? "Creating…" : "Create account"}
          </button>
        </form>
      </PagePanel>
      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-orange-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
