import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { fetchSetupStatus, saveLabLlmKey, saveSetupKeys, saveUserLlmKey } from "@/api";
import { ModelPicker } from "@/components/ModelPicker";
import { PageAlert, PageHero, PagePanel } from "@/components/PageChrome";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SetupWizardPage({ embedded = false }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, refresh, personalKey, llmConfigured, llmSource, serverLlmAvailable } =
    useAuth();
  const [provider, setProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchSetupStatus()
      .then((data) => {
        setStatus(data);
        if (data.llm_provider) setProvider(data.llm_provider);
        if (data.llm_configured) setDone(true);
        if (data.personal_key?.model) setModel(data.personal_key.model);
        else if (data.llm_provider === "openai") setModel("gpt-4o-mini");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (personalKey?.configured) {
      setDone(true);
      if (personalKey.model) setModel(personalKey.model);
      if (personalKey.provider) setProvider(personalKey.provider);
    }
  }, [personalKey]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const keyTrim = apiKey.trim();
      if (isAuthenticated) {
        if (isAdmin && keyTrim) {
          // Shared lab key (Postgres) — all signed-in users can ask without a personal key.
          try {
            await saveLabLlmKey({
              provider,
              api_key: keyTrim,
              model: model.trim() || undefined,
            });
          } catch (err) {
            // Fall through to personal key if not admin on this deploy yet.
            if (!String(err.message || "").includes("Admin")) throw err;
          }
        }
        await saveUserLlmKey({
          provider,
          api_key: keyTrim,
          model: model.trim() || undefined,
        });
        if (isAdmin && status?.setup_allowed && keyTrim) {
          try {
            await saveSetupKeys({
              provider,
              api_key: keyTrim,
              model: model.trim() || undefined,
            });
          } catch {
            // Personal/lab key is enough; server .env write is optional.
          }
        }
      } else if (status?.setup_allowed) {
        if (!keyTrim) throw new Error("Paste an API key to continue.");
        await saveSetupKeys({
          provider,
          api_key: keyTrim,
          model: model.trim() || undefined,
        });
      } else {
        throw new Error("Sign in to save your API key.");
      }
      setDone(true);
      setApiKey("");
      await refresh();
      navigate("/question");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    !saving &&
    Boolean(model.trim()) &&
    (isAuthenticated
      ? Boolean(apiKey.trim()) || done
      : Boolean(apiKey.trim()) && status?.setup_allowed);

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-xl space-y-6"}>
      {!embedded && (
        <PageHero
          badge={t("setup.badge")}
          title={t("setup.title")}
          description={<p className="text-slate-400">{t("setup.desc")}</p>}
        />
      )}
      {embedded && (
        <p className="text-sm text-slate-400">
          {isAuthenticated
            ? serverLlmAvailable
              ? "Optional personal key, or (admin) paste a key to set the shared lab key for everyone."
              : "Paste an OpenRouter or OpenAI key. Admins set the shared lab key for all users."
            : t("setup.desc")}
        </p>
      )}

      {isAuthenticated && serverLlmAvailable && !personalKey?.configured && llmConfigured && (
        <PageAlert>
          <span>
            Ready to ask agents using the <strong>shared lab key</strong>
            {llmSource === "server" ? " (server)" : ""}. Add a personal key below only if you
            want billing on your own account.
          </span>
        </PageAlert>
      )}

      {!isAuthenticated && (
        <PageAlert>
          <span>
            Create an account so your key stays private.{" "}
            <Link to="/register" className="underline text-orange-300">
              Register
            </Link>{" "}
            or{" "}
            <Link to="/login" className="underline text-orange-300">
              Sign in
            </Link>
            .
          </span>
        </PageAlert>
      )}

      {error && <PageAlert>{error}</PageAlert>}
      {done && (
        <PageAlert variant="success">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("setup.done")}
          </span>
        </PageAlert>
      )}

      <PagePanel>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("setup.provider")}
            </label>
            <select
              className="page-input w-full"
              value={provider}
              onChange={(e) => {
                const next = e.target.value;
                setProvider(next);
                setModel(next === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini");
              }}
            >
              <option value="openrouter">OpenRouter (all providers)</option>
              <option value="openai">OpenAI (direct)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("setup.apiKey")}
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                className="page-input w-full pl-10"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  done
                    ? "Leave blank to keep saved key — or paste a new one"
                    : t("setup.apiKeyPh")
                }
                required={!done}
                minLength={done ? 0 : 8}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("setup.model")}
            </label>
            <ModelPicker provider={provider} value={model} onChange={setModel} disabled={saving} />
          </div>

          <button
            type="submit"
            disabled={!canSave}
            className="page-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? t("setup.saving") : t("setup.save")}
          </button>
        </form>
      </PagePanel>
    </div>
  );
}
