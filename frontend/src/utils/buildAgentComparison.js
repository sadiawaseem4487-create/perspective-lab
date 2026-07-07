import { cleanAgentText, parseAgentResponse, firstActionBlock, firstTextBullet, getSectionBullets } from "./parseAgentResponse";

const SOLUTION_TYPES = {
  freire: {
    en: "Participatory community action",
    pt: "Ação comunitária participativa",
    fi: "Osallistuva yhteisötoiminta",
  },
  weber: {
    en: "Administrative governance system",
    pt: "Sistema administrativo de governança",
    fi: "Hallinnollinen järjestelmä",
  },
  montessori: {
    en: "Learning environment redesign",
    pt: "Redesenho do ambiente de aprendizagem",
    fi: "Oppimisympäristön uudistus",
  },
  rogers: {
    en: "Pilot and diffusion strategy",
    pt: "Estratégia de piloto e difusão",
    fi: "Pilotti- ja leviämisstrategia",
  },
};

const STAKEHOLDERS = {
  freire: {
    en: "Students, families, and community groups",
    pt: "Estudantes, famílias e grupos comunitários",
    fi: "Opiskelijat, perheet ja yhteisöryhmät",
  },
  weber: {
    en: "Teachers, principals, and municipal office",
    pt: "Professores, diretores e secretaria municipal",
    fi: "Opettajat, rehtorit ja kunnan toimisto",
  },
  montessori: {
    en: "Teachers and students in the classroom",
    pt: "Professores e estudantes na sala de aula",
    fi: "Opettajat ja oppilaat luokassa",
  },
  rogers: {
    en: "Pilot school leaders and peer schools",
    pt: "Líderes de escolas piloto e escolas parceiras",
    fi: "Pilottikoulujen johtajat ja vertaiskoulut",
  },
};

function agentKeyFromResponse(response) {
  return (response.agent_key || response.agent_id || "").toLowerCase();
}

export function buildAgentComparison(responses, lang = "en") {
  return (responses || [])
    .filter((r) => r.response && !r.error)
    .map((r) => {
      const key = agentKeyFromResponse(r);
      const { sections } = parseAgentResponse(r.response);
      const action = firstActionBlock(sections);
      const firstAction = action?.action || getSectionBullets(sections, "Priority Actions")[0] || firstTextBullet(sections, "Implementation Steps");
      const successMetric = firstTextBullet(sections, "Success Indicators") || getSectionBullets(sections, "Success Indicators")[0] || "";
      const mainFocus = firstTextBullet(sections, "Problem Diagnosis") || r.theory || r.title || "";

      return {
        agentLabel: r.agent_label || r.agent_name || `Agent ${r.agent_number}`,
        agentKey: key,
        color: r.color || "#78716c",
        mainFocus: mainFocus.slice(0, 160),
        firstAction: (firstAction || "").slice(0, 160),
        mainStakeholder: STAKEHOLDERS[key]?.[lang] || STAKEHOLDERS[key]?.en || action?.owner || "",
        solutionType: SOLUTION_TYPES[key]?.[lang] || SOLUTION_TYPES[key]?.en || r.title || "",
        successMetric: (successMetric || "").slice(0, 160),
      };
    });
}
