import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchModelsCatalog, fetchSelectedModel, selectModel, saveUserLlmKey } from "../api";
import { ModelPicker } from "../components/ModelPicker";
import { PageHero, PagePanel } from "../components/PageChrome";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { cn } from "@/lib/utils";

export default function Stage2Models({ embedded = false }) {
  const { t } = useLanguage();
  const { isAuthenticated, personalKey, refresh } = useAuth();
  const [models, setModels] = useState([]);
  const [selected, setSelected] = useState("");
  const [provider, setProvider] = useState("openrouter");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const prov = personalKey?.provider === "openai" ? "openai" : "openrouter";
    setProvider(prov);
    Promise.all([fetchModelsCatalog(prov), fetchSelectedModel()])
      .then(([catalog, current]) => {
        setModels((catalog.models || []).filter((m) => m.recommended).slice(0, 12));
        setSource(catalog.source || "");
        setSelected(
          personalKey?.model || current.model || catalog.default_model || ""
        );
      })
      .catch(console.error);
  }, [personalKey]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await selectModel(selected);
      if (isAuthenticated && personalKey?.configured) {
        await saveUserLlmKey({
          provider,
          api_key: "",
          model: selected,
        });
        await refresh();
      }
      setMessage(t("stage2.saved"));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-6xl space-y-6"}>
      {!embedded && (
        <PageHero
          badge={t("stage2.badge")}
          title={t("stage2.title")}
          description={
            <p>
              Choose any model available through your provider. OpenRouter includes OpenAI,
              Anthropic, Google, Meta, DeepSeek, Mistral, and more.
            </p>
          }
        />
      )}
      {embedded && (
        <p className="text-sm text-slate-400">
          Pick the model used when you Ask agents. OpenRouter unlocks many providers from one key.
          {source === "openrouter" ? " Live catalog loaded." : ""}
        </p>
      )}

      <PagePanel>
        <label className="block text-sm font-semibold text-slate-200">{t("stage2.selected")}</label>
        <div className="mt-2">
          <ModelPicker
            provider={provider}
            value={selected}
            onChange={setSelected}
            disabled={saving}
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selected}
          className="page-btn-primary mt-4"
        >
          {saving ? t("common.saving") : t("stage2.save")}
        </button>
        {message && <p className="mt-3 text-sm text-slate-400">{message}</p>}
      </PagePanel>

      {models.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {models.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected === m.id
                  ? "border-orange-500/40 bg-orange-500/10"
                  : "border-white/10 bg-slate-900/40 hover:border-white/20"
              )}
            >
              <h3 className="font-semibold text-white">{m.name}</h3>
              <p className="text-xs text-slate-400">{m.provider}</p>
              <p className="mt-2 text-sm text-slate-300">{m.notes}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{m.id}</p>
            </button>
          ))}
        </div>
      )}

      {!embedded && (
        <div className="flex justify-between">
          <Link to="/settings?tab=agents" className="page-btn-secondary">
            {t("common.back")}
          </Link>
          <Link to="/question" className="page-btn-primary">
            {t("stage2.next")}
          </Link>
        </div>
      )}
    </div>
  );
}
