import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/app/projects/[projectId]/+page.svelte', () => {
	it('renders the project danger zone and disables deletion when tasks remain', async () => {
		render(Page, {
			form: {} as never,
			data: {
				project: {
					id: 'project_1',
					name: 'Agent Management System Prototype',
					summary: 'Prototype summary',
					parentProjectId: null,
					projectRootFolder: '/tmp/project',
					defaultArtifactRoot: '/tmp/project/agent_output',
					defaultRepoPath: '/tmp/project',
					defaultRepoUrl: 'git@github.com:org/repo.git',
					defaultBranch: 'main',
					defaultThreadSandbox: null
				},
				parentProject: null,
				projectLineage: [
					{
						id: 'project_1',
						name: 'Agent Management System Prototype'
					}
				],
				parentProjectOptions: [
					{
						id: 'project_2',
						label: 'Agent Management System Prototype / Kwipoo website'
					}
				],
				childProjects: [
					{
						id: 'project_2',
						name: 'Kwipoo website',
						summary: 'Marketing site',
						taskCount: 1,
						goalCount: 1
					}
				],
				projectSkillInventory: {
					projectId: 'project_1',
					projectName: 'Agent Management System Prototype',
					projectHref: '/app/projects/project_1',
					totalCount: 1,
					projectCount: 1,
					globalCount: 0,
					requestedSkillCount: 2,
					requestingTaskCount: 1,
					missingRequestedSkillCount: 1,
					tasksMissingRequestedSkillCount: 1,
					missingRequestedSkills: [{ id: 'release-runner', requestingTaskCount: 1 }],
					installedSkills: [
						{
							id: 'docs-writer',
							description: 'Write project docs',
							global: false,
							project: true,
							sourceLabel: 'Project',
							availability: 'enabled',
							availabilityLabel: 'Enabled for project',
							availabilityNotes: 'Required by docs tasks.'
						}
					],
					previewSkills: []
				},
				permissionSurface: {
					effectiveSandbox: 'workspace-write',
					sandboxSource: 'Fallback until an execution surface or provider override is chosen',
					summary: {
						trackedPathCount: 3,
						blockerCount: 0,
						macosPromptCount: 1,
						outsideSandboxCount: 1
					},
					localPaths: [
						{
							id: 'project-root-folder',
							label: 'Project root folder',
							path: '/tmp/project',
							importance: 'Required for every thread start.',
							requiredForLaunch: true,
							accessStatus: 'ready',
							accessMessage: 'Accessible to the current app process.',
							accessGuidance: null,
							coverageStatus: 'project_root',
							coverageLabel: 'Inside project root',
							coverageMessage: 'Covered because the path lives under the thread workspace root.',
							recommendedAction: null
						},
						{
							id: 'artifact-root',
							label: 'Default artifact root',
							path: '/Users/test/Library/Mobile Documents/com~apple~CloudDocs/Shared',
							importance: 'Used when task outputs land outside the thread workspace.',
							requiredForLaunch: false,
							accessStatus: 'macos_cloud_probe_blocked',
							accessMessage: 'macOS blocked the direct access probe for this cloud-synced folder.',
							accessGuidance:
								'AMS will still let a danger-full-access run try the real Codex launch path, but Files and Folders or iCloud Drive approval may still be required.',
							coverageStatus: 'outside_sandbox',
							coverageLabel: 'Outside sandbox',
							coverageMessage:
								'Not automatically writable from a standard thread launch. Move it under the project root, add it as an additional writable root, or use danger-full-access.',
							recommendedAction:
								'Retry the task first. If the run still fails, grant Files and Folders or iCloud Drive access to the app or terminal running AMS.'
						}
					]
				},
				relatedGoals: [
					{
						id: 'goal_1',
						name: 'Ship deletion',
						area: 'product',
						status: 'running',
						summary: 'Goal summary',
						artifactPath: '/tmp/project/agent_output/goals/ship-deletion',
						taskCount: 1
					}
				],
				relatedTasks: [
					{
						id: 'task_1',
						title: 'Finish deletion flow',
						summary: 'Wire delete behavior',
						status: 'ready',
						priority: 'high',
						projectName: 'Kwipoo website',
						artifactPath: '/tmp/project/agent_output/tasks/task_1',
						goalName: 'Ship deletion',
						assigneeName: 'Coordinator',
						openReview: null,
						pendingApproval: null,
						hasUnmetDependencies: false,
						updatedAtLabel: 'just now'
					}
				],
				folderOptions: [],
				sandboxOptions: ['workspace-write'],
				contextScope: {
					projectIds: ['project_1', 'project_2'],
					directTaskCount: 0,
					rolledUpTaskCount: 1,
					childProjectCount: 1
				},
				metrics: {
					totalTasks: 1,
					activeTasks: 1,
					reviewTasks: 0,
					pendingApprovals: 0,
					blockedTasks: 0,
					goalCount: 1,
					childProjectCount: 1
				}
			} as never
		});

		expect(document.body.textContent).toContain('Parent and subproject context');
		expect(document.body.textContent).toContain('Project skill inventory');
		expect(document.body.textContent).toContain('docs-writer');
		expect(document.body.textContent).toContain('release-runner');
		expect(document.body.textContent).toContain('Kwipoo website');
		expect(document.body.textContent).toContain('Delete project');
		expect(document.body.textContent).toContain('Local access and sandbox coverage');
		expect(document.body.textContent).toContain('macOS protected');
		expect(document.body.textContent).toContain('Outside sandbox');
		expect(document.body.textContent).toContain(
			'promotes any child projects to the next parent level'
		);
		expect(document.querySelector('button[type="submit"][disabled]')).toBeNull();
	});
});
