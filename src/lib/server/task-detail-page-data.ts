import {
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane
} from '$lib/server/control-plane';
import { listAgentThreads } from '$lib/server/agent-threads';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { buildExecutionRequirementInventory } from '$lib/server/execution-requirement-inventory';
import { buildTaskLaunchContextSummary } from '$lib/server/task-launch-context-summary';
import { loadRelevantSelfImprovementKnowledgeItems } from '$lib/server/self-improvement-knowledge';
import { getTaskAttachmentRoot } from '$lib/server/task-attachments';
import { getWorkerAssignmentSuggestions } from '$lib/server/worker-api';
import { buildTaskExecutionPreflight } from '$lib/server/task-execution-preflight';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import {
	buildAssignmentSuggestionViews,
	buildParentTaskView,
	buildRecentTaskDecisionViews,
	buildTaskDetailTaskView,
	summarizeInstalledSkills
} from './task-detail-display-data';
import { buildTaskDetailCollections } from './task-detail-load-data';
import { buildTaskGoalOptions } from './task-goal-options';
import { buildTaskDetailRuntimeContext } from './task-detail-runtime-context';

export async function loadTaskDetailPageData(taskId: string) {
	const controlPlanePromise = loadControlPlane();
	const [data, sessions] = await Promise.all([
		controlPlanePromise,
		listAgentThreads({ includeArchived: true, controlPlane: controlPlanePromise })
	]);
	const task = data.tasks.find((candidate) => candidate.id === taskId);

	if (!task) {
		return null;
	}

	const projectMap = new Map(data.projects.map((project) => [project.id, project]));
	const workerMap = new Map(data.workers.map((worker) => [worker.id, worker]));
	const providerMap = new Map(data.providers.map((provider) => [provider.id, provider]));
	const goalMap = new Map(data.goals.map((goal) => [goal.id, goal]));
	const roleMap = new Map(data.roles.map((role) => [role.id, role]));
	const parentTask = task.parentTaskId
		? (data.tasks.find((candidate) => candidate.id === task.parentTaskId) ?? null)
		: null;
	const { relatedRuns, dependencyTasks, childTasks, childTaskRollup, availableDependencyTasks } =
		buildTaskDetailCollections({
			data,
			task,
			projectMap,
			workerMap,
			providerMap,
			formatRelativeTime
		});
	const openReview = getOpenReviewForTask(data, task.id);
	const pendingApproval = getPendingApprovalForTask(data, task.id);
	const project = projectMap.get(task.projectId) ?? null;
	const artifactRoot = getTaskAttachmentRoot(task, project);
	const {
		latestRun,
		activeRun,
		threadContext,
		candidateThreads,
		suggestedThread,
		stalledRecovery
	} = buildTaskDetailRuntimeContext({
		task,
		project,
		sessions,
		relatedRuns
	});
	const availableSkills = listInstalledCodexSkills(project?.projectRootFolder ?? '');
	const availableSkillSummary = summarizeInstalledSkills(availableSkills);
	const assignedWorker = task.assigneeWorkerId
		? (workerMap.get(task.assigneeWorkerId) ?? null)
		: null;
	const recentDecisions = buildRecentTaskDecisionViews(
		data.decisions ?? [],
		task.id,
		formatRelativeTime
	);
	const rawAssignmentSuggestions = getWorkerAssignmentSuggestions(data, task);
	const assignmentSuggestions = buildAssignmentSuggestionViews(
		rawAssignmentSuggestions,
		data.roles,
		data.providers,
		task.assigneeWorkerId
	);
	const executionPreflight = buildTaskExecutionPreflight(task, rawAssignmentSuggestions);
	const executionRequirementInventory = buildExecutionRequirementInventory(data);
	const [retrievedKnowledgeItems, artifactBrowser] = await Promise.all([
		loadRelevantSelfImprovementKnowledgeItems({
			task,
			project,
			limit: 3
		}),
		buildArtifactBrowser({
			rootPath: artifactRoot,
			knownOutputs: task.attachments.map((attachment) => ({
				label: attachment.name,
				path: attachment.path,
				href: `/api/tasks/${task.id}/attachments/${attachment.id}`,
				description: `Attached task file${attachment.contentType ? ` · ${attachment.contentType}` : ''}`
			}))
		})
	]);
	const launchContext = buildTaskLaunchContextSummary(
		{ providers: data.providers },
		{
			task,
			project,
			worker: assignedWorker,
			publishedKnowledgeCount: retrievedKnowledgeItems.length
		}
	);

	return {
		task: buildTaskDetailTaskView({
			task,
			projectMap,
			goalMap,
			roleMap,
			workerMap,
			latestRun,
			activeRun,
			threadContext,
			openReview,
			pendingApproval,
			formatRelativeTime
		}),
		parentTask: buildParentTaskView(parentTask, projectMap),
		childTasks,
		childTaskRollup,
		stalledRecovery,
		attachmentRoot: artifactRoot,
		availableSkills: availableSkillSummary,
		launchContext,
		artifactBrowser,
		project,
		retrievedKnowledgeItems,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: buildTaskGoalOptions(data.goals),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		assignmentSuggestions,
		executionPreflight,
		executionRequirementInventory,
		recentDecisions,
		statusOptions: TASK_STATUS_OPTIONS,
		relatedRuns,
		dependencyTasks,
		availableDependencyTasks,
		candidateThreads,
		suggestedThread
	};
}
