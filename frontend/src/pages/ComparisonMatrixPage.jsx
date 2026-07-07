import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchComparisonMatrix, fetchReports } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";

function MatrixTable({ matrix, agents }) {
  if (!matrix?.length) {
    return <p className="text-sm text-muted-foreground">No matrix data.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Dimension</th>
            {agents.map((agent) => (
              <th key={agent.agent_key} className="px-4 py-3 font-semibold">
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
            <tr key={row.dimension} className="border-t">
              <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
              {agents.map((agent) => (
                <td key={agent.agent_key} className="px-4 py-3 align-top text-muted-foreground">
                  {row.values[agent.agent_key] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
        setReports(list);
        const id = lastId ? Number(lastId) : list[0]?.session_id;
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t("shell.matrixTitle")}</CardTitle>
          <CardDescription>{t("shell.matrixDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium" htmlFor="matrix-session">
              {t("shell.session")}
            </label>
            <select
              id="matrix-session"
              value={sessionId || ""}
              onChange={(e) => setSessionId(Number(e.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {reports.map((r) => (
                <option key={r.session_id} value={r.session_id}>
                  #{r.session_id} — {r.question?.slice(0, 60)}
                </option>
              ))}
            </select>
            {matrixData?.workflow_mode && (
              <Badge variant="outline">{matrixData.workflow_mode}</Badge>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/report">{t("shell.openReport")}</Link>
            </Button>
          </div>

          {matrixData?.question && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">{matrixData.question}</p>
          )}
        </CardContent>
      </Card>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : matrixData ? (
        <MatrixTable matrix={matrixData.matrix} agents={matrixData.agents} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("stage4.noReports")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
