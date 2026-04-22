export type AppToastInput = {
	message: string;
	tone?: 'success' | 'error' | 'info';
	durationMs?: number;
};

export type AppToastRecord = AppToastInput & {
	id: string;
};

const APP_TOAST_EVENT = 'ams:app-toast';

export function showAppToast(input: AppToastInput) {
	if (typeof window === 'undefined') {
		return;
	}

	window.dispatchEvent(
		new CustomEvent<AppToastInput>(APP_TOAST_EVENT, {
			detail: input
		})
	);
}

export function subscribeAppToasts(callback: (toast: AppToastRecord) => void) {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const handler = (event: Event) => {
		const customEvent = event as CustomEvent<AppToastInput>;
		const detail = customEvent.detail;

		if (!detail?.message) {
			return;
		}

		callback({
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			tone: detail.tone ?? 'info',
			durationMs: detail.durationMs ?? 2200,
			message: detail.message
		});
	};

	window.addEventListener(APP_TOAST_EVENT, handler as EventListener);

	return () => {
		window.removeEventListener(APP_TOAST_EVENT, handler as EventListener);
	};
}
