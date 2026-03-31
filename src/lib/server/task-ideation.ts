import type { AgentSessionDetail } from '$lib/types/agent-session';
import {
	TASK_STATUS_OPTIONS,
	formatTaskStatusLabel,
	type ControlPlaneData,
	type Project,
	type Run,
	type Task
} from '$lib/types/control-plane';
import { projectMatchesPath } from '$lib/server/control-plane';

const MAX_OTHER_PROJECTS = 6;
const MAX_ACTIVE_TASKS = 10;
const MAX_COMPLETED_TASKS = 6;
const MAX_RECENT_RUNS = 8;
const TASK_IDEATION_THREAD_PREFIX = 'Task ideation: ';

export type IdeationTaskSuggestion = {
	index: number;
	title: string;
	whyItMatters: string;
	suggestedInstructions: string;
	signals: string;
	confidence: 'high' | 'medium' | 'low';
};

function compactText(value: string, fallback: string) {
	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized || fallback;
}

function formatConfiguredValue(value: string) {
	return value || 'Not configured';
}

function formatTaskLine(task: Task, runSummary: Run | null) {
	const flags = [
		formatTaskStatusLabel(task.status),
		`priority ${task.priority}`,
		`risk ${task.riskLevel}`,
		`runs ${task.runCount}`
	];

	if (task.blockedReason) {
		flags.push(`blocker ${compactText(task.blockedReason, 'not recorded')}`);
	}

	return [
		`- ${task.title} (${flags.join(', ')})`,
		`  Summary: ${compactText(task.summary, 'No summary recorded.')}`,
		`  Latest run: ${runSummary ? compactText(runSummary.summary, 'No summary recorded.') : 'No runs yet.'}`
	].join('\n');
}

function formatRunLine(run: Run, taskMap: Map<string, Task>) {
	const taskTitle = taskMap.get(run.taskId)?.title ?? run.taskId;
	const summary =
		compactText(run.summary, '') || compactText(run.errorSummary, '') || 'No summary recorded.';

	return `- ${taskTitle} (${run.status}, ${run.updatedAt}): ${summary}`;
}

export function buildProjectTaskIdeationThreadName(projectName: string) {
	return `${TASK_IDEATION_THREAD_PREFIX}${projectName}`;
}

export function getProjectTaskIdeationWorkspace(project: Project) {
	return project.projectRootFolder || project.defaultRepoPath || '';
}

export function findProjectTaskIdeationThread(
	project: Project,
	sessions: AgentSessionDetail[]
): AgentSessionDetail | null {
	const expectedName = buildProjectTaskIdeationThreadName(project.name);

	return (
		[...sessions]
			.filter(
				(session) => session.name === expectedName && projectMatchesPath(project, session.cwd)
			)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
	);
}

export function findProjectForTaskIdeationThread(
	session: Pick<AgentSessionDetail, 'name' | 'cwd'>,
	projects: Project[]
): Project | null {
	return (
		projects
			.filter(
				(project) =>
					session.name === buildProjectTaskIdeationThreadName(project.name) &&
					projectMatchesPath(project, session.cwd)
			)
			.sort((left, right) => {
				const leftLength = getProjectTaskIdeationWorkspace(left).length;
				const rightLength = getProjectTaskIdeationWorkspace(right).length;
				return rightLength - leftLength;
			})[0] ?? null
	);
}

function pushFieldLine(record: Record<string, string[]>, key: keyof typeof record, value: string) {
	record[key].push(value);
}

function finalizeSuggestion(
	index: number,
	record: Record<
		'title' | 'whyItMatters' | 'suggestedInstructions' | 'signals' | 'confidence',
		string[]
	>
): IdeationTaskSuggestion | null {
	const title = record.title.join('\n').trim();
	const whyItMatters = record.whyItMatters.join('\n').trim();
	const suggestedInstructions = record.suggestedInstructions.join('\n').trim();
	const signals = record.signals.join('\n').trim();
	const confidenceValue = record.confidence.join('\n').trim().toLowerCase();

	if (!title || !whyItMatters || !suggestedInstructions || !signals) {
		return null;
	}

	if (confidenceValue !== 'high' && confidenceValue !== 'medium' && confidenceValue !== 'low') {
		return null;
	}

	return {
		index,
		title,
		whyItMatters,
		suggestedInstructions,
		signals,
		confidence: confidenceValue
	};
}

export function parseIdeationTaskSuggestions(message: string): IdeationTaskSuggestion[] {
	const normalized = message.replace(/\r\n/g, '\n').trim();

	if (!normalized) {
		return [];
	}

	const suggestions: IdeationTaskSuggestion[] = [];
	let current: Record<
		'title' | 'whyItMatters' | 'suggestedInstructions' | 'signals' | 'confidence',
		string[]
	> | null = null;
	let currentField:
		| 'title'
		| 'whyItMatters'
		| 'suggestedInstructions'
		| 'signals'
		| 'confidence'
		| null = null;

	for (const rawLine of normalized.split('\n')) {
		const line = rawLine.trimEnd();

		if (!line.trim() && current && currentField) {
			pushFieldLine(current, currentField, '');
			continue;
		}

		const titleMatch = /^Title:\s*(.+?)\s*$/.exec(line);
		if (titleMatch) {
			const previous = current ? finalizeSuggestion(suggestions.length, current) : null;
			if (previous) {
				suggestions.push(previous);
			}

			current = {
				title: [titleMatch[1]],
				whyItMatters: [],
				suggestedInstructions: [],
				signals: [],
				confidence: []
			};
			currentField = 'title';
			continue;
		}

		if (!current) {
			continue;
		}

		const whyMatch = /^Why it matters:\s*(.*)$/.exec(line);
		if (whyMatch) {
			currentField = 'whyItMatters';
			pushFieldLine(current, currentField, whyMatch[1]);
			continue;
		}

		const instructionsMatch = /^Suggested instructions:\s*(.*)$/.exec(line);
		if (instructionsMatch) {
			currentField = 'suggestedInstructions';
			pushFieldLine(current, currentField, instructionsMatch[1]);
			continue;
		}

		const signalsMatch = /^Signals from history\/context:\s*(.*)$/.exec(line);
		if (signalsMatch) {
			currentField = 'signals';
			pushFieldLine(current, currentField, signalsMatch[1]);
			continue;
		}

		const confidenceMatch = /^Confidence:\s*(.*)$/.exec(line);
		if (confidenceMatch) {
			currentField = 'confidence';
			pushFieldLine(current, currentField, confidenceMatch[1]);
			continue;
		}

		if (currentField) {
			pushFieldLine(current, currentField, line);
		}
	}

	const finalSuggestion = current ? finalizeSuggestion(suggestions.length, current) : null;
	if (finalSuggestion) {
		suggestions.push(finalSuggestion);
	}

	return suggestions;
}

export function buildProjectTaskIdeationPrompt(input: {
	data: ControlPlaneData;
	project: Project;
}) {
	const { data, project } = input;
	const relatedTasks = [...data.tasks]
		.filter((task) => task.projectId === project.id)
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const relatedTaskIds = new Set(relatedTasks.map((task) => task.id));
	const relatedRuns = [...data.runs]
		.filter((run) => relatedTaskIds.has(run.taskId))
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const latestRunByTaskId = new Map<string, Run>();

	for (const run of relatedRuns) {
		if (!latestRunByTaskId.has(run.taskId)) {
			latestRunByTaskId.set(run.taskId, run);
		}
	}

	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const taskMap = new Map(relatedTasks.map((task) => [task.id, task]));
	const otherProjects = data.projects
		.filter((candidate) => candidate.id !== project.id)
		.slice(0, MAX_OTHER_PROJECTS);
	const relatedGoals = data.goals
		.filter((goal) => relatedTasks.some((task) => task.goalId === goal.id))
		.sort((left, right) => left.name.localeCompare(right.name));
	const openTasks = relatedTasks
		.filter((task) => task.status !== 'done')
		.slice(0, MAX_ACTIVE_TASKS);
	const completedTasks = relatedTasks
		.filter((task) => task.status === 'done')
		.slice(0, MAX_COMPLETED_TASKS);
	const recentRuns = relatedRuns.slice(0, MAX_RECENT_RUNS);
	const mostRecentTaskWithGoal = relatedTasks.find((task) => task.goalId);
	const statusCounts = TASK_STATUS_OPTIONS.map((status) => {
		const count = relatedTasks.filter((task) => task.status === status).length;
		return count > 0 ? `${formatTaskStatusLabel(status)} ${count}` : null;
	}).filter((entry): entry is string => Boolean(entry));

	return [
		'You are the task ideation assistant for the agent management system.',
		'',
		'Your job is to inspect the target project and propose additional useful tasks to create next.',
		'Use the repository, nearby docs, and the context below to find real gaps, follow-on work, recurring friction, and missing product or engineering tasks.',
		'Do not make changes in this run. This run is for ideation only.',
		'',
		'Target project',
		`- Name: ${project.name}`,
		`- Summary: ${compactText(project.summary, 'No summary recorded.')}`,
		`- Project root: ${formatConfiguredValue(project.projectRootFolder)}`,
		`- Default repo path: ${formatConfiguredValue(project.defaultRepoPath)}`,
		`- Default repo URL: ${formatConfiguredValue(project.defaultRepoUrl)}`,
		`- Default branch: ${formatConfiguredValue(project.defaultBranch)}`,
		`- Default artifact root: ${formatConfiguredValue(project.defaultArtifactRoot)}`,
		'',
		'Other projects in the control plane',
		...(otherProjects.length > 0
			? otherProjects.map(
					(otherProject) =>
						`- ${otherProject.name}: ${compactText(otherProject.summary, 'No summary recorded.')}`
				)
			: ['- No other projects are configured right now.']),
		'',
		'Related goals',
		...(relatedGoals.length > 0
			? relatedGoals.map(
					(goal) =>
						`- ${goal.name}: ${compactText(goal.summary, 'No summary recorded.')} (${goal.status})`
				)
			: ['- No goals are linked to this project yet.']),
		'',
		'Task history snapshot',
		`- Total related tasks: ${relatedTasks.length}`,
		`- Status counts: ${statusCounts.join(', ') || 'No tasks yet.'}`,
		'',
		'Open and unfinished tasks',
		...(openTasks.length > 0
			? openTasks.map((task) => formatTaskLine(task, latestRunByTaskId.get(task.id) ?? null))
			: ['- No unfinished tasks are linked to this project yet.']),
		'',
		'Recently completed tasks',
		...(completedTasks.length > 0
			? completedTasks.map((task) => formatTaskLine(task, latestRunByTaskId.get(task.id) ?? null))
			: ['- No completed tasks are recorded for this project yet.']),
		'',
		'Recent run outcomes',
		...(recentRuns.length > 0
			? recentRuns.map((run) => formatRunLine(run, taskMap))
			: ['- No run history is recorded for this project yet.']),
		'',
		'Instructions',
		'1. Inspect the repository and nearby docs from the project root before proposing tasks.',
		'2. Propose 6 to 10 concrete task ideas that are not duplicates of the tasks listed above.',
		'3. Prefer tasks that are scoped, actionable, and realistic for the next 1 to 3 iterations.',
		'4. Balance quick wins, structural improvements, and user-facing work when the context supports them.',
		'5. Reference specific signals from the task history when you justify each idea.',
		'6. Call out missing setup or ambiguity when it limits confidence.',
		'',
		'Response format',
		'Start with a short section named "Gaps noticed".',
		'Then add a section named "Suggested tasks".',
		'For each suggestion, use this template exactly:',
		'Title: <short task title>',
		'Why it matters: <1-2 sentences>',
		'Suggested instructions: <copy-ready task brief>',
		'Signals from history/context: <specific evidence from the project or task history>',
		'Confidence: <high|medium|low>',
		'',
		'Helpful context',
		`- Current project focus inferred from existing tasks: ${
			openTasks[0]
				? compactText(openTasks[0].summary, openTasks[0].title)
				: 'No active task focus is recorded yet.'
		}`,
		`- Most recent goal reference: ${
			relatedGoals[0]
				? `${relatedGoals[0].name} (${relatedGoals[0].status})`
				: 'No linked goal recorded.'
		}`,
		`- Most recent task with a goal: ${
			mostRecentTaskWithGoal?.title
				? `${mostRecentTaskWithGoal.title} -> ${goalMap.get(mostRecentTaskWithGoal.goalId)?.name ?? 'Unknown goal'}`
				: 'None recorded.'
		}`
	].join('\n');
}
