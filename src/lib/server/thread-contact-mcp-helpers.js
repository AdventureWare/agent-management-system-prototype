// @ts-nocheck

function buildThreadSearchParams(options = {}, input = {}) {
	const params = new URLSearchParams();

	if (options.q) {
		params.set('q', options.q);
	}

	if (options.role) {
		params.set('role', options.role);
	}

	if (options.project) {
		params.set('project', options.project);
	}

	if (options.taskId) {
		params.set('taskId', options.taskId);
	}

	if (options.sourceThreadId ?? input.sourceThreadId) {
		params.set('sourceThreadId', options.sourceThreadId ?? input.sourceThreadId);
	}

	if (options.includeArchived) {
		params.set('includeArchived', '1');
	}

	if (options.canContact || input.canContact) {
		params.set('canContact', '1');
	}

	if (options.limit) {
		params.set('limit', String(options.limit));
	}

	return params;
}

export function createThreadContactMcpHandlers({
	request,
	currentThreadId,
	requireThreadId,
	readRequiredString
}) {
	async function resolveThreadCandidates(identifier, input = {}) {
		const normalizedIdentifier = identifier?.trim();
		const params = buildThreadSearchParams(
			{
				q: normalizedIdentifier,
				limit: input.limit ?? '25',
				...(input.canContact ? { canContact: true } : {}),
				...(input.includeArchived ? { includeArchived: true } : {})
			},
			{
				sourceThreadId: input.sourceThreadId ?? '',
				canContact: input.canContact
			}
		);
		const payload = await request(`/api/agents/threads?${params.toString()}`);
		return Array.isArray(payload.threads) ? payload.threads : [];
	}

	async function resolveThreadIdentifier(identifier, input = {}) {
		const normalizedIdentifier = identifier?.trim();

		if (!normalizedIdentifier) {
			throw new Error('Target thread id or handle is required.');
		}

		if (normalizedIdentifier.startsWith('thread_')) {
			return normalizedIdentifier;
		}

		const threads = await resolveThreadCandidates(normalizedIdentifier, input);
		const exactMatch = threads.find(
			(thread) => thread?.id === normalizedIdentifier || thread?.handle === normalizedIdentifier
		);

		if (exactMatch?.id) {
			return exactMatch.id;
		}

		if (threads.length === 1 && threads[0]?.id) {
			return threads[0].id;
		}

		if (threads.length > 1) {
			const suggestions = threads
				.slice(0, 5)
				.map((thread) => `${thread.handle ?? thread.id} (${thread.name})`)
				.join(', ');

			throw new Error(`Handle "${normalizedIdentifier}" is ambiguous. Try one of: ${suggestions}`);
		}

		throw new Error(
			`Could not resolve thread handle "${normalizedIdentifier}". Use an exact handle or thread id.`
		);
	}

	return {
		resolveThreadCandidates,
		resolveThreadIdentifier,
		ams_thread_resolve: async (args) =>
			resolveThreadCandidates(readRequiredString(args.query, 'query'), {
				sourceThreadId: args.sourceThreadId ?? currentThreadId,
				canContact: args.canContact,
				includeArchived: args.includeArchived,
				limit: args.limit
			}),
		ams_thread_contact: async (args) => {
			const sourceThreadId = args.sourceThreadId ?? currentThreadId;
			requireThreadId(sourceThreadId);
			const targetThreadId = await resolveThreadIdentifier(
				readRequiredString(args.targetThreadIdOrHandle, 'targetThreadIdOrHandle'),
				{
					sourceThreadId,
					canContact: true
				}
			);
			return request(`/api/agents/threads/${encodeURIComponent(targetThreadId)}/messages`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					sourceThreadId,
					prompt: readRequiredString(args.prompt, 'prompt'),
					contactType: args.type ?? 'question',
					contextSummary: args.context ?? '',
					replyRequested: args.replyRequested !== false,
					replyToContactId: args.replyToContactId ?? null
				})
			});
		},
		ams_thread_contacts: async (args) => {
			const threadId = args.threadIdOrHandle
				? await resolveThreadIdentifier(args.threadIdOrHandle, {
						includeArchived: true
					})
				: currentThreadId;
			requireThreadId(threadId);
			const params = new URLSearchParams();

			if (args.limit) {
				params.set('limit', String(args.limit));
			}

			const payload = await request(
				`/api/agents/threads/${encodeURIComponent(threadId)}/contacts${params.size > 0 ? `?${params.toString()}` : ''}`
			);
			return payload.contacts ?? [];
		}
	};
}
