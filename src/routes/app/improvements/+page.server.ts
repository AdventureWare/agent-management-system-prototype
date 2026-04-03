import type { PageServerLoad } from './$types';
import { loadControlPlane } from '$lib/server/control-plane';
import { loadSelfImprovementSnapshot } from '$lib/server/self-improvement-store';
import type { Goal } from '$lib/types/control-plane';

const ROOT_GOAL_PARENT_KEY = '__root__';

function buildImprovementGoalOptions(goals: Goal[]) {
	const goalIds = new Set(goals.map((goal) => goal.id));
	const childrenByParent = new Map<string, Goal[]>();

	for (const goal of goals) {
		const parentKey =
			goal.parentGoalId && goalIds.has(goal.parentGoalId)
				? goal.parentGoalId
				: ROOT_GOAL_PARENT_KEY;
		const siblings = childrenByParent.get(parentKey) ?? [];
		siblings.push(goal);
		childrenByParent.set(parentKey, siblings);
	}

	for (const siblings of childrenByParent.values()) {
		siblings.sort((left, right) => left.name.localeCompare(right.name));
	}

	const orderedGoals: Array<{
		id: string;
		name: string;
		label: string;
	}> = [];
	const visitedGoalIds = new Set<string>();

	function visitChildren(parentKey: string, depth: number) {
		for (const goal of childrenByParent.get(parentKey) ?? []) {
			if (visitedGoalIds.has(goal.id)) {
				continue;
			}

			visitedGoalIds.add(goal.id);
			orderedGoals.push({
				id: goal.id,
				name: goal.name,
				label: `${depth > 0 ? `${'> '.repeat(depth)}` : ''}${goal.name}`
			});
			visitChildren(goal.id, depth + 1);
		}
	}

	visitChildren(ROOT_GOAL_PARENT_KEY, 0);

	for (const goal of [...goals].sort((left, right) => left.name.localeCompare(right.name))) {
		if (visitedGoalIds.has(goal.id)) {
			continue;
		}

		orderedGoals.push({
			id: goal.id,
			name: goal.name,
			label: goal.name
		});
		visitChildren(goal.id, 1);
	}

	return orderedGoals;
}

export const load: PageServerLoad = async () => {
	const controlPlane = await loadControlPlane();

	return {
		snapshot: await loadSelfImprovementSnapshot({
			data: controlPlane,
			trackImpression: true
		}),
		projects: [...controlPlane.projects]
			.map((project) => ({
				id: project.id,
				name: project.name
			}))
			.sort((left, right) => left.name.localeCompare(right.name)),
		goals: buildImprovementGoalOptions(controlPlane.goals)
	};
};
