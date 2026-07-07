import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAgentsCatalog, fetchAssignments, saveAssignments } from "../api";
import { useLanguage } from "../i18n/LanguageContext";

const EMPTY_CUSTOM = { name: "", theory: "", role: "", prompt: "" };
const CUSTOM_VALUE = "__custom__";

function AgentPromptPanel({ agent, slotLabel, t, isOverride }) {
  if (!agent) return null;
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {slotLabel} — {isOverride ? t("stage1.activeAgent") : t("stage1.selection")}
        </p>
        <h3 className="mt-1 text-xl font-bold text-stone-900">{agent.name}</h3>
        {agent.title && <p className="text-sm font-medium text-stone-600">{agent.title}</p>}
      </div>
      {agent.theory && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("stage1.theory")}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">{agent.theory}</p>
        </div>
      )}
      {agent.role && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("stage1.role")}</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">{agent.role}</p>
        </div>
      )}
      {agent.prompt && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("stage1.prompt")}</p>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-800">
            {agent.prompt}
          </pre>
        </div>
      )}
    </div>
  );
}

function buildCustomAgent(slotKey, fields) {
  const name = fields.name.trim() || `Custom Agent (${slotKey})`;
  return {
    id: `custom:${slotKey}`,
    name,
    title: "Custom Agent",
    theory: fields.theory.trim(),
    role: fields.role.trim(),
    prompt: fields.prompt.trim(),
    color: "#57534e",
  };
}

function isMainAgentForSlot(agentId, slotKey, slotDefaults, mainIds) {
  return mainIds.has(agentId) && slotDefaults[slotKey] === agentId;
}

function toDropdownValue(agentId, slotKey, slotDefaults, mainIds) {
  if (!agentId) return "";
  if (String(agentId).startsWith("custom:")) return CUSTOM_VALUE;
  if (isMainAgentForSlot(agentId, slotKey, slotDefaults, mainIds)) return "";
  return agentId;
}

export default function Stage1Agents() {
  const { t } = useLanguage();
  const [agentMap, setAgentMap] = useState({});
  const [slotDefaults, setSlotDefaults] = useState({
    agent_1: "freire",
    agent_2: "weber",
    agent_3: "montessori",
    agent_4: "rogers",
  });
  const [optionalByCategory, setOptionalByCategory] = useState({});
  const [perspectiveLabels, setPerspectiveLabels] = useState({});
  const [assignments, setAssignments] = useState({
    agent_1: "freire",
    agent_2: "weber",
    agent_3: "montessori",
    agent_4: "rogers",
  });
  const [dropdownValues, setDropdownValues] = useState({
    agent_1: "",
    agent_2: "",
    agent_3: "",
    agent_4: "",
  });
  const [customAgents, setCustomAgents] = useState({
    agent_1: { ...EMPTY_CUSTOM },
    agent_2: { ...EMPTY_CUSTOM },
    agent_3: { ...EMPTY_CUSTOM },
    agent_4: { ...EMPTY_CUSTOM },
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const mainIds = useMemo(() => new Set(Object.values(slotDefaults)), [slotDefaults]);

  const SLOTS = useMemo(
    () => [
      { key: "agent_1", label: `${t("stage1.slot")} 1` },
      { key: "agent_2", label: `${t("stage1.slot")} 2` },
      { key: "agent_3", label: `${t("stage1.slot")} 3` },
      { key: "agent_4", label: `${t("stage1.slot")} 4` },
    ],
    [t]
  );

  useEffect(() => {
    Promise.all([fetchAgentsCatalog(), fetchAssignments()])
      .then(([catalogData, assignmentData]) => {
        const map = {};
        (catalogData.agents || []).forEach((agent) => {
          map[agent.id] = agent;
        });

        const defaults = catalogData.slot_defaults || {
          agent_1: "freire",
          agent_2: "weber",
          agent_3: "montessori",
          agent_4: "rogers",
        };
        const labels = {};
        (catalogData.perspective_types || []).forEach((item) => {
          labels[item.id] = item.label;
        });

        setAgentMap(map);
        setSlotDefaults(defaults);
        setOptionalByCategory(catalogData.optional_agents_by_category || {});
        setPerspectiveLabels(labels);

        const savedCustom = assignmentData.custom_agents || {};
        const nextCustom = {
          agent_1: { ...EMPTY_CUSTOM, ...savedCustom.agent_1 },
          agent_2: { ...EMPTY_CUSTOM, ...savedCustom.agent_2 },
          agent_3: { ...EMPTY_CUSTOM, ...savedCustom.agent_3 },
          agent_4: { ...EMPTY_CUSTOM, ...savedCustom.agent_4 },
        };
        setCustomAgents(nextCustom);

        const savedAssignments = { ...defaults, ...assignmentData.assignments };
        setAssignments(savedAssignments);

        const nextDropdown = {};
        SLOTS.forEach(({ key }) => {
          nextDropdown[key] = toDropdownValue(
            savedAssignments[key],
            key,
            defaults,
            new Set(Object.values(defaults))
          );
        });
        setDropdownValues(nextDropdown);
      })
      .catch(console.error);
  }, [SLOTS]);

  function handleDropdownChange(slotKey, value) {
    setDropdownValues((prev) => ({ ...prev, [slotKey]: value }));

    if (value === CUSTOM_VALUE) {
      setAssignments((prev) => ({ ...prev, [slotKey]: `custom:${slotKey}` }));
      return;
    }

    if (!value) {
      setAssignments((prev) => ({ ...prev, [slotKey]: slotDefaults[slotKey] }));
      return;
    }

    setAssignments((prev) => ({ ...prev, [slotKey]: value }));
  }

  function handleCustomChange(slotKey, field, value) {
    setCustomAgents((prev) => ({
      ...prev,
      [slotKey]: { ...prev[slotKey], [field]: value },
    }));
    setDropdownValues((prev) => ({ ...prev, [slotKey]: CUSTOM_VALUE }));
    setAssignments((prev) => ({ ...prev, [slotKey]: `custom:${slotKey}` }));
  }

  function resolveActiveAgent(slotKey) {
    const dropdown = dropdownValues[slotKey];
    if (dropdown === CUSTOM_VALUE) {
      const custom = customAgents[slotKey];
      if (!custom?.prompt?.trim()) return null;
      return buildCustomAgent(slotKey, custom);
    }
    if (!dropdown) {
      return agentMap[slotDefaults[slotKey]] || null;
    }
    return agentMap[dropdown] || null;
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const payload = { ...assignments };
      const customPayload = {};
      SLOTS.forEach(({ key }) => {
        if (dropdownValues[key] === CUSTOM_VALUE) {
          payload[key] = `custom:${key}`;
          customPayload[key] = customAgents[key];
        } else if (!dropdownValues[key]) {
          payload[key] = slotDefaults[key];
        }
      });
      await saveAssignments({ ...payload, custom_agents: customPayload });
      setMessage(t("stage1.saved"));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">{t("stage1.badge")}</p>
        <h2 className="font-display text-3xl font-bold text-stone-900">{t("stage1.title")}</h2>
        <p className="mt-2 text-stone-600">{t("stage1.desc")}</p>
      </section>

      <div className="space-y-6">
        {SLOTS.map((slot) => {
          const defaultAgent = agentMap[slotDefaults[slot.key]];
          const activeAgent = resolveActiveAgent(slot.key);
          const isOverride = Boolean(dropdownValues[slot.key]);
          const borderColor = defaultAgent?.color || "#e7e5e4";

          return (
            <section
              key={slot.key}
              className="rounded-2xl border bg-white p-6 shadow-sm"
              style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
            >
              <p className="text-sm font-semibold text-stone-800">{slot.label}</p>

              {defaultAgent && (
                <article
                  className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
                  style={{ borderTopWidth: 4, borderTopColor: defaultAgent.color }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("stage1.defaultAgent")}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">{defaultAgent.name}</h3>
                  <p className="mt-1 text-xs font-medium text-stone-500">{defaultAgent.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{defaultAgent.theory}</p>
                </article>
              )}

              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {t("stage1.optionalAgent")}
                </label>
                <select
                  value={dropdownValues[slot.key]}
                  onChange={(e) => handleDropdownChange(slot.key, e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 md:max-w-xl"
                >
                  <option value="">
                    {t("stage1.keepDefaultShort")}
                  </option>
                  {Object.entries(optionalByCategory).map(([category, agents]) =>
                    agents.length > 0 ? (
                      <optgroup key={category} label={perspectiveLabels[category] || category}>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null
                  )}
                  <option value={CUSTOM_VALUE}>{t("stage1.customAgent")}</option>
                </select>
              </div>

              {dropdownValues[slot.key] === CUSTOM_VALUE && (
                <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
                  <input
                    value={customAgents[slot.key].name}
                    onChange={(e) => handleCustomChange(slot.key, "name", e.target.value)}
                    placeholder={t("stage1.customName")}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={customAgents[slot.key].theory}
                    onChange={(e) => handleCustomChange(slot.key, "theory", e.target.value)}
                    placeholder={t("stage1.customTheory")}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={customAgents[slot.key].role}
                    onChange={(e) => handleCustomChange(slot.key, "role", e.target.value)}
                    placeholder={t("stage1.customRole")}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={customAgents[slot.key].prompt}
                    onChange={(e) => handleCustomChange(slot.key, "prompt", e.target.value)}
                    placeholder={t("stage1.customPrompt")}
                    rows={6}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {isOverride && activeAgent && (
                <AgentPromptPanel
                  agent={activeAgent}
                  slotLabel={slot.label}
                  t={t}
                  isOverride
                />
              )}

              {!isOverride && defaultAgent && (
                <AgentPromptPanel agent={defaultAgent} slotLabel={slot.label} t={t} isOverride={false} />
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900 disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("stage1.saveAssignments")}
        </button>
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </div>

      <div className="flex justify-end">
        <Link to="/models" className="rounded-xl bg-orange-800 px-6 py-3 font-semibold text-white hover:bg-orange-900">
          {t("stage1.next")}
        </Link>
      </div>
    </div>
  );
}
