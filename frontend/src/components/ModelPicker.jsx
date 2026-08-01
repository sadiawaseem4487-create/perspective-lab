import { useEffect, useMemo, useState } from "react";
import { fetchModelsCatalog } from "@/api";

/**
 * Searchable model picker. Loads the live OpenRouter catalog (or OpenAI static list).
 */
export function ModelPicker({
  provider = "openrouter",
  value,
  onChange,
  disabled = false,
}) {
  const [models, setModels] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchModelsCatalog(provider)
      .then((data) => {
        if (cancelled) return;
        const list = data.models || [];
        setModels(list);
        setSource(data.source || "");
        // Keep current value; if empty, pick recommended/default
        if (!value && list.length) {
          const recommended = list.find((m) => m.recommended) || list[0];
          if (recommended?.id) onChange?.(recommended.id);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load models");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => {
      const hay = `${m.id} ${m.name} ${m.provider} ${m.notes || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [models, query]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = m.provider || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-2">
      <input
        type="search"
        className="page-input w-full"
        placeholder={
          provider === "openrouter"
            ? "Search OpenRouter models (Claude, Gemini, Llama…)"
            : "Search OpenAI models"
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled || loading}
        autoComplete="off"
      />
      <select
        className="page-select w-full"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || loading || !models.length}
        size={Math.min(12, Math.max(6, Math.min(filtered.length || 6, 12)))}
      >
        {loading && <option value="">Loading models…</option>}
        {!loading && !filtered.length && <option value="">No models match</option>}
        {groups.map(([providerName, items]) => (
          <optgroup key={providerName} label={providerName}>
            {items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.recommended ? "★ " : ""}
                {m.name} — {m.id}
                {m.notes ? ` (${m.notes})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-xs text-slate-500">
        {loading
          ? "Loading catalog…"
          : source === "openrouter"
            ? `${models.length} models from OpenRouter — pick any provider.`
            : source === "static"
              ? "OpenAI direct models."
              : `${models.length} models (cached / fallback list).`}
        {error ? ` ${error}` : ""}
      </p>
    </div>
  );
}
