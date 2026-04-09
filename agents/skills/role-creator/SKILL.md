---
name: role-creator
description: Use when creating or refining a Role in this agent management system. Helps agents define a role as a responsibility contract, avoid duplicate or mis-scoped roles, choose the right area, map installed skills and integrations correctly, and write operational fields like systemPrompt, qualityChecklist, approvalPolicy, and escalationPolicy so the role improves routing and launch context.
---

# role-creator

## When to use this skill

- Use this skill when the user wants a new role added, an existing role revised, or a vague role cleaned up.
- Use this skill when the task is really about the role catalog in `/app/roles` or the role records in the control-plane data.
- Use this skill when you need to decide which `skillIds`, `toolIds`, `mcpIds`, prompt instructions, or review rules belong on a role.
- Do not use this skill when the user actually needs:
  - a new project skill under `.agents/skills`
  - a provider or execution-surface change
  - a task edit instead of a reusable specialization

## Workflow

1. Confirm that a role is the right object.
   - In this project, a role is a responsibility contract for work.
   - It is not the worker, not the tool, not the MCP, and not the skill itself.
   - If the request is really about reusable know-how, create or refine a skill instead.
2. Inspect the current role landscape before authoring anything.
   - Read the existing roles in `data/control-plane.json`.
   - Check the role schema and creation flow in [references/role-shape.md](references/role-shape.md) if exact field behavior matters.
   - Look for nearby tasks, goals, and execution surfaces so you can see whether the new role fills a real gap or just renames an existing one.
3. Design one clear responsibility contract.
   - Write the role around owned work outcomes, not around a single tool or one temporary task.
   - Pick a human-readable name a task can sensibly request, such as `Technical Writer`, `Security Reviewer`, or `Research Coordinator`.
   - Choose `area` from `shared`, `product`, `growth`, or `ops`.
   - Use `shared` when the role spans multiple lanes or acts as common infrastructure.
4. Fill each field intentionally.
   - `description`: one sentence about what this role is responsible for producing or deciding.
   - `skillIds`: only include installed skills that materially improve this role. Do not invent ids.
   - `toolIds`: list execution tools or modes the role should prefer first.
   - `mcpIds`: list only integrations the role genuinely depends on.
   - `systemPrompt`: add role-specific operating instructions that should influence task launches. Keep it specific and non-generic.
   - `qualityChecklist`: add 3-6 short checks that make output review easier.
   - `approvalPolicy`: add only when this role has a real approval gate or review requirement.
   - `escalationPolicy`: name concrete reasons to escalate, not generic uncertainty language.
5. Pressure-test the role before saving it.
   - Ask whether a task author would know when to choose this role over the closest existing role.
   - Check whether the role overlaps too heavily with another role and should instead be a refinement of that record.
   - Check whether the role names a responsibility contract or merely bundles capabilities, tools, or access.
6. Implement the change and validate the result.
   - Create or update the role in the relevant project file or control-plane path instead of leaving only a proposal, unless the user asked for brainstorming only.
   - Re-read the stored role and confirm the list fields normalized cleanly.
   - If you add `skillIds`, confirm those skills actually exist in the project or installed-skill set.
   - If the role changes routing expectations, note whether any execution surface currently supports it.

## Project notes

- The `Role` type lives in `src/lib/types/control-plane.ts`.
- Role create and update validation lives in `src/routes/app/roles/+page.server.ts`.
- Task launch context includes role description, system prompt, skills, tools, and MCPs, so these fields directly influence execution quality.
- This repo explicitly separates role, capability, tool, provider, and worker. Keep those boundaries intact.
- Prefer fewer, sharper roles over many overlapping variants.
- Good roles improve routing and launch context. Bad roles are just renamed tasks or generic access bundles.
