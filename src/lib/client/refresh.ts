export function userIsEditingFormControl(doc: Document = document) {
	const activeElement = doc.activeElement;

	if (!(activeElement instanceof HTMLElement)) {
		return false;
	}

	if (activeElement.isContentEditable) {
		return true;
	}

	return ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName);
}

export function shouldPauseRefresh(options: { force?: boolean; doc?: Document } = {}) {
	if (options.force) {
		return false;
	}

	const doc = options.doc ?? document;

	return doc.hidden || userIsEditingFormControl(doc);
}
