import type {
	AssistantAction,
	AssistantContextObject,
	AssistantContextSnapshot,
	AssistantPageType
} from '$lib/assistant/types';

type PageLike = {
	url: URL;
	data: Record<string, unknown>;
};

function hasRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

function toContextObject(
	type: AssistantContextObject['type'],
	record: unknown,
	nameKeys: string[]
): AssistantContextObject | null {
	if (!hasRecord(record)) {
		return null;
	}

	const id = readString(record.id);
	const name = nameKeys.map((key) => readString(record[key])).find(Boolean) ?? '';

	if (!id || !name) {
		return null;
	}

	return {
		type,
		id,
		name,
		projectId: readString(record.projectId) || null,
		goalId: readString(record.goalId) || null,
		roleId: readString(record.roleId) || null,
		summary: readString(record.summary) || readString(record.description) || null
	};
}

function findById(records: unknown, id: string) {
	return Array.isArray(records)
		? records.find((record) => hasRecord(record) && readString(record.id) === id)
		: null;
}

function inferPageType(pathname: string): AssistantPageType {
	if (pathname === '/app') return 'dashboard';
	if (pathname === '/app/projects') return 'project_list';
	if (/^\/app\/projects\/[^/]+$/.test(pathname)) return 'project_detail';
	if (pathname === '/app/goals') return 'goal_list';
	if (/^\/app\/goals\/[^/]+$/.test(pathname)) return 'goal_detail';
	if (pathname === '/app/tasks') return 'task_list';
	if (/^\/app\/tasks\/[^/]+$/.test(pathname)) return 'task_detail';
	if (pathname === '/app/roles') return 'role_list';
	if (/^\/app\/roles\/[^/]+$/.test(pathname)) return 'role_detail';
	if (pathname === '/app/execution-surfaces') return 'agent_list';
	if (/^\/app\/execution-surfaces\/[^/]+$/.test(pathname)) return 'agent_detail';
	if (pathname === '/app/workflows') return 'workflow_list';
	if (/^\/app\/workflows\/[^/]+$/.test(pathname)) return 'workflow_detail';

	return 'unknown';
}

function visibleCapabilities(pageType: AssistantPageType): AssistantAction[] {
	switch (pageType) {
		case 'project_detail':
			return ['create_task', 'create_goal'];
		case 'goal_detail':
			return ['create_goal', 'create_task'];
		case 'task_detail':
			return ['create_task', 'create_goal'];
		case 'role_detail':
			return ['create_agent', 'create_role', 'create_task'];
		case 'agent_list':
		case 'agent_detail':
			return ['create_agent', 'create_task'];
		case 'workflow_detail':
			return ['create_task', 'create_goal'];
		case 'role_list':
			return ['create_role', 'create_agent'];
		case 'goal_list':
			return ['create_goal', 'create_task'];
		case 'task_list':
			return ['create_task', 'create_goal'];
		default:
			return ['create_task', 'create_goal', 'create_role', 'create_agent'];
	}
}

export function buildAssistantContext(page: PageLike): AssistantContextSnapshot {
	const route = `${page.url.pathname}${page.url.search}`;
	const pageType = inferPageType(page.url.pathname);
	let currentObject: AssistantContextObject | null = null;
	const breadcrumbs: AssistantContextObject[] = [];

	if (pageType === 'task_detail') {
		currentObject = toContextObject('task', page.data.task, ['title', 'name']);
	} else if (pageType === 'project_detail') {
		currentObject = toContextObject('project', page.data.project, ['name', 'title']);

		if (Array.isArray(page.data.projectLineage)) {
			for (const lineageProject of page.data.projectLineage) {
				const breadcrumb = toContextObject('project', lineageProject, ['name', 'title']);

				if (breadcrumb && breadcrumb.id !== currentObject?.id) {
					breadcrumbs.push(breadcrumb);
				}
			}
		}
	} else if (pageType === 'goal_detail') {
		currentObject = toContextObject('goal', page.data.goal, ['name', 'title']);
	} else if (pageType === 'role_detail') {
		currentObject = toContextObject('role', page.data.role, ['name', 'title']);
	} else if (pageType === 'role_list') {
		const selectedRoleId = page.url.searchParams.get('role')?.trim() ?? '';
		currentObject = toContextObject('role', findById(page.data.roles, selectedRoleId), [
			'name',
			'title'
		]);
	} else if (pageType === 'workflow_detail') {
		currentObject = toContextObject('workflow', page.data.workflow, ['name', 'title']);
		const project = toContextObject('project', page.data.project, ['name', 'title']);
		if (project) {
			breadcrumbs.push(project);
		}
	} else if (pageType === 'agent_detail') {
		currentObject = toContextObject('agent', page.data.executionSurface, ['name', 'title']);
	}

	if (currentObject?.projectId) {
		const project = toContextObject(
			'project',
			findById(page.data.projects, currentObject.projectId),
			['name', 'title']
		);

		if (project) {
			breadcrumbs.unshift(project);
		}
	}

	return {
		route,
		pageType,
		currentObject,
		selectedObjects: [],
		breadcrumbs,
		visibleCapabilities: visibleCapabilities(pageType)
	};
}
