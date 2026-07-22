# Problem-solving rubric

Research question: *Can people become better problem solvers by using agentic AI based on different theoretical perspectives?*

This page defines the **measurement instrument**. Scores are stored in the case pack and can be exported as CSV for analysis. Do **not** claim causal results until a study protocol is run with adequate N and inter-rater checks.

## Dimensions (human-coded)

| ID | Dimension | 1 | 3 | 5 |
|----|-----------|---|---|---|
| PS1 | Problem framing | Vague / generic | Clear problem statement | Theory-informed framing with named actors |
| PS2 | Perspective diversity | Single lens | Mentions multiple views | Integrates ≥2 theory lenses deliberately |
| PS3 | Actionability | Vague advice | Specific actions | Actions with owner, timeline, measure |
| PS4 | Assumptions | None stated | Implicit | Explicit assumptions + limits |
| PS5 | Uncertainty | Overconfident | Some caveats | Clear unknowns and next evidence needed |
| PS6 | Theory fidelity | Buzzwords only | Partial alignment | Reasoning matches the chosen theory’s process |

## Conditions

1. **Baseline** — human alone, same research question  
2. **Single agent** — one theory agent  
3. **Parallel multi-theory** — four agents, independent  
4. **Sequential chain** — Freire → Weber → Montessori → Rogers  

## API & UI (live)

| Surface | Endpoint / location |
|---------|---------------------|
| Get / save scores | `GET/POST /api/comparison/{session_id}/rubric` |
| Multi-coder ratings | Stored as `ratings[]` with `inter_rater` stats |
| Researcher UI | Compare page → **Problem-solving rubric** panel |
| Bulk export | `GET /api/export/rubric.csv` (same export key as other exports) |
| Files | `cases/{case_id}/rubric_scores/session_{id}.json` |

### Capture shape

```json
{
  "session_id": 0,
  "participant_id": "",
  "condition": "baseline|single|parallel|sequential",
  "pre_solution": "",
  "post_solution": "",
  "scores": { "PS1": 0, "PS2": 0, "PS3": 0, "PS4": 0, "PS5": 0, "PS6": 0 },
  "coder_id": "",
  "ratings": [],
  "inter_rater": { "coder_count": 0, "exact_agreement": null, "mean_abs_diff": null },
  "notes": ""
}
```

## Status

- [x] Rubric defined in wiki
- [x] Persist scores via API
- [x] Researcher scoring UI (`RubricScorePanel`)
- [x] Inter-rater multi-coder workflow + agreement stats
- [x] CSV export for analysis

[← Sprint 9](Sprints/Sprint-09-Research-Integrity.md) · [Facilitator Checklist](Facilitator-Checklist.md)
