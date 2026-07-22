# Problem-solving rubric (Sprint 9 scaffold)

Research question: *Can people become better problem solvers by using agentic AI based on different theoretical perspectives?*

This page defines a **measurement scaffold**. Scoring UI/API is planned; do not claim causal results until instruments are live.

## Dimensions (human-coded)

| ID | Dimension | 1 | 3 | 5 |
|----|-----------|---|---|---|
| PS1 | Problem framing | Vague / generic | Clear problem statement | Theory-informed framing with named actors |
| PS2 | Perspective diversity | Single lens | Mentions multiple views | Integrates ≥2 theory lenses deliberately |
| PS3 | Actionability | Vague advice | Specific actions | Actions with owner, timeline, measure |
| PS4 | Assumptions | None stated | Implicit | Explicit assumptions + limits |
| PS5 | Uncertainty | Overconfident | Some caveats | Clear unknowns and next evidence needed |
| PS6 | Theory fidelity | Buzzwords only | Partial alignment | Reasoning matches the chosen theory’s process |

## Conditions (future study design)

1. **Baseline** — human alone, same research question  
2. **Single agent** — one theory agent  
3. **Parallel multi-theory** — four agents, independent  
4. **Sequential chain** — Freire → Weber → Montessori → Rogers  

## Capture fields (future API)

```json
{
  "session_id": 0,
  "participant_id": "",
  "condition": "baseline|single|parallel|sequential",
  "pre_solution": "",
  "post_solution": "",
  "scores": { "PS1": 0, "PS2": 0, "PS3": 0, "PS4": 0, "PS5": 0, "PS6": 0 },
  "coder_id": "",
  "notes": ""
}
```

## Status

- [x] Rubric defined in wiki (Sprint 9.6.1)
- [x] Persist scores via API (`GET/POST /api/comparison/{id}/rubric`)
- [x] Researcher scoring UI (Compare page — `RubricScorePanel`)
- [ ] Inter-rater reliability workflow

[← Sprint 9](Sprints/Sprint-09-Research-Integrity.md)
