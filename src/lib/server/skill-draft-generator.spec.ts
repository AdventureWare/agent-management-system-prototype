import { describe, expect, it } from 'vitest';
import { getSkillDraftQualityIssues, type SkillDraftPromptInput } from './skill-draft-generator';

const baseInput: SkillDraftPromptInput = {
	cwd: '/tmp/project',
	projectName: 'Agent Management System Prototype',
	projectSummary: 'Tooling for tasks, threads, and execution context.',
	skillId: 'task-thread-context',
	intendedUse: 'Improve task-thread context handling for launch planning and prompts.',
	installedSkillNames: ['docs-writer', 'frontend-sveltekit'],
	relatedTasks: [
		{
			title: 'Show launch context before run starts',
			summary: 'Expose thread context, prompt skills, and launch planning on the task detail page.',
			requiredPromptSkillNames: ['docs-writer'],
			requiredToolNames: ['codex']
		}
	],
	projectContextSignals: {
		topLevelEntries: ['dir:src', 'dir:data', 'file:AGENTS.md', 'file:package.json'],
		packageSummary: [
			'package name: agent-management-system-prototype',
			'scripts: check, test:unit'
		],
		referenceExcerpts: [],
		skillExamples: []
	}
};

describe('getSkillDraftQualityIssues', () => {
	it('flags generic template-like drafts', () => {
		const issues = getSkillDraftQualityIssues(baseInput, {
			description: 'Project-specific guidance for this area.',
			bodyMarkdown: `# task-thread-context

## When to use this skill

- Use this skill when the task repeatedly needs project-specific guidance in this area.

## Workflow

1. Inspect the relevant project files and current task context before making changes.
2. Apply the project-specific constraints, patterns, or review checklist captured here.

## Project notes

- Keep this file concise and move large references into sibling files only when needed.`,
			changeSummary: 'Generated an initial draft.',
			referenceFiles: [],
			scriptFiles: []
		});

		expect(issues).toEqual(
			expect.arrayContaining([expect.stringContaining('generic placeholder language')])
		);
		expect(issues.length).toBeGreaterThan(0);
	});

	it('accepts grounded drafts with concrete workflow steps', () => {
		const issues = getSkillDraftQualityIssues(baseInput, {
			description:
				'Use when a task needs tighter task-thread launch context, prompt-skill handoff, or task detail execution guidance.',
			bodyMarkdown: `# task-thread-context

## When to use this skill

- Use this skill when you are changing task launch planning, thread prompt assembly, or task-detail launch context in the agent management system prototype.
- Reach for it when the work touches task detail pages, prompt-skill selection, launch preflight, or thread runtime context.

## Workflow

1. Inspect task launch code in \`src/lib/server/task-launch-planning.ts\`, thread prompt assembly in \`src/lib/server/task-threads.ts\`, and the task detail surfaces under \`src/routes/app/tasks\`.
2. Compare the requested task context against what the launch summary and prompt actually carry forward, especially prompt skills, role context, and execution requirements.
3. Update the relevant task-detail or launch-planning surface and verify the change with \`npx svelte-check --tsconfig ./tsconfig.json\` plus the targeted server tests.

## Project notes

- This project already tracks launch context, prompt skills, and execution fit on task detail pages, so prefer extending those surfaces instead of inventing parallel state.
- Keep launch-context wording aligned with task, thread, and run terminology already used in the control plane.`,
			changeSummary: 'Tightened the trigger and grounded the workflow in real project surfaces.',
			referenceFiles: [],
			scriptFiles: []
		});

		expect(issues).toEqual([]);
	});
});
