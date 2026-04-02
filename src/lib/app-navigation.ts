export type AppNavigationLinkId =
	| 'home'
	| 'improvements'
	| 'tasks'
	| 'sessions'
	| 'runs'
	| 'projects'
	| 'goals'
	| 'planning'
	| 'workers'
	| 'roles'
	| 'providers';

export type AppNavigationRoute =
	| '/app/home'
	| '/app/improvements'
	| '/app/tasks'
	| '/app/sessions'
	| '/app/runs'
	| '/app/projects'
	| '/app/goals'
	| '/app/planning'
	| '/app/workers'
	| '/app/roles'
	| '/app/providers';

export type AppNavigationLink = {
	id: AppNavigationLinkId;
	label: string;
	href: AppNavigationRoute;
};

export type AppNavigationSection = {
	id: 'overview' | 'work' | 'context' | 'capacity';
	title: string;
	description: string;
	links: AppNavigationLink[];
};

export const appNavigationSections: AppNavigationSection[] = [
	{
		id: 'overview',
		title: 'Overview',
		description: 'Cross-cutting system state',
		links: [
			{ id: 'home', label: 'Home', href: '/app/home' },
			{ id: 'improvements', label: 'Improvements', href: '/app/improvements' }
		]
	},
	{
		id: 'work',
		title: 'Work',
		description: 'Queue, continuity, and execution',
		links: [
			{ id: 'tasks', label: 'Tasks', href: '/app/tasks' },
			{ id: 'sessions', label: 'Threads', href: '/app/sessions' },
			{ id: 'runs', label: 'Runs', href: '/app/runs' }
		]
	},
	{
		id: 'context',
		title: 'Context',
		description: 'Project, outcome, and planning structure',
		links: [
			{ id: 'projects', label: 'Projects', href: '/app/projects' },
			{ id: 'goals', label: 'Goals', href: '/app/goals' },
			{ id: 'planning', label: 'Planning', href: '/app/planning' }
		]
	},
	{
		id: 'capacity',
		title: 'Capacity',
		description: 'Routing, staffing, and providers',
		links: [
			{ id: 'workers', label: 'Workers', href: '/app/workers' },
			{ id: 'roles', label: 'Roles', href: '/app/roles' },
			{ id: 'providers', label: 'Providers', href: '/app/providers' }
		]
	}
];
