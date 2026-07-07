import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchModels, fetchSelectedModel, selectModel } from "../api";
import { useLanguage } from "../i18n/LanguageContext";

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
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{t("stage2.badge")}</p>
        <h2 className="font-display text-3xl font-bold text-stone-900">{t("stage2.title")}</h2>
        <p className="mt-2 text-stone-600">
          {t("stage2.desc")}{" "}
          <code className="rounded bg-stone-100 px-1">cases/&lt;case&gt;/models/available_models.json</code>.
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-stone-700">{t("stage2.selected")}</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.recommended ? t("common.recommended") : ""} — {m.id}
            </option>
          ))}
        </select>
        {defaultModel && (
          <p className="mt-2 text-sm text-stone-500">
            {t("common.default")}: {defaultModel}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selected}
          className="mt-4 rounded-xl bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900 disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("stage2.save")}
        </button>
        {message && <p className="mt-3 text-sm text-stone-600">{message}</p>}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {models.map((m) => (
          <article
            key={m.id}
            className={`rounded-xl border p-4 ${selected === m.id ? "border-orange-400 bg-orange-50" : "border-stone-200 bg-white"}`}
          >
            <h3 className="font-semibold text-stone-900">{m.name}</h3>
            <p className="text-xs text-stone-500">{m.provider}</p>
            <p className="mt-2 text-sm text-stone-600">{m.notes}</p>
          </article>
        ))}
      </div>

      <div className="flex justify-between">
        <Link to="/agents" className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-stone-700">
          {t("common.back")}
        </Link>
        <Link to="/question" className="rounded-xl bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900">
          {t("stage2.next")}
        </Link>
      </div>
    </div>
  );
}
