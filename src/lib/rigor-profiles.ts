import type { Project, RigorProfile, Task } from '$lib/types/control-plane';

export const DEFAULT_RIGOR_PROFILE: RigorProfile = 'INTERNAL';

export type RigorProfileGuidance = {
	label: string;
	summary: string;
	readinessExpectation: string;
	validationExpectations: string[];
	promptInstructions: string[];
};

export function resolveEffectiveRigorProfile(input: {
	task?: Pick<Task, 'rigorProfile'> | null;
	project?: Pick<Project, 'defaultRigorProfile'> | null;
}): RigorProfile {
	return input.task?.rigorProfile ?? input.project?.defaultRigorProfile ?? DEFAULT_RIGOR_PROFILE;
}

export function getRigorProfileGuidance(profile: RigorProfile): RigorProfileGuidance {
	switch (profile) {
		case 'EXPLORATION':
			return {
				label: 'Exploration',
				summary: 'Learning, discovery, brainstorming, research, and uncertainty reduction.',
				readinessExpectation:
					'May be ready with a focused question, useful sources or local evidence, and clear next-step recommendations.',
				validationExpectations: [
					'Record evidence, sources, commands, or files checked.',
					'State uncertainty, assumptions, and recommended next actions.',
					'Do not require implementation-grade tests unless the exploration changes code.'
				],
				promptInstructions: [
					'Optimize for uncertainty reduction and decision support.',
					'Produce findings, assumptions, and recommended next steps rather than production changes.'
				]
			};
		case 'SPIKE':
			return {
				label: 'Spike',
				summary: 'Quick reversible experiments or technical probes where learning speed matters.',
				readinessExpectation:
					'May be ready with a bounded experiment, rollback path, and a clear learning question.',
				validationExpectations: [
					'Keep changes small and reversible.',
					'Run a smoke check or targeted proof that answers the question.',
					'Call out rough edges and follow-up hardening work.'
				],
				promptInstructions: [
					'Favor a small reversible experiment over broad polish.',
					'Report what was learned, what is rough, and what should be hardened next.'
				]
			};
		case 'PROTOTYPE':
			return {
				label: 'Prototype',
				summary: 'Early working functionality or demos where speed and iteration matter.',
				readinessExpectation:
					'Should have a bounded outcome, scope, smoke validation, and known rough edges.',
				validationExpectations: [
					'Run build, type, unit, or smoke checks that cover the changed slice.',
					'Document known rough edges and follow-up hardening tasks.',
					'Avoid production release gates unless risk requires them.'
				],
				promptInstructions: [
					'Implement a bounded working slice and validate it with lightweight checks.',
					'Keep production hardening out of scope unless the task explicitly asks for it.'
				]
			};
		case 'BETA':
			return {
				label: 'Beta',
				summary:
					'Limited external or user exposure with stronger validation and clearer known issues.',
				readinessExpectation:
					'Needs acceptance criteria, regression checks, user-facing behavior review, and known-issues notes.',
				validationExpectations: [
					'Run targeted regression checks and relevant build/type tests.',
					'Review user-facing copy, states, and known issues.',
					'Escalate ambiguous release-impact decisions for review.'
				],
				promptInstructions: [
					'Validate user-facing behavior and regression risk, not only code compilation.',
					'Call out known issues and release-facing follow-up clearly.'
				]
			};
		case 'PRODUCTION':
			return {
				label: 'Production',
				summary: 'Real users, real data, public release, or durable operational systems.',
				readinessExpectation:
					'Needs strong acceptance criteria, tests, review, rollback or recovery consideration, and documentation where relevant.',
				validationExpectations: [
					'Run the strongest relevant automated checks.',
					'Consider rollback, migration safety, monitoring, and operational impact.',
					'Require human review before completion or release.'
				],
				promptInstructions: [
					'Apply production-grade validation proportional to the changed surface.',
					'Stop before deployment, migrations, destructive actions, or public release without explicit approval.'
				]
			};
		case 'HIGH_STAKES':
			return {
				label: 'High stakes',
				summary:
					'Money, legal/compliance, security, credentials, production data, public reputation, irreversible actions, or physical-world consequences.',
				readinessExpectation:
					'Agents may analyze, prepare, and propose, but should stop for explicit human approval before execution.',
				validationExpectations: [
					'Prepare analysis, options, risk review, and approval packet.',
					'Do not execute irreversible, external-state, credential, financial, legal, or security-sensitive actions autonomously.',
					'Require explicit human approval and a rollback or mitigation plan before action.'
				],
				promptInstructions: [
					'Analyze, prepare, and propose only unless explicit approval is present.',
					'Stop before irreversible, financial, legal, security, credential, production-data, or public actions.'
				]
			};
		case 'INTERNAL':
		default:
			return {
				label: 'Internal',
				summary:
					'Personal or internal tools and workflows that should be reliable and maintainable.',
				readinessExpectation:
					'Should have enough scope, validation, and maintainability notes for ongoing internal use.',
				validationExpectations: [
					'Run basic tests, type checks, or manual checks for the changed workflow.',
					'Keep maintainability and operator usability in view.',
					'Use review when the change affects shared behavior or recurring operations.'
				],
				promptInstructions: [
					'Use basic reliability checks and maintainability judgment.',
					'Avoid enterprise release ceremony unless the task risk or audience warrants it.'
				]
			};
	}
}
