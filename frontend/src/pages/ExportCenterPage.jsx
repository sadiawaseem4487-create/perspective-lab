import { Download, FileJson, FileSpreadsheet, Package, Presentation } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { downloadExport, fetchReports, getExportKey, setExportKey } from "@/api";
import { PageAlert, PageHero, PagePanel } from "@/components/PageChrome";
import { useLanguage } from "@/i18n/LanguageContext";
import { uniqueReportsByQuestion } from "@/utils/uniqueReports";

export default function ExportCenterPage() {
  const { t } = useLanguage();
  const [key, setKey] = useState(getExportKey());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showKey, setShowKey] = useState(Boolean(getExportKey()));

  useEffect(() => {
    fetchReports()
      .then((list) => setReports(uniqueReportsByQuestion(list)))
      .catch((err) => setError(err.message));
  }, []);

  async function handleExport(format) {
    setError("");
    setMessage("");
    setLoading(format);
    setExportKey(key.trim());
    try {
      await downloadExport(format);
      setMessage(t("export.done"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  async function downloadSessionBundle() {
    const lastId = sessionStorage.getItem("last_session_id");
    if (!lastId) {
      setError(t("export.noSession"));
      return;
    }
    setLoading("bundle");
    setError("");
    try {
      const res = await fetch(`/api/reports/${lastId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load report");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session_${lastId}_bundle.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(t("export.bundleDone"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        badge={t("export.badge")}
        title={t("export.centerTitle")}
        description={<p className="text-slate-400">{t("export.centerDesc")}</p>}
      />

      {error && <PageAlert>{error}</PageAlert>}
      {message && <PageAlert variant="success">{message}</PageAlert>}

      <PagePanel>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={Boolean(loading)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition-colors hover:border-orange-500/30 hover:bg-orange-500/5 disabled:opacity-50"
          >
            <FileJson className="h-5 w-5 text-orange-400" />
            <span className="font-semibold text-white">{t("export.json")}</span>
            <span className="text-xs text-slate-500">{t("export.jsonHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={Boolean(loading)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-white">{t("export.csv")}</span>
            <span className="text-xs text-slate-500">{t("export.csvHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport("rubric.csv")}
            disabled={Boolean(loading)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition-colors hover:border-violet-500/30 hover:bg-violet-500/5 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-5 w-5 text-violet-400" />
            <span className="font-semibold text-white">{t("export.rubric")}</span>
            <span className="text-xs text-slate-500">{t("export.rubricHint")}</span>
          </button>
          <button
            type="button"
            onClick={downloadSessionBundle}
            disabled={Boolean(loading)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition-colors hover:border-sky-500/30 hover:bg-sky-500/5 disabled:opacity-50"
          >
            <Package className="h-5 w-5 text-sky-400" />
            <span className="font-semibold text-white">{t("export.bundle")}</span>
            <span className="text-xs text-slate-500">{t("export.bundleHint")}</span>
          </button>
        </div>

        <button
          type="button"
          className="mt-4 text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          onClick={() => setShowKey((v) => !v)}
        >
          {showKey ? t("export.hideKey") : t("export.showKey")}
        </button>
        {showKey && (
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="page-input mt-2 w-full"
            placeholder={t("export.keyPh")}
          />
        )}
      </PagePanel>

      <PagePanel>
        <h3 className="font-display text-lg font-semibold text-white">
          {t("export.recent")} ({reports.length})
        </h3>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {reports.slice(0, 12).map((r) => (
            <li
              key={r.session_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-slate-300">
                <span className="font-medium text-orange-300">#{r.session_id}</span>
                <span className="ml-2">{(r.question || "").slice(0, 70)}</span>
              </span>
              <Link
                className="shrink-0 text-orange-300 hover:text-orange-200 hover:underline"
                to={`/present?session=${r.session_id}`}
              >
                {t("nav.present")}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/report" className="page-btn-secondary px-4 py-2 text-sm">
            {t("nav.report")}
          </Link>
          <Link
            to="/present"
            className="page-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Presentation className="h-4 w-4" />
            {t("present.title")}
          </Link>
        </div>
      </PagePanel>
    </div>
  );
}
