import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { TASK_STATUS_OPTIONS } from '$lib/types/control-plane';
import Page from './+page.svelte';

function normalizeText(value: string | null | undefined) {
	return (value ?? '').replace(/\s+/g, ' ').trim();
}

function buildTaskDetailPageData(overrides: Record<string, unknown> = {}) {
	const base = {
		availableSkills: {
			totalCount: 0,
			globalCount: 0,
			projectCount: 0,
			previewSkills: []
		},
		projectInstalledSkills: [],
		attachmentRoot: '/tmp/project/agent_output',
		artifactBrowser: {
			rootPath: '/tmp/project/agent_output',
			rootKind: 'directory',
			browsePath: '/tmp/project/agent_output',
			inspectingParentDirectory: false,
			directoryEntries: [],
			directoryEntriesTruncated: false,
			knownOutputs: [],
			errorMessage: ''
		},
		project: {
			id: 'project_1',
			name: 'Agent Management System Prototype',
			summary: 'Primary app project',
			projectRootFolder: '/tmp/project',
			defaultArtifactRoot: '/tmp/project/agent_output',
			defaultRepoPath: '',
			defaultRepoUrl: '',
			defaultBranch: ''
		},
		projects: [],
		goals: [],
		workflows: [],
		roles: [],
		executionSurfaces: [],
		assignmentSuggestions: [],
		executionPreflight: {
			hasDeclaredRequirements: false,
			registeredExecutionSurfaceCount: 0,
			eligibleExecutionSurfaceCount: 0,
			fullCoverageExecutionSurfaceCount: 0,
			uncoveredCapabilityNames: [],
			uncoveredToolNames: [],
			directProvider: null,
			currentAssignee: null
		},
		executionRequirementInventory: {
			capabilities: [],
			tools: [],
			capabilityNames: [],
			toolNames: []
		},
		launchContext: {
			role: null,
			assignedExecutionSurface: null,
			provider: null,
			sandbox: {
				effective: 'danger-full-access',
				taskRequirement: null,
				executionSurfaceOverride: null,
				projectDefault: null,
				providerDefault: null
			},
			project: {
				rootFolder: '/tmp/project',
				defaultArtifactRoot: '/tmp/project/agent_output',
				additionalWritableRoots: [],
				totalInstalledSkillCount: 0,
				promptSkillNames: []
			},
			contract: {
				canLaunch: true,
				canReviewAgainstContract: true,
				missingLaunchFieldLabels: [],
				missingReviewFieldLabels: [],
				launchBlockerMessage: null,
				reviewGapMessage: null
			},
			promptInputs: {
				includesSuccessCriteria: false,
				includesReadyCondition: false,
				includesExpectedOutcome: false,
				includesDelegationPacket: false,
				publishedKnowledgeCount: 0,
				requiredPromptSkillNames: [],
				missingPromptSkillNames: []
			},
			requirements: {
				capabilityNames: [],
				toolNames: []
			}
		},
		retrievedKnowledgeItems: [],
		recentDecisions: [],
		statusOptions: TASK_STATUS_OPTIONS,
		relatedRuns: [],
		dependencyTasks: [],
		availableDependencyTasks: [],
		candidateThreads: [],
		suggestedThread: null,
		parentTask: null,
		childTasks: [],
		childTaskRollup: null,
		stalledRecovery: null,
		task: {
			id: 'task_1',
			title: 'Task title',
			summary: 'Task summary',
			projectId: 'project_1',
			projectName: 'Agent Management System Prototype',
			area: 'product',
			goalId: '',
			priority: 'medium',
			status: 'ready',
			riskLevel: 'medium',
			approvalMode: 'none',
			requiredThreadSandbox: 'danger-full-access',
			requiresReview: false,
			desiredRoleId: '',
			assigneeExecutionSurfaceId: null,
			assigneeName: 'Unassigned',
			agentThreadId: null,
			blockedReason: '',
			dependencyTaskIds: [],
			runCount: 0,
			latestRunId: null,
			latestRun: null,
			artifactPath: '/tmp/project/agent_output',
			attachments: [],
			createdAt: '2026-03-30T11:00:00.000Z',
			updatedAt: '2026-03-30T12:00:00.000Z',
			updatedAtLabel: 'just now',
			openReview: null,
			pendingApproval: null,
			linkThread: null,
			linkThreadKind: 'assigned',
			statusThread: null,
			hasActiveRun: false,
			activeRun: null
		},
		agentCurrentContext: {
			summary: {
				currentState: 'Task "Task title" is ready.',
				blockers: [],
				openGates: [],
				recommendedNextActions: []
			}
		}
	};

	const typedOverrides = overrides as Record<string, unknown>;

	return {
		...base,
		...typedOverrides,
		availableSkills: {
			...base.availableSkills,
			...((typedOverrides.availableSkills as Record<string, unknown> | undefined) ?? {})
		},
		artifactBrowser: {
			...base.artifactBrowser,
			...((typedOverrides.artifactBrowser as Record<string, unknown> | undefined) ?? {})
		},
		project: {
			...base.project,
			...((typedOverrides.project as Record<string, unknown> | undefined) ?? {})
		},
		launchContext: {
			...base.launchContext,
			...((typedOverrides.launchContext as Record<string, unknown> | undefined) ?? {}),
			sandbox: {
				...base.launchContext.sandbox,
				...(((typedOverrides.launchContext as Record<string, unknown> | undefined)?.sandbox as
					| Record<string, unknown>
					| undefined) ?? {})
			},
			project: {
				...base.launchContext.project,
				...(((typedOverrides.launchContext as Record<string, unknown> | undefined)?.project as
					| Record<string, unknown>
					| undefined) ?? {})
			},
			contract: {
				...base.launchContext.contract,
				...(((typedOverrides.launchContext as Record<string, unknown> | undefined)?.contract as
					| Record<string, unknown>
					| undefined) ?? {})
			},
			promptInputs: {
				...base.launchContext.promptInputs,
				...(((typedOverrides.launchContext as Record<string, unknown> | undefined)?.promptInputs as
					| Record<string, unknown>
					| undefined) ?? {})
			},
			requirements: {
				...base.launchContext.requirements,
				...(((typedOverrides.launchContext as Record<string, unknown> | undefined)?.requirements as
					| Record<string, unknown>
					| undefined) ?? {})
			}
		},
		executionPreflight: {
			...base.executionPreflight,
			...((typedOverrides.executionPreflight as Record<string, unknown> | undefined) ?? {})
		},
		executionRequirementInventory: {
			...base.executionRequirementInventory,
			...((typedOverrides.executionRequirementInventory as Record<string, unknown> | undefined) ??
				{})
		},
		task: {
			...base.task,
			...((typedOverrides.task as Record<string, unknown> | undefined) ?? {})
		}
	};
}

describe('/app/tasks/[taskId]/+page.svelte', () => {
	it('honors initial detail-panel deep links for current-context drill-ins', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				initialDetailPanel: 'governance',
				task: {
					pendingApproval: {
						id: 'approval_1',
						mode: 'before_complete',
						status: 'pending',
						summary: 'Ready for final approval.'
					}
				}
			}) as never
		});

		expect(document.body.textContent).toContain('Review and approval state');
		expect(document.body.textContent).toContain('Ready for final approval.');
	});

	it('keeps the task editor ahead of diagnostics and removes the old top agent-use card', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				task: {
					latestRunId: 'run_1',
					latestRun: {
						id: 'run_1'
					}
				}
			}) as never
		});

		const taskForm = document.querySelector('#task-update-form');
		const diagnosticsPanel = document.querySelector('#agent-current-context');
		const exactAgentUseEyebrows = Array.from(document.querySelectorAll('p')).filter(
			(node) => normalizeText(node.textContent) === 'Agent use'
		);

		expect(taskForm).not.toBeNull();
		expect(diagnosticsPanel).not.toBeNull();
		expect(
			(taskForm as Node).compareDocumentPosition(diagnosticsPanel as Node) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(exactAgentUseEyebrows).toHaveLength(0);
		expect(document.body.textContent).toContain('Managed-run context and recommendations');
		expect(document.body.textContent).toContain('View task agent use');
	});

	it('surfaces related child tasks early and groups them clearly in governance', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				parentTask: {
					id: 'task_parent',
					title: 'Parent orchestration task',
					status: 'in_progress',
					projectName: 'Agent Management System Prototype'
				},
				childTasks: [
					{
						id: 'task_child_pending',
						title: 'Pending child handoff',
						status: 'done',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						updatedAtLabel: '5m ago',
						integrationStatus: 'pending',
						delegationAcceptance: null,
						delegationPacket: {
							objective: 'Deliver the delegated result.',
							expectedDeliverable: 'Attached artifact.',
							doneCondition: 'Parent can accept the handoff.'
						}
					},
					{
						id: 'task_child_active',
						title: 'Active child task',
						status: 'in_progress',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						updatedAtLabel: '10m ago',
						integrationStatus: 'not_ready',
						delegationAcceptance: null,
						delegationPacket: {
							objective: 'Keep implementation moving.'
						}
					},
					{
						id: 'task_child_accepted',
						title: 'Accepted child task',
						status: 'done',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						updatedAtLabel: '20m ago',
						integrationStatus: 'accepted',
						delegationAcceptance: {
							acceptedAt: '2026-04-20T10:00:00.000Z',
							acceptedByTaskId: 'task_1',
							acceptedAtLabel: '1d ago'
						},
						delegationPacket: null
					},
					{
						id: 'task_child_fourth',
						title: 'Fourth child task',
						status: 'ready',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						updatedAtLabel: '25m ago',
						integrationStatus: 'not_ready',
						delegationAcceptance: null,
						delegationPacket: null
					}
				]
			}) as never
		});

		expect(document.body.textContent).toContain('Related tasks');
		expect(document.body.textContent).toContain('Open related tasks workspace');
		expect(document.body.textContent).toContain('Parent orchestration task');
		expect(document.body.textContent).toContain('Pending child handoff');
		expect(document.body.textContent).toContain('Active child task');
		expect(document.body.textContent).toContain('Accepted child task');
		expect(document.body.textContent).toContain('+1 more in governance');

		await page.getByRole('button', { name: 'Open related tasks workspace' }).click();

		expect(document.body.textContent).toContain('Needs parent decision');
		expect(document.body.textContent).toContain('Still moving');
		expect(document.body.textContent).toContain('Already accepted');
		await expect.element(page.getByRole('link', { name: 'Review handoff' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'View accepted task' }))
			.toBeInTheDocument();
	});

	it('renders preview-first current context guidance for risky task actions', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				task: {
					status: 'done',
					approvalMode: 'before_complete'
				},
				agentCurrentContext: {
					task: {
						title: 'Task title',
						status: 'done'
					},
					run: {
						status: 'failed'
					},
					thread: {
						name: 'Task thread',
						threadState: 'attention'
					},
					summary: {
						currentState: 'Task "Task title" is done with run failed.',
						blockers: ['Run stopped during verification.'],
						openGates: ['Pending approval: Ready for stakeholder sign-off'],
						recommendedNextActions: [
							{
								resource: 'task',
								command: 'approve-approval',
								reason: 'There is a pending approval gate on this task.',
								stateSignals: [
									'Task task_1 has pending approval approval_1.',
									'Approval mode is before_complete.'
								],
								expectedOutcome: 'Resolve the pending approval by approving the task output.',
								suggestedReadbackCommands: ['task:get', 'context:current'],
								shouldValidateFirst: true,
								validationMode: 'validateOnly',
								validationReason:
									'Approval resolution is high-impact. Preview whether the task would close before mutating.'
							}
						]
					}
				}
			})
		});

		expect(document.body.textContent).toContain('Managed-run context and recommendations');
		expect(document.body.textContent).toContain('Preview first');
		expect(document.body.textContent).toContain(
			'Approval resolution is high-impact. Preview whether the task would close before mutating.'
		);
		expect(document.body.textContent).toContain('task:get');
		expect(document.body.textContent).toContain('context:current');
	});

	it('keeps diagnostics below the main workspaces and progressively reveals long skill lists', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				projectInstalledSkills: Array.from({ length: 10 }, (_, index) => ({
					id: `skill_${index + 1}`,
					description: `Skill ${index + 1}`,
					sourceLabel: 'project'
				}))
			}) as never
		});

		const pageText = normalizeText(document.body.textContent);
		expect(pageText.indexOf('Task workspaces')).toBeLessThan(
			pageText.indexOf('Operational diagnostics')
		);
		expect(document.body.textContent).toContain('Show 2 more skills');
		expect(document.body.textContent).not.toContain('skill_10');

		await page.getByRole('button', { name: 'Show 2 more skills' }).click();

		expect(document.body.textContent).toContain('skill_10');
	});

	it('shows the source task template as linked task context when present', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				task: {
					taskTemplateId: 'task_template_research',
					taskTemplateName: 'Research brief'
				}
			}) as never
		});

		expect(document.body.textContent).toContain('Template source');
		expect(document.body.textContent).toContain('Research brief');
		await expect
			.element(page.getByRole('link', { name: 'Open task template details' }))
			.toBeInTheDocument();
	});

	it('renders attached files with open, download, and detach controls', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 2,
					globalCount: 1,
					projectCount: 1,
					previewSkills: [
						{
							id: 'skill-installer',
							description: 'Install Codex skills',
							global: true,
							project: false,
							sourceLabel: 'Global'
						},
						{
							id: 'web-design-guidelines',
							description: 'Review UI against guidelines',
							global: false,
							project: true,
							sourceLabel: 'Project'
						}
					]
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [
						{
							name: 'task-attachments',
							path: '/tmp/project/agent_output/task-attachments',
							kind: 'directory',
							extension: '',
							sizeBytes: null
						}
					],
					directoryEntriesTruncated: false,
					knownOutputs: [
						{
							label: 'brief.md',
							path: '/tmp/project/agent_output/task-attachments/task_1/brief.md',
							kind: 'file',
							extension: 'md',
							sizeBytes: 2048,
							exists: true,
							href: '/api/tasks/task_1/attachments/attachment_1',
							description: 'Attached task file · text/markdown'
						}
					],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [
					{
						id: 'goal_launch',
						name: 'Improve goal UX',
						label: 'Improve goal UX',
						depth: 0,
						parentGoalId: null,
						status: 'active',
						area: 'product'
					},
					{
						id: 'goal_linking',
						name: 'Improve task linking',
						label: '  - Improve task linking',
						depth: 1,
						parentGoalId: 'goal_launch',
						status: 'planned',
						area: 'product'
					}
				],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiredThreadSandbox: 'danger-full-access',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					targetDate: '2026-04-22',
					runCount: 1,
					latestRunId: 'run_1',
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [
						{
							id: 'attachment_1',
							name: 'brief.md',
							path: '/tmp/project/agent_output/task-attachments/task_1/brief.md',
							contentType: 'text/markdown',
							sizeBytes: 2048,
							attachedAt: '2026-03-30T12:00:00.000Z'
						}
					],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			}) as never
		});

		expect(document.body.textContent).toContain('Attached files');
		expect(document.body.textContent).toContain('Browse task outputs');
		expect(document.body.textContent).toContain('Skill access');
		expect(document.body.textContent).toContain(
			'2 installed skills are available to new task threads.'
		);
		expect(document.body.textContent).toContain('brief.md');
		expect(document.body.textContent).toContain('task-attachments');
		expect(document.body.textContent).toContain('/tmp/project/agent_output');
		expect(document.body.textContent).toContain('Target date');
		expect(document.body.textContent).toContain('Apr 22, 2026');
		expect(normalizeText(document.body.textContent)).toContain(
			'Required sandbox: Danger Full Access'
		);
		expect(
			(document.querySelector('input[name="targetDate"]') as HTMLInputElement | null)?.value
		).toBe('2026-04-22');
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.textContent?.trim() === 'Open page'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some(
				(button) => button.textContent?.trim() === 'Quick preview'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) =>
					link.getAttribute('href') ===
					'/app/artifacts?path=%2Ftmp%2Fproject%2Fagent_output%2Ftask-attachments%2Ftask_1%2Fbrief.md'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) =>
					link.getAttribute('href') ===
					'/api/artifacts/file?path=%2Ftmp%2Fproject%2Fagent_output%2Ftask-attachments%2Ftask_1%2Fbrief.md'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some(
				(button) => button.textContent?.trim() === 'Detach'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Save changes')
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Run task')
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('button')).some((button) =>
				button.textContent?.includes('Create follow-up task')
			)
		).toBe(true);
		expect(document.body.textContent).toContain('This task is not ready to run yet.');
		expect(document.body.textContent).toContain(
			'Set the task status to Ready before running it. Current status: In Progress.'
		);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.getAttribute('href') === '/app/agent-use?task=task_1'
			)
		).toBe(true);
		expect(
			Array.from(document.querySelectorAll('a')).some(
				(link) => link.getAttribute('href') === '/app/agent-use?run=run_1'
			)
		).toBe(true);
	});

	it('renders a goal selector with hierarchical options on the task detail form', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [
					{
						id: 'goal_launch',
						name: 'Improve goal UX',
						label: 'Improve goal UX',
						depth: 0,
						parentGoalId: null,
						status: 'active',
						area: 'product'
					},
					{
						id: 'goal_linking',
						name: 'Improve task linking',
						label: '  - Improve task linking',
						depth: 1,
						parentGoalId: 'goal_launch',
						status: 'planned',
						area: 'product'
					}
				],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: 'goal_linking',
					goalName: 'Improve task linking',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-31T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			}) as never
		});

		const goalSelect = document.querySelector('select[name="goalId"]') as HTMLSelectElement | null;

		expect(goalSelect?.value).toBe('goal_linking');
		expect(goalSelect?.textContent).toContain('No goal linked');
		expect(goalSelect?.textContent).toContain('Improve goal UX');
		expect(goalSelect?.textContent).toContain('Improve task linking');
		expect(document.body.textContent).toContain(
			'This is the canonical task-to-goal link used by goal detail and hierarchy views.'
		);
	});

	it('renders the full routing and governance editor on the detail form', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [],
				roles: [
					{
						id: 'role_coordinator',
						name: 'Coordinator',
						area: 'shared',
						description: 'Coordinates execution'
					},
					{
						id: 'role_reviewer',
						name: 'Reviewer',
						area: 'product',
						description: 'Reviews higher-risk work'
					}
				],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [
					{
						id: 'task_dep_1',
						title: 'Finalize API contract',
						status: 'blocked',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype'
					}
				],
				availableDependencyTasks: [
					{
						id: 'task_dep_1',
						title: 'Finalize API contract',
						status: 'blocked',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						isSelected: true
					},
					{
						id: 'task_dep_2',
						title: 'Ship docs update',
						status: 'ready',
						projectId: 'project_1',
						projectName: 'Agent Management System Prototype',
						isSelected: false
					}
				],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'urgent',
					status: 'blocked',
					riskLevel: 'high',
					approvalMode: 'before_apply',
					requiresReview: false,
					desiredRoleId: 'role_reviewer',
					desiredRoleName: 'Reviewer',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: 'Waiting on API contract',
					dependencyTaskIds: ['task_dep_1'],
					runCount: 0,
					latestRunId: null,
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			}) as never
		});

		expect(document.body.textContent).toContain('Queue priority, gates, and blockers');
		expect(
			(document.querySelector('select[name="priority"]') as HTMLSelectElement | null)?.value
		).toBe('urgent');
		expect(
			(document.querySelector('select[name="riskLevel"]') as HTMLSelectElement | null)?.value
		).toBe('high');
		expect(
			(document.querySelector('select[name="approvalMode"]') as HTMLSelectElement | null)?.value
		).toBe('before_apply');
		expect(
			(document.querySelector('select[name="requiresReview"]') as HTMLSelectElement | null)?.value
		).toBe('false');
		expect(
			(document.querySelector('input[name="desiredRoleId"]') as HTMLInputElement | null)?.value
		).toBe('role_reviewer');
		expect(
			(document.querySelector('textarea[name="blockedReason"]') as HTMLTextAreaElement | null)
				?.value
		).toBe('Waiting on API contract');
		expect(
			(
				document.querySelector(
					'input[name="dependencyTaskIds"][value="task_dep_1"]'
				) as HTMLInputElement | null
			)?.checked
		).toBe(true);
		expect(document.body.textContent).toContain('Finalize API contract');
	});

	it('clamps long title and instructions at the top of the page until expanded', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title:
						'Implement a task detail header that keeps a very long title readable without letting it dominate the entire page before the operator has chosen to expand it for full review and editing context',
					summary:
						'This task intentionally has a long instructions block so the header description needs to stay compact by default. The goal is to preserve scanability for the top of the page while still letting the full brief be expanded on demand when someone actually needs to read every line of the task context before acting. This should be reversible in place with a simple toggle rather than forcing navigation or a separate modal.',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 0,
					latestRunId: null,
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			}) as never
		});

		const heading = document.querySelector('h1');
		const description = document.querySelector('.ui-page-description');

		expect(heading?.className).toContain('ui-clamp-3');
		expect(description?.className).toContain('ui-clamp-5');
		await expect.element(page.getByRole('button', { name: 'Expand title' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Expand instructions' })).toBeVisible();

		await page.getByRole('button', { name: 'Expand title' }).click();
		await page.getByRole('button', { name: 'Expand instructions' }).click();

		expect(heading?.className).not.toContain('ui-clamp-3');
		expect(description?.className).not.toContain('ui-clamp-5');
		await expect.element(page.getByRole('button', { name: 'Collapse title' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Collapse instructions' })).toBeVisible();
	});

	it('shows a suggested available thread while keeping the new-thread option', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: null,
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					latestRun: null,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [
					{
						id: 'session_1',
						name: 'Task thread continuity',
						topicLabels: ['Product', 'Coordination', 'Brief'],
						threadState: 'ready',
						canResume: true,
						hasActiveRun: false,
						relatedTasks: [],
						previewText: 'Continue task thread work',
						isSuggested: true,
						suggestionReason: 'Matches this task topic and is available for follow-up.'
					}
				],
				suggestedThread: {
					id: 'session_1',
					name: 'Task thread continuity',
					topicLabels: ['Product', 'Coordination', 'Brief'],
					threadState: 'ready',
					canResume: true,
					hasActiveRun: false,
					relatedTasks: [],
					previewText: 'Continue task thread work',
					isSuggested: true,
					suggestionReason: 'Matches this task topic and is available for follow-up.'
				}
			}) as never
		});

		await page.getByRole('tab', { name: /Execution 0/i }).click();

		expect(document.body.textContent).toContain('Suggested available thread');
		expect(document.body.textContent).toContain('Assign suggested thread');
		expect(document.body.textContent).toContain('Create a new thread when this task runs');
		expect(document.body.textContent).toContain('Suggested');
		expect(document.body.textContent).toContain('Coordination');
	});

	it('disables the run button and explains why while a run is active', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'in_progress',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 1,
					latestRunId: 'run_1',
					latestRun: {
						id: 'run_1',
						taskId: 'task_1',
						executionSurfaceId: null,
						providerId: 'provider_local',
						status: 'running',
						createdAt: '2026-03-30T11:30:00.000Z',
						updatedAt: '2026-03-30T12:00:00.000Z',
						startedAt: '2026-03-30T11:30:00.000Z',
						endedAt: null,
						threadId: 'thread_1',
						agentThreadId: 'session_1',
						promptDigest: 'digest',
						artifactPaths: ['/tmp/project/agent_output'],
						summary: 'Already running.',
						lastHeartbeatAt: '2026-03-30T12:00:00.000Z',
						errorSummary: ''
					},
					activeRun: {
						id: 'run_1',
						taskId: 'task_1',
						executionSurfaceId: null,
						providerId: 'provider_local',
						status: 'running',
						createdAt: '2026-03-30T11:30:00.000Z',
						updatedAt: '2026-03-30T12:00:00.000Z',
						startedAt: '2026-03-30T11:30:00.000Z',
						endedAt: null,
						threadId: 'thread_1',
						agentThreadId: 'session_1',
						promptDigest: 'digest',
						artifactPaths: ['/tmp/project/agent_output'],
						summary: 'Already running.',
						lastHeartbeatAt: '2026-03-30T12:00:00.000Z',
						errorSummary: ''
					},
					hasActiveRun: true,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: null,
					linkThreadKind: 'assigned',
					statusThread: null
				},
				candidateThreads: [],
				suggestedThread: null
			}) as never
		});

		const runButton = Array.from(document.querySelectorAll('button')).find((button) =>
			button.textContent?.includes('Task running')
		) as HTMLButtonElement | undefined;

		expect(runButton).toBeDefined();
		expect(runButton?.disabled).toBe(true);
		expect(document.body.textContent).toContain('A run is already in progress for this task.');
		expect(document.body.textContent).toContain(
			'This task is already running. Open the current work thread or wait for the current run to finish before running again.'
		);
	});

	it('shows a stalled recovery call to action for stuck active runs', async () => {
		render(Page, {
			form: {} as never,
			data: buildTaskDetailPageData({
				availableSkills: {
					totalCount: 0,
					globalCount: 0,
					projectCount: 0,
					previewSkills: []
				},
				stalledRecovery: {
					eligible: true,
					headline: 'This task appears stalled.',
					detail:
						'No run heartbeat for 20m ago. No thread output for 22m ago. Recovering will retire the current run and queue fresh work.'
				},
				attachmentRoot: '/tmp/project/agent_output',
				artifactBrowser: {
					rootPath: '/tmp/project/agent_output',
					rootKind: 'directory',
					browsePath: '/tmp/project/agent_output',
					inspectingParentDirectory: false,
					directoryEntries: [],
					directoryEntriesTruncated: false,
					knownOutputs: [],
					errorMessage: ''
				},
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Primary app project',
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '',
					defaultRepoUrl: '',
					defaultBranch: ''
				},
				projects: [],
				goals: [],
				executionSurfaces: [],
				statusOptions: TASK_STATUS_OPTIONS,
				relatedRuns: [],
				dependencyTasks: [],
				task: {
					id: 'task_1',
					title: 'Attach a brief',
					summary: 'Need source documents',
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					area: 'product',
					goalId: '',
					priority: 'medium',
					status: 'ready',
					riskLevel: 'medium',
					approvalMode: 'none',
					requiresReview: true,
					desiredRoleId: 'role_coordinator',
					assigneeExecutionSurfaceId: null,
					assigneeName: 'Unassigned',
					agentThreadId: 'session_1',
					blockedReason: '',
					dependencyTaskIds: [],
					runCount: 2,
					latestRunId: 'run_2',
					latestRun: null,
					activeRun: {
						id: 'run_2',
						taskId: 'task_1',
						status: 'running'
					},
					hasActiveRun: true,
					artifactPath: '/tmp/project/agent_output',
					attachments: [],
					createdAt: '2026-03-30T11:00:00.000Z',
					updatedAt: '2026-03-30T12:00:00.000Z',
					updatedAtLabel: 'just now',
					openReview: null,
					pendingApproval: null,
					linkThread: {
						id: 'session_1',
						name: 'Thread continuity',
						cwd: '/tmp/project',
						sandbox: 'danger-full-access',
						model: null,
						threadId: 'thread_1',
						archivedAt: null,
						createdAt: '2026-03-30T10:00:00.000Z',
						updatedAt: '2026-03-30T12:00:00.000Z',
						origin: 'managed',
						threadState: 'working',
						latestRunStatus: 'running',
						hasActiveRun: true,
						canResume: false,
						runCount: 2,
						lastActivityAt: '2026-03-30T12:00:00.000Z',
						lastActivityLabel: 'just now',
						threadSummary: 'Thread continuity',
						lastExitCode: null,
						runTimeline: [],
						relatedTasks: [],
						latestRun: null,
						runs: []
					},
					linkThreadKind: 'assigned',
					statusThread: {
						id: 'session_1',
						name: 'Thread continuity',
						threadState: 'working',
						cwd: '/tmp/project',
						sandbox: 'danger-full-access',
						model: null,
						threadId: 'thread_1',
						archivedAt: null,
						createdAt: '2026-03-30T10:00:00.000Z',
						updatedAt: '2026-03-30T12:00:00.000Z',
						origin: 'managed',
						latestRunStatus: 'running',
						hasActiveRun: true,
						canResume: false,
						runCount: 2,
						lastActivityAt: '2026-03-30T12:00:00.000Z',
						lastActivityLabel: 'just now',
						threadSummary: 'Thread continuity',
						lastExitCode: null,
						runTimeline: [],
						relatedTasks: [],
						latestRun: null,
						runs: []
					}
				},
				candidateThreads: [],
				suggestedThread: null
			}) as never
		});

		expect(document.body.textContent).toContain('Stalled recovery');
		expect(document.body.textContent).toContain('This task appears stalled.');
		expect(document.body.textContent).toContain('Recover stalled run');
	});
});
