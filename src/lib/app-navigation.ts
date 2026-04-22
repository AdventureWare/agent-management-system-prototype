export type AppNavigationLinkId =
	| 'governance'
	| 'access'
	| 'tasks'
	| 'threads'
	| 'runs'
	| 'agentUse'
	| 'projects'
	| 'goals'
	| 'taskTemplates'
	| 'workflows'
	| 'planning'
	| 'executionSurfaces'
	| 'roles'
	| 'providers';

export type AppNavigationRoute =
	| '/app/governance'
	| '/app/access'
	| '/app/tasks'
	| '/app/threads'
	| '/app/runs'
	| '/app/agent-use'
	| '/app/projects'
	| '/app/goals'
	| '/app/task-templates'
	| '/app/workflows'
	| '/app/planning'
	| '/app/execution-surfaces'
	| '/app/roles'
	| '/app/providers';

export type AppNavigationLink = {
	id: AppNavigationLinkId;
	label: string;
	href: AppNavigationRoute;
};

export type AppNavigationSection = {
	id: 'work' | 'context' | 'capacity' | 'governance';
	title: string;
	description: string;
	links: AppNavigationLink[];
};

export const appNavigationSections: AppNavigationSection[] = [
	{
		id: 'context',
		title: 'Context',
		description: 'Project, outcome, and planning structure',
		links: [
			{ id: 'projects', label: 'Projects', href: '/app/projects' },
			{ id: 'goals', label: 'Goals', href: '/app/goals' }
		]
	},
	{
		id: 'work',
		title: 'Work',
		description: 'Queue, continuity, and execution',
		links: [
			{ id: 'tasks', label: 'Tasks', href: '/app/tasks' },
			{ id: 'taskTemplates', label: 'Task templates', href: '/app/task-templates' },
			{ id: 'workflows', label: 'Workflows', href: '/app/workflows' },
			{ id: 'planning', label: 'Planning', href: '/app/planning' },
			{ id: 'threads', label: 'Threads', href: '/app/threads' },
			{ id: 'runs', label: 'Runs', href: '/app/runs' },
			{ id: 'agentUse', label: 'Agent use', href: '/app/agent-use' }
		]
	},
	{
		id: 'capacity',
		title: 'Capacity',
		description: 'Routing, staffing, and providers',
		links: [
			{ id: 'executionSurfaces', label: 'Surfaces', href: '/app/execution-surfaces' },
			{ id: 'roles', label: 'Roles', href: '/app/roles' },
			{ id: 'providers', label: 'Providers', href: '/app/providers' }
		]
	},
	{
		id: 'governance',
		title: 'Governance',
		description: 'Review, approval, and escalation flow',
		links: [
			{ id: 'governance', label: 'Governance', href: '/app/governance' },
			{ id: 'access', label: 'Access', href: '/app/access' }
		]
	}
];
