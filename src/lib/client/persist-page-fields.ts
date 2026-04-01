type PersistedFieldValue = string | string[] | boolean | null;
type PersistableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const STORAGE_PREFIX = 'ams:field';

function isPersistableField(node: Element): node is PersistableField {
	return (
		node instanceof HTMLInputElement ||
		node instanceof HTMLTextAreaElement ||
		node instanceof HTMLSelectElement
	);
}

function isSkippableField(field: PersistableField) {
	if (field.closest('[data-persist-scope="manual"]')) {
		return true;
	}

	if (field.hasAttribute('data-persist-off') || field.disabled) {
		return true;
	}

	if (!(field instanceof HTMLInputElement)) {
		return false;
	}

	return ['button', 'submit', 'reset', 'file', 'hidden', 'image', 'password'].includes(field.type);
}

function getPersistableFields(root: HTMLElement) {
	return Array.from(root.querySelectorAll('input, textarea, select')).filter(
		(node): node is PersistableField => isPersistableField(node) && !isSkippableField(node)
	);
}

function getFieldScope(root: HTMLElement, field: PersistableField) {
	const parentForm = field.closest('form');

	if (!parentForm || !root.contains(parentForm)) {
		return 'standalone';
	}

	const forms = Array.from(root.querySelectorAll('form')).filter(
		(form) => !form.closest('[data-persist-scope="manual"]')
	);
	const formIndex = forms.indexOf(parentForm);
	const action = parentForm.getAttribute('action') ?? '';
	const method = parentForm.getAttribute('method') ?? 'get';

	return `form:${formIndex}:${method}:${action}`;
}

function getFieldIdentifier(field: PersistableField) {
	const baseIdentifier =
		field.getAttribute('name') ??
		field.getAttribute('id') ??
		field.getAttribute('aria-label') ??
		field.getAttribute('placeholder') ??
		'';
	const type = field instanceof HTMLInputElement ? field.type : field.tagName.toLowerCase();

	return `${type}:${baseIdentifier || 'anonymous'}`;
}

function getFieldStorageKey(root: HTMLElement, field: PersistableField) {
	const scope = getFieldScope(root, field);
	const identifier = getFieldIdentifier(field);
	const peerIndex = getPersistableFields(root)
		.filter(
			(candidate) =>
				getFieldScope(root, candidate) === scope && getFieldIdentifier(candidate) === identifier
		)
		.indexOf(field);

	return `${STORAGE_PREFIX}:${window.location.pathname}:${scope}:${identifier}:${peerIndex}`;
}

function readStoredValue(storageKey: string): PersistedFieldValue {
	const rawValue = window.localStorage.getItem(storageKey);

	if (!rawValue) {
		return null;
	}

	try {
		return JSON.parse(rawValue) as PersistedFieldValue;
	} catch {
		window.localStorage.removeItem(storageKey);
		return null;
	}
}

function writeStoredValue(storageKey: string, value: PersistedFieldValue) {
	if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
		window.localStorage.removeItem(storageKey);
		return;
	}

	window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function readFieldValue(field: PersistableField): PersistedFieldValue {
	if (field instanceof HTMLTextAreaElement) {
		return field.value;
	}

	if (field instanceof HTMLSelectElement) {
		return field.multiple
			? Array.from(field.selectedOptions).map((option) => option.value)
			: field.value;
	}

	if (field.type === 'checkbox') {
		return field.checked;
	}

	if (field.type === 'radio') {
		return field.checked ? field.value : null;
	}

	return field.value;
}

function dispatchFieldUpdate(field: PersistableField) {
	const eventName =
		field instanceof HTMLInputElement &&
		!['checkbox', 'radio'].includes(field.type) &&
		field.type !== 'range'
			? 'input'
			: 'change';

	field.dispatchEvent(new Event(eventName, { bubbles: true }));
}

function restoreFieldValue(root: HTMLElement, field: PersistableField) {
	const storedValue = readStoredValue(getFieldStorageKey(root, field));

	if (storedValue === null) {
		return;
	}

	if (field instanceof HTMLTextAreaElement) {
		field.value = typeof storedValue === 'string' ? storedValue : '';
		dispatchFieldUpdate(field);
		return;
	}

	if (field instanceof HTMLSelectElement) {
		if (field.multiple) {
			const selectedValues = new Set(Array.isArray(storedValue) ? storedValue : []);

			for (const option of field.options) {
				option.selected = selectedValues.has(option.value);
			}
		} else {
			field.value = typeof storedValue === 'string' ? storedValue : '';
		}

		dispatchFieldUpdate(field);
		return;
	}

	if (field.type === 'checkbox') {
		field.checked = storedValue === true;
		dispatchFieldUpdate(field);
		return;
	}

	if (field.type === 'radio') {
		field.checked = typeof storedValue === 'string' && field.value === storedValue;
		dispatchFieldUpdate(field);
		return;
	}

	field.value = typeof storedValue === 'string' ? storedValue : '';
	dispatchFieldUpdate(field);
}

export function persistPageFields(root: HTMLElement) {
	const cleanups: Array<() => void> = [];
	const registeredFields = new WeakSet<PersistableField>();

	function registerField(field: PersistableField) {
		if (registeredFields.has(field) || isSkippableField(field)) {
			return;
		}

		registeredFields.add(field);
		restoreFieldValue(root, field);

		const persist = () => {
			writeStoredValue(getFieldStorageKey(root, field), readFieldValue(field));
		};

		field.addEventListener('input', persist);
		field.addEventListener('change', persist);
		cleanups.push(() => {
			field.removeEventListener('input', persist);
			field.removeEventListener('change', persist);
		});
	}

	for (const field of getPersistableFields(root)) {
		registerField(field);
	}

	const observer = new MutationObserver((records) => {
		for (const record of records) {
			for (const node of record.addedNodes) {
				if (!(node instanceof Element)) {
					continue;
				}

				if (isPersistableField(node)) {
					registerField(node);
				}

				for (const field of node.querySelectorAll('input, textarea, select')) {
					if (isPersistableField(field)) {
						registerField(field);
					}
				}
			}
		}
	});

	observer.observe(root, { childList: true, subtree: true });

	return {
		destroy() {
			observer.disconnect();

			for (const cleanup of cleanups) {
				cleanup();
			}
		}
	};
}
