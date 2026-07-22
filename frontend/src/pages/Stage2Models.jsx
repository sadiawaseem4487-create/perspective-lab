import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchModels, fetchSelectedModel, selectModel } from "../api";
import { PageHero, PagePanel } from "../components/PageChrome";
import { useLanguage } from "../i18n/LanguageContext";
import { cn } from "@/lib/utils";

export default function Stage2Models() {
  const { t } = useLanguage();
  const [models, setModels] = useState([]);
  const [selected, setSelected] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetchModels(), fetchSelectedModel()])
      .then(([config, current]) => {
        setModels(config.models || []);
        setDefaultModel(config.default_model || "");
        setSelected(current.model || config.default_model || "");
      })
      .catch(console.error);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await selectModel(selected);
      setMessage(t("stage2.saved"));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge={t("stage2.badge")}
        title={t("stage2.title")}
        description={
          <p>
            {t("stage2.desc")}{" "}
            <code className="rounded bg-slate-900/80 px-1 text-slate-300">
              cases/&lt;case&gt;/models/available_models.json
            </code>
            .
          </p>
        }
      />

      <PagePanel>
        <label className="block text-sm font-semibold text-slate-200">{t("stage2.selected")}</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="page-select mt-2 w-full"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.recommended ? t("common.recommended") : ""} — {m.id}
            </option>
          ))}
        </select>
        {defaultModel && (
          <p className="mt-2 text-sm text-slate-400">
            {t("common.default")}: {defaultModel}
          </p>
        )}
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

      <div className="grid gap-4 md:grid-cols-2">
        {models.map((m) => (
          <article
            key={m.id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              selected === m.id
                ? "border-orange-500/40 bg-orange-500/10"
                : "border-white/10 bg-slate-900/40"
            )}
          >
            <h3 className="font-semibold text-white">{m.name}</h3>
            <p className="text-xs text-slate-400">{m.provider}</p>
            <p className="mt-2 text-sm text-slate-300">{m.notes}</p>
          </article>
        ))}
      </div>

      <div className="flex justify-between">
        <Link to="/agents" className="page-btn-secondary">
          {t("common.back")}
        </Link>
        <Link to="/question" className="page-btn-primary">
          {t("stage2.next")}
        </Link>
      </div>
    </div>
  );
}
