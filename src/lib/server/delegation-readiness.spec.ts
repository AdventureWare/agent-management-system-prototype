import { describe, expect, it } from 'vitest';
import { buildDelegationReadinessAssessment } from './delegation-readiness';
import type { ControlPlaneData, Run, Task } from '$lib/types/control-plane';

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: overrides.id ?? 'task_default',
		title: overrides.title ?? 'Default task',
		summary: overrides.summary ?? 'Implement the bounded change.',
		successCriteria: overrides.successCriteria ?? 'The requested behavior works.',
		readyCondition: overrides.readyCondition ?? 'The repo is available.',
		expectedOutcome: overrides.expectedOutcome ?? 'A reviewable implementation exists.',
		scope: overrides.scope ?? 'One small implementation slice.',
		nonGoals: overrides.nonGoals ?? '',
		validationSteps: overrides.validationSteps ?? 'Run the targeted tests.',
		rigorProfile: overrides.rigorProfile ?? null,
		readinessLevel: overrides.readinessLevel ?? 'R3_EXECUTABLE',
		autonomyLevel: overrides.autonomyLevel ?? 'A3_AGENT_MAY_EDIT_IN_ISOLATED_BRANCH_OR_WORKTREE',
		allowedActionNames: overrides.allowedActionNames ?? [],
		reviewRequirement: overrides.reviewRequirement ?? 'SUMMARY_REVIEW',
		projectId: overrides.projectId ?? 'project_1',
		area: overrides.area ?? 'product',
		goalId: overrides.goalId ?? 'goal_1',
		taskTemplateId: overrides.taskTemplateId ?? null,
		workflowId: overrides.workflowId ?? null,
		parentTaskId: overrides.parentTaskId ?? null,
		delegationPacket: overrides.delegationPacket ?? null,
		delegationAcceptance: overrides.delegationAcceptance ?? null,
		priority: overrides.priority ?? 'medium',
		status: overrides.status ?? 'ready',
		riskLevel: overrides.riskLevel ?? 'low',
		approvalMode: overrides.approvalMode ?? 'none',
		requiredThreadSandbox: overrides.requiredThreadSandbox ?? null,
		requiresReview: overrides.requiresReview ?? true,
		desiredRoleId: overrides.desiredRoleId ?? '',
		assigneeExecutionSurfaceId: overrides.assigneeExecutionSurfaceId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		requiredPromptSkillNames: overrides.requiredPromptSkillNames ?? [],
		requiredCapabilityNames: overrides.requiredCapabilityNames ?? [],
		requiredToolNames: overrides.requiredToolNames ?? [],
		blockedReason: overrides.blockedReason ?? '',
		dependencyTaskIds: overrides.dependencyTaskIds ?? [],
		estimateHours: overrides.estimateHours ?? null,
		targetDate: overrides.targetDate ?? null,
		runCount: overrides.runCount ?? 0,
		latestRunId: overrides.latestRunId ?? null,
		artifactPath: overrides.artifactPath ?? '',
		attachments: overrides.attachments ?? [],
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:00:00.000Z'
	};
}

function createRun(overrides: Partial<Run> = {}): Run {
	return {
		id: overrides.id ?? 'run_1',
		taskId: overrides.taskId ?? 'task_default',
		executionSurfaceId: overrides.executionSurfaceId ?? null,
		assumedRoleId: overrides.assumedRoleId ?? null,
		providerId: overrides.providerId ?? null,
		agentThreadRunId: overrides.agentThreadRunId ?? null,
		status: overrides.status ?? 'completed',
		createdAt: overrides.createdAt ?? '2026-06-01T12:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-01T12:05:00.000Z',
		startedAt: overrides.startedAt ?? '2026-06-01T12:01:00.000Z',
		endedAt: overrides.endedAt ?? '2026-06-01T12:05:00.000Z',
		threadId: overrides.threadId ?? null,
		agentThreadId: overrides.agentThreadId ?? null,
		promptDigest: overrides.promptDigest ?? '',
		artifactPaths: overrides.artifactPaths ?? [],
		summary: overrides.summary ?? 'Completed.',
		lastHeartbeatAt: overrides.lastHeartbeatAt ?? null,
		errorSummary: overrides.errorSummary ?? ''
	};
}

function createControlPlane(tasks: Task[], runs: Run[] = []): ControlPlaneData {
	return {
		providers: [
			{
				id: 'provider_codex',
				name: 'Codex',
				service: 'codex',
				kind: 'local',
				description: '',
				enabled: true,
				setupStatus: 'connected',
				authMode: 'local_cli',
				defaultModel: '',
				baseUrl: '',
				launcher: 'codex',
				envVars: [],
				capabilities: ['implementation', 'planning'],
				defaultThreadSandbox: 'workspace-write',
				notes: ''
			}
		],
		roles: [],
		projects: [
			{
				id: 'project_1',
				name: 'Agent Management System Prototype',
				summary: 'Primary app project',
				defaultRigorProfile: 'INTERNAL',
				projectRootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				defaultRepoPath: '',
				defaultRepoUrl: '',
				defaultBranch: ''
			}
		],
		goals: [
			{
				id: 'goal_1',
				name: 'Improve delegation',
				area: 'product',
				status: 'running',
				summary: 'Make tasks easier to delegate.',
				artifactPath: ''
			}
		],
		workflows: [],
		workflowSteps: [],
		taskTemplates: [],
		executionSurfaces: [
			{
				id: 'surface_1',
				name: 'Local Codex',
				providerId: 'provider_codex',
				location: 'local',
				status: 'idle',
				capacity: 1,
				registeredAt: '2026-06-01T12:00:00.000Z',
				lastSeenAt: '2026-06-01T12:00:00.000Z',
				note: '',
				tags: [],
				skills: ['implementation'],
				threadSandboxOverride: null,
				authTokenHash: ''
			}
		],
		tasks,
		runs,
		reviews: [],
		approvals: [],
		planningSessions: [],
		decisions: []
	};
}

describe('buildDelegationReadinessAssessment', () => {
	it('keeps title-only capture valid but not executable', () => {
		const task = createTask({
			title: 'Follow up',
			summary: '',
			successCriteria: '',
			readyCondition: '',
			expectedOutcome: '',
			scope: '',
			validationSteps: '',
			readinessLevel: 'R0_IDEA',
			status: 'in_draft'
		});
		const assessment = buildDelegationReadinessAssessment(createControlPlane([task]), task);

		expect(assessment.recommendedMode).toBe('CAPTURED');
		expect(assessment.canExecute).toBe(false);
		expect(assessment.missingInformation).toContain('Add an expected outcome.');
	});

	it('detects clarification and research blockers separately', () => {
		const clarificationTask = createTask({
			id: 'task_clarify',
			status: 'blocked',
			blockedReason: 'Need to clarify user preference.'
		});
		const researchTask = createTask({
			id: 'task_research',
			status: 'blocked',
			blockedReason: 'Research unknown API behavior.'
		});
		const data = createControlPlane([clarificationTask, researchTask]);

		expect(buildDelegationReadinessAssessment(data, clarificationTask).recommendedMode).toBe(
			'NEEDS_CLARIFICATION'
		);
		expect(buildDelegationReadinessAssessment(data, researchTask).recommendedMode).toBe(
			'NEEDS_RESEARCH'
		);
	});

	it('marks clear low-risk executable work as ready for execution', () => {
		const task = createTask();
		const assessment = buildDelegationReadinessAssessment(createControlPlane([task]), task);

		expect(assessment.recommendedMode).toBe('READY_FOR_EXECUTION');
		expect(assessment.canExecute).toBe(true);
		expect(assessment.effectiveRigorProfile).toBe('INTERNAL');
		expect(assessment.suggestedNextActions[0]?.id).toBe('execute');
	});

	it('inherits project rigor profile unless the task overrides it', () => {
		const task = createTask({ rigorProfile: 'PROTOTYPE' });
		const inheritedTask = createTask({ id: 'task_inherited', rigorProfile: null });
		const data = createControlPlane([task, inheritedTask]);
		data.projects[0] = { ...data.projects[0], defaultRigorProfile: 'BETA' };

		expect(buildDelegationReadinessAssessment(data, task).effectiveRigorProfile).toBe('PROTOTYPE');
		expect(buildDelegationReadinessAssessment(data, inheritedTask).effectiveRigorProfile).toBe(
			'BETA'
		);
	});

	it('does not treat high-stakes work as autonomously executable', () => {
		const task = createTask({ rigorProfile: 'HIGH_STAKES' });
		const assessment = buildDelegationReadinessAssessment(createControlPlane([task]), task);

		expect(assessment.canExecute).toBe(false);
		expect(assessment.riskFlags).toContain(
			'High-stakes profile requires explicit human approval before execution.'
		);
		expect(assessment.missingInformation).toContain(
			'Prepare an approval packet; do not execute high-stakes actions autonomously.'
		);
	});

	it('routes completed runs to review', () => {
		const task = createTask({
			status: 'in_progress',
			latestRunId: 'run_complete',
			runCount: 1
		});
		const run = createRun({ id: 'run_complete', taskId: task.id, status: 'completed' });
		const assessment = buildDelegationReadinessAssessment(createControlPlane([task], [run]), task);

		expect(assessment.recommendedMode).toBe('AWAITING_REVIEW');
		expect(assessment.needsReview).toBe(true);
	});

	it('identifies repeatable ready work as an automation candidate', () => {
		const task = createTask({
			taskTemplateId: 'template_1',
			readinessLevel: 'R5_AUTOMATABLE'
		});
		const assessment = buildDelegationReadinessAssessment(createControlPlane([task]), task);

		expect(assessment.recommendedMode).toBe('AUTOMATION_CANDIDATE');
		expect(assessment.suggestedNextActions[0]?.id).toBe('convert_to_template_or_skill');
	});

	it('flags missing prompt skills and capability coverage', () => {
		const task = createTask({
			requiredPromptSkillNames: ['missing-skill'],
			requiredCapabilityNames: ['missing-capability'],
			requiredToolNames: ['missing-tool']
		});
		const assessment = buildDelegationReadinessAssessment(createControlPlane([task]), task, {
			availablePromptSkillNames: ['existing-skill']
		});

		expect(assessment.canExecute).toBe(false);
		expect(assessment.missingInformation).toContain(
			'Install or remove missing prompt skills: missing-skill.'
		);
		expect(assessment.missingInformation).toContain(
			'Add execution capability coverage: missing-capability.'
		);
		expect(assessment.missingInformation).toContain('Add runtime tool coverage: missing-tool.');
	});
});
