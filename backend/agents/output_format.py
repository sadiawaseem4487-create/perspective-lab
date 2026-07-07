OUTPUT_FORMAT_INSTRUCTIONS = """
STRICT OUTPUT FORMAT (follow exactly):

Length: 300-450 words maximum. Short paragraphs and bullets only. Not an essay.

Language: Write ALL content in the same language as the user's question. Section titles below must stay in English exactly as written. Do not mix languages.

Plain text only in content. Do NOT use markdown: no ###, no **, no ---, no tables.

Use exactly these 7 section titles on their own line (statement headings, never questions):
Problem Diagnosis
Theory-Based Reasoning
Priority Actions
Implementation Steps
Risks and Limitations
Success Indicators
Final Recommendation

Under Problem Diagnosis, Theory-Based Reasoning, Implementation Steps, Risks and Limitations, Success Indicators, and Final Recommendation:
- Use short bullet points starting with "- " (max 5 bullets per section).

Under Priority Actions:
- Use 2-4 structured action blocks (not a table).
- Each block must use these four lines exactly:
Action: [what to do]
Owner: [who does it]
Timeline: [when]
Measure: [how success is tracked]
- Leave one blank line between action blocks.

Every recommendation must state: what to do, who does it, when, why the theory supports it, and how success is measured.

Do not invent statistics. If information is missing, add: Missing information: [what is needed].

Quality check before finishing (revise if any fail):
1. Specific, not generic
2. Logically ordered
3. Clearly connected to the agent's theory
4. Followable steps
5. Measurable success indicators
6. Consistent language throughout
"""
