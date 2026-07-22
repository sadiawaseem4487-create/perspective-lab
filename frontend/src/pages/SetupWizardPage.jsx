import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { fetchSetupStatus, saveSetupKeys } from "@/api";
import { PageAlert, PageHero, PagePanel } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SetupWizardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await saveSetupKeys({
        provider,
        api_key: apiKey.trim(),
        model: model.trim() || undefined,
      });
      setDone(true);
      setApiKey("");
      navigate("/question");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHero
        badge={t("setup.badge")}
        title={t("setup.title")}
        description={<p className="text-slate-400">{t("setup.desc")}</p>}
      />

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
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
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
                placeholder={t("setup.apiKeyPh")}
                required
                minLength={8}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("setup.model")}
            </label>
            <input
              className="page-input w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini"}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !status?.setup_allowed}
            className="page-btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {saving ? t("setup.saving") : t("setup.save")}
          </button>

          {status && !status.setup_allowed && (
            <p className="text-sm text-amber-300">{t("setup.blocked")}</p>
          )}
        </form>
      </PagePanel>
    </div>
  );
}
