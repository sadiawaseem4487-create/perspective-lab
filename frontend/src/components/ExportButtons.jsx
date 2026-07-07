import { useState } from "react";
import { downloadExport, getExportKey, setExportKey } from "../api";
import { useLanguage } from "../i18n/LanguageContext";

export function ExportButtons() {
  const { t } = useLanguage();
  const [key, setKey] = useState(getExportKey());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  async function handleExport(format) {
    setError("");
    setLoading(format);
    setExportKey(key.trim());
    try {
      await downloadExport(format);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t("export.keyPh")}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => handleExport("json")}
          disabled={loading !== ""}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading === "json" ? t("export.downloading") : t("export.json")}
        </button>
        <button
          type="button"
          onClick={() => handleExport("csv")}
          disabled={loading !== ""}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {loading === "csv" ? t("export.downloading") : t("export.csv")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
