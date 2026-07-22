import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchComparisonMatrix, fetchReports } from "@/api";
import { PageAlert, PageHero } from "@/components/PageChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  displayQuestion,
  resolvePreferredSessionId,
  uniqueReportsByQuestion,
} from "@/utils/uniqueReports";

function MatrixTable({ matrix, agents, legend }) {
  if (!matrix?.length) {
    return <p className="text-sm text-slate-400">No matrix data.</p>;
  }

  return (
    <div className="space-y-3">
      {legend && (
        <p className="text-xs text-slate-400">
          <span className="text-emerald-400">answer</span> = from agent text ·{" "}
          <span className="text-amber-300">schema_default</span> = profile default (not from this answer) ·{" "}
          <span className="text-slate-500">missing</span> = not found
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-900/60">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-200">Dimension</th>
              {agents.map((agent) => (
                <th key={agent.agent_key} className="px-4 py-3 font-semibold text-slate-200">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: agent.color || "#78716c" }}
                    />
                    {agent.agent_label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.dimension} className="border-t border-white/10">
                <td className="px-4 py-3 font-medium text-white">{row.label}</td>
                {agents.map((agent) => {
                  const value = row.values[agent.agent_key];
                  const source = row.sources?.[agent.agent_key];
                  const display =
                    typeof value === "boolean" ? (value ? "yes" : "no") : value || "—";
                  return (
                    <td key={agent.agent_key} className="px-4 py-3 align-top text-slate-300">
                      <div>{display}</div>
                      {source && source !== "answer" && row.dimension !== "self_check_passed" && (
                        <div
                          className={`mt-1 text-[10px] uppercase tracking-wide ${
                            source === "schema_default" ? "text-amber-300/80" : "text-slate-600"
                          }`}
                        >
                          {source}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparisonMatrixPage() {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const lastId = sessionStorage.getItem("last_session_id");
    fetchReports()
      .then((list) => {
        const unique = uniqueReportsByQuestion(list);
        setReports(unique);
        const id = resolvePreferredSessionId(list, lastId);
        if (id) setSessionId(id);
        else setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetchComparisonMatrix(sessionId)
      .then((data) => {
        setMatrixData(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero title={t("shell.matrixTitle")} description={t("shell.matrixDesc")} />

      <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display text-white">{t("shell.session")}</CardTitle>
          <CardDescription>{t("shell.matrixDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-300" htmlFor="matrix-session">
              {t("shell.session")}
            </label>
            <select
              id="matrix-session"
              value={sessionId || ""}
              onChange={(e) => setSessionId(Number(e.target.value))}
              className="page-select h-10"
            >
              {reports.map((r) => (
                <option key={r.session_id} value={r.session_id}>
                  #{r.session_id} — {r.question}
                </option>
              ))}
            </select>
            {matrixData?.workflow_mode && (
              <Badge variant="outline" className="border-white/20 text-slate-300">
                {matrixData.workflow_mode}
              </Badge>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-slate-200 hover:bg-white/10"
            >
              <Link to="/report">{t("shell.openReport")}</Link>
            </Button>
          </div>

          {matrixData?.question && (
            <p className="rounded-lg border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-300">
              {displayQuestion(matrixData.question)}
            </p>
          )}
        </CardContent>
      </Card>

      {error && <PageAlert>{error}</PageAlert>}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      ) : matrixData ? (
        <MatrixTable matrix={matrixData.matrix} agents={matrixData.agents} legend={matrixData.legend} />
      ) : (
        <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <CardContent className="py-8 text-center text-sm text-slate-400">
            {t("stage4.noReports")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
