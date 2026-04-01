import { browser } from '$app/environment';

export type FormDraftValue = string | string[] | boolean | null | undefined;
export type FormDraftRecord = Record<string, FormDraftValue>;

function isBlankValue(value: FormDraftValue) {
	if (typeof value === 'string') {
		return value.trim().length === 0;
	}

	if (Array.isArray(value)) {
		return value.every((entry) => entry.trim().length === 0);
	}

	return value !== true;
}

export function isFormDraftEmpty(values: FormDraftRecord) {
	return Object.values(values).every((value) => isBlankValue(value));
}

export function readFormDraft<T extends FormDraftRecord>(storageKey: string): Partial<T> | null {
	if (!browser) {
		return null;
	}

	const rawValue = window.localStorage.getItem(storageKey);

	if (!rawValue) {
		return null;
	}

	try {
		const parsed = JSON.parse(rawValue);
		return parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : null;
	} catch {
		window.localStorage.removeItem(storageKey);
		return null;
	}
}

export function writeFormDraft(storageKey: string, values: FormDraftRecord) {
	if (!browser) {
		return;
	}

	if (isFormDraftEmpty(values)) {
		window.localStorage.removeItem(storageKey);
		return;
	}

	window.localStorage.setItem(storageKey, JSON.stringify(values));
}

export function clearFormDraft(storageKey: string) {
	if (!browser) {
		return;
	}

	window.localStorage.removeItem(storageKey);
}
