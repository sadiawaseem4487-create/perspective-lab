import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Protects research UI. Landing + invite stay public.
 * Production builds always require login (SaaS).
 * Local/dev may stay open when the server reports auth_required=false.
 */
export default function RequireAuth() {
  const { authRequired, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const mustLogin = Boolean(authRequired) || import.meta.env.PROD;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading…
      </div>
    );
  }

  if (mustLogin && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
