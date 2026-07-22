import { cleanAgentText, parseAgentResponse, firstActionBlock, firstTextBullet, getSectionBullets } from "./parseAgentResponse";

const FOCUS_SECTIONS = [
  "Lived experience",
  "Missing voices",
  "Authority map",
  "Authority and rule gaps",
  "Observation",
  "Environment diagnosis",
  "Innovation framing",
  "Adoption barriers and enablers",
  "Problem Diagnosis",
];

const ACTION_SECTIONS = [
  "Collective action",
  "Participatory action plan",
  "Process design",
  "Procedure and accountability plan",
  "Concrete activity",
  "School-day learning plan",
  "Pilot design",
  "Scaling roadmap",
  "Priority Actions",
  "Implementation Steps",
];

function agentKeyFromResponse(response) {
  return (response.agent_key || response.agent_id || "").toLowerCase();
}

function firstFocus(sections, response) {
  for (const title of FOCUS_SECTIONS) {
    const text = firstTextBullet(sections, title);
    if (text) return { text, source: "answer" };
  }
  return { text: response.theory || response.title || "", source: "schema_default" };
}

function firstAction(sections) {
  const action = firstActionBlock(sections);
  if (action?.action) return { text: action.action, owner: action.owner || "", source: "answer" };
  for (const title of ACTION_SECTIONS) {
    const text = getSectionBullets(sections, title)[0];
    if (text) return { text, owner: "", source: "answer" };
  }
  return { text: "", owner: "", source: "missing" };
}

function successMetric(sections) {
  const success = firstTextBullet(sections, "Success Indicators");
  if (success) return { text: success, source: "answer" };
  const uncertainty = firstTextBullet(sections, "Uncertainty");
  if (uncertainty) return { text: uncertainty, source: "answer" };
  const reflection = firstTextBullet(sections, "Reflection");
  if (reflection) return { text: reflection, source: "answer" };
  return { text: "", source: "missing" };
}

/**
 * Build comparison rows from answer text.
 * Stakeholder / solution type are only filled from the answer (Owner / Theory link).
 * Never invent profile stereotypes and present them as findings.
 */
export function buildAgentComparison(responses, lang = "en") {
  return (responses || [])
    .filter((r) => r.response && !r.error)
    .map((r) => {
      const key = agentKeyFromResponse(r);
      const { sections } = parseAgentResponse(r.response);
      const focus = firstFocus(sections, r);
      const action = firstAction(sections);
      const metric = successMetric(sections);
      const theoryLink = firstTextBullet(sections, "Theory link");

      return {
        agentLabel: r.agent_label || r.agent_name || `Agent ${r.agent_number}`,
        agentKey: key,
        color: r.color || "#78716c",
        mainFocus: focus.text.slice(0, 160),
        firstAction: (action.text || "").slice(0, 160),
        mainStakeholder: (action.owner || "").slice(0, 160),
        solutionType: (theoryLink || "").slice(0, 160),
        successMetric: (metric.text || "").slice(0, 160),
        sources: {
          mainFocus: focus.source,
          firstAction: action.source,
          mainStakeholder: action.owner ? "answer" : "missing",
          solutionType: theoryLink ? "answer" : "missing",
          successMetric: metric.source,
        },
      };
    });
}
