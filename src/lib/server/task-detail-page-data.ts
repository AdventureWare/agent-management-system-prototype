import {
	formatRelativeTime,
	getOpenReviewForTask,
	getPendingApprovalForTask,
	loadControlPlane
} from '$lib/server/control-plane';
import { listAgentThreads } from '$lib/server/agent-threads';
import { buildArtifactBrowser } from '$lib/server/artifact-browser';
import { listInstalledCodexSkills } from '$lib/server/codex-skills';
import { loadRelevantSelfImprovementKnowledgeItems } from '$lib/server/self-improvement-knowledge';
import { getTaskAttachmentRoot } from '$lib/server/task-attachments';
import { getWorkerAssignmentSuggestions } from '$lib/server/worker-api';
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
	const recentDecisions = buildRecentTaskDecisionViews(
		data.decisions ?? [],
		task.id,
		formatRelativeTime
	);
	const assignmentSuggestions = buildAssignmentSuggestionViews(
		getWorkerAssignmentSuggestions(data, task),
		data.roles,
		data.providers,
		task.assigneeWorkerId
	);
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
		artifactBrowser,
		project,
		retrievedKnowledgeItems,
		projects: [...data.projects].sort((a, b) => a.name.localeCompare(b.name)),
		goals: buildTaskGoalOptions(data.goals),
		roles: [...data.roles].sort((a, b) => a.name.localeCompare(b.name)),
		workers: [...data.workers].sort((a, b) => a.name.localeCompare(b.name)),
		assignmentSuggestions,
		recentDecisions,
		statusOptions: TASK_STATUS_OPTIONS,
		relatedRuns,
		dependencyTasks,
		availableDependencyTasks,
		candidateThreads,
		suggestedThread
	};
}
