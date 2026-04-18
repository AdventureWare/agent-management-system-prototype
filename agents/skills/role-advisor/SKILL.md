---
name: role-advisor
description: Use when deciding which existing role should own a task, goal, workflow, or routing decision in this agent management system, or when determining whether the current role catalog has a real durable gap. Helps compare nearby roles by owned outcome, decision rights, overlap, skills and tool fit, and routing consequences so role advice stays evidence-based and does not drift into role creation, work coordination, or one-off title invention.
---

# Role Advisor

## When to use this skill

- Use this skill when the user wants to know which role should own a task, goal, workflow, or reusable work pattern.
- Use this skill when the user is unsure whether to reuse an existing role or create a new one.
- Use this skill when the problem appears to be role overlap, routing ambiguity, or unclear responsibility boundaries.
- Do not use this skill when the user already knows a real role gap exists and wants the role record authored or updated. Use [../role-creator/SKILL.md](../role-creator/SKILL.md) for that step.
- Do not use this skill when the real problem is missing know-how, tools, MCP access, execution-surface support, or weak task instructions rather than role selection.

## Workflow

1. Clarify what is being routed.
   Capture:
   - the artifact or outcome the work should produce
   - the decision, recommendation, execution, or review responsibility involved
   - whether this is a one-off task or a recurring responsibility pattern
   - what approval, escalation, or trust boundary matters
2. Inspect the current role landscape before recommending anything.
   - Read the current role catalog in `data/control-plane.json`.
   - Look for nearby roles already used by similar tasks, goals, or workflows.
   - Read role fields that materially affect routing: `description`, `skillIds`, `toolIds`, `systemPrompt`, `qualityChecklist`, `approvalPolicy`, and `escalationPolicy`.
3. Compare the nearest roles by responsibility boundary, not by title similarity.
   For each candidate, ask:
   - What outcome does this role own?
   - Is it primarily advisory, deciding, executing, reviewing, or coordinating?
   - What evidence or judgment does it need to produce credible work?
   - Would a task author know when to pick this role over the closest neighbor?
4. Rule out non-role fixes before proposing catalog changes.
   - If the gap is really reusable know-how, create or refine a skill.
   - If the gap is access or execution capability, adjust tools, MCPs, provider choice, or execution surface.
   - If the gap is task wording, tighten the workflow or task instructions instead of minting a new role.
5. Decide `best existing fit` versus `best actual fit`.
   - Prefer an existing role when it can own the work without stretching past its boundary.
   - If no role fits cleanly, name the least-wrong existing fallback and separately state the real gap.
   - Only recommend a new role when the missing responsibility is durable, repeatable, and likely to recur across multiple tasks or workflows.
6. Produce an actionable recommendation.
   - State the chosen existing role or the recommended new-role boundary.
   - Name the closest overlaps and why they are insufficient.
   - Make routing consequences explicit: what improves, what stays risky, and what still needs approval.
   - If a new role is warranted, hand off to [../role-creator/SKILL.md](../role-creator/SKILL.md) with enough specificity that the role can be authored without guessing.

## Reference

- For research-backed principles on decision-role clarity, role ambiguity, and AI advisory behavior, read [references/role-advisor-principles.md](references/role-advisor-principles.md).

## Output shape

- Work to route
- Nearest roles compared
- Best existing fit
- Best actual fit
- Non-role fixes ruled out
- Reuse-versus-create decision
- If creating: proposed responsibility boundary and overlaps

## Project notes

- The role catalog lives in `data/control-plane.json`.
- The `Role` type lives in `src/lib/types/control-plane.ts`.
- This repo already separates role, skill, tool, provider, execution surface, and worker. Preserve those boundaries.
- If the answer is "create or refine the role record," that is a handoff to the `role-creator` skill, not a reason to expand this skill into catalog authoring.

## Failure shields

- Do not recommend a role purely because its title sounds close.
- Do not create roles for one temporary task or one preferred tool.
- Do not collapse advisor, decider, performer, and reviewer into one role unless the catalog explicitly intends that boundary.
- Do not treat a missing skill, provider, or execution mode as proof that a new role is needed.
- Make uncertainty explicit when the work outcome or the current role catalog is too vague to support a clean routing decision.
