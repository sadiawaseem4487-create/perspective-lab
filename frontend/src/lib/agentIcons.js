import { Brain, Building2, Rocket, Sprout } from "lucide-react";

export const AGENT_ICONS = {
  freire: Brain,
  weber: Building2,
  montessori: Sprout,
  rogers: Rocket,
};

export const AGENT_THEORIST = {
  freire: "Paulo Freire",
  weber: "Max Weber",
  montessori: "Maria Montessori",
  rogers: "Everett Rogers",
};

export const AGENT_LENS = {
  freire: { en: "Voice & participation", pt: "Voz e participação", fi: "Ääni ja osallistuminen" },
  weber: { en: "Rules & accountability", pt: "Regras e responsabilidade", fi: "Säännöt ja vastuu" },
  montessori: { en: "Environment & autonomy", pt: "Ambiente e autonomia", fi: "Ympäristö ja autonomia" },
  rogers: { en: "Adoption & scaling", pt: "Adoção e escala", fi: "Omaksuminen ja laajennus" },
};

export function getAgentIcon(agentKey) {
  return AGENT_ICONS[(agentKey || "").toLowerCase()] || Brain;
}

export function getAgentTheorist(agentKey) {
  return AGENT_THEORIST[(agentKey || "").toLowerCase()] || "";
}

export function getAgentLens(agentKey, lang = "en") {
  const key = (agentKey || "").toLowerCase();
  return AGENT_LENS[key]?.[lang] || AGENT_LENS[key]?.en || "";
}
