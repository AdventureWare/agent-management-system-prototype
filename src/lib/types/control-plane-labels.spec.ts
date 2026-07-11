import { describe, expect, it } from 'vitest';

import { formatEnumLabel } from './control-plane';

describe('control-plane label formatting', () => {
	it('formats snake-case derived loop values for shared readback surfaces', () => {
		expect(formatEnumLabel('actionable_now')).toBe('Actionable Now');
		expect(formatEnumLabel('awaiting_review')).toBe('Awaiting Review');
		expect(formatEnumLabel('approval_required')).toBe('Approval Required');
	});

	it('leaves already-readable values stable enough for operator labels', () => {
		expect(formatEnumLabel('Ready')).toBe('Ready');
		expect(formatEnumLabel('needs planning')).toBe('Needs Planning');
	});
});
