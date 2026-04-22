<script lang="ts">
	import { base, resolve } from '$app/paths';
	import {
		artifactDownloadHref,
		artifactFileHref,
		artifactPreviewHref,
		artifactPreviewKind
	} from '$lib/artifact-links';
	import AppDialog from '$lib/components/AppDialog.svelte';

	type MessageBlock =
		| { type: 'heading'; text: string; level: number }
		| { type: 'paragraph'; text: string }
		| { type: 'list'; ordered: boolean; items: string[] }
		| { type: 'quote'; paragraphs: string[] }
		| { type: 'code'; text: string; language: string | null };

	type InlineToken =
		| { type: 'text'; value: string }
		| { type: 'strong'; children: InlineToken[] }
		| { type: 'emphasis'; children: InlineToken[] }
		| { type: 'strikethrough'; children: InlineToken[] }
		| { type: 'inlineCode'; value: string }
		| { type: 'markdownLink'; label: string; href: string }
		| { type: 'localPath'; path: string; reference: string }
		| { type: 'url'; value: string };

	type ArtifactReferenceStatus = 'file' | 'directory' | 'missing' | 'error';
	type DetectedReference =
		| { key: string; kind: 'artifact'; label: string; path: string; reference: string }
		| { key: string; kind: 'externalLink'; label: string; href: string }
		| { key: string; kind: 'appLink'; label: string; href: string };
	type ArtifactPreviewState = {
		path: string;
		label: string;
		kind: 'text' | 'image' | 'pdf' | null;
		status: 'idle' | 'loading' | 'ready' | 'error';
		content: string;
		errorMessage: string;
	};
	type ContextArtifactReference = {
		path: string;
		label: string;
		href: string;
		sourceLabel: string;
		actionLabel?: string;
	};
	type DetectedReferenceSummary = {
		references: DetectedReference[];
		artifactPaths: string[];
		counts: {
			artifacts: number;
			appLinks: number;
			externalLinks: number;
		};
	};

	function resolveUncheckedPath(href: string) {
		return `${base}${href}`;
	}

	const artifactReferenceStatusCache: Record<string, ArtifactReferenceStatus> = {};
	const pendingArtifactReferenceRequests: Record<string, Promise<ArtifactReferenceStatus>> = {};

	let {
		text,
		tone = 'default',
		showReferenceSummary = false,
		contextArtifacts = [],
		onAttachArtifact = undefined
	} = $props<{
		text: string | null | undefined;
		tone?: 'default' | 'muted';
		showReferenceSummary?: boolean;
		contextArtifacts?: ContextArtifactReference[];
		onAttachArtifact?:
			| ((artifact: { path: string; label: string }) => Promise<void> | void)
			| undefined;
	}>();

	const codeFencePattern = /^\s*```([\w+-]+)?\s*$/;
	const headingPattern = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/;
	const boldHeadingPattern = /^\s*\*\*(.+?)\*\*\s*$/;
	const bulletPattern = /^\s*[-*]\s+(.+?)\s*$/;
	const orderedPattern = /^\s*\d+\.\s+(.+?)\s*$/;
	const quotePattern = /^\s*>\s?(.*)$/;
	const inlineCodePattern = /`([^`\n]+)`/g;
	const strongPattern = /\*\*(?=\S)(.+?\S)\*\*/g;
	const emphasisPattern = /(?<!\*)\*(?=\S)(.+?\S)\*(?!\*)/g;
	const strikethroughPattern = /~~(?=\S)(.+?\S)~~/g;
	const rawUrlPattern = /https?:\/\/[^\s<>()]+[^\s<>().,!?;:]/g;
	const localPathPattern = /\/(?:Users|tmp|var|private|home)\/[^\s<>\]]+/g;
	const blankPattern = /^\s*$/;
	const hardBreakPattern = /(?: {2,}|\\)$/;

	let blocks = $derived.by(() => parseMessageBlocks(text ?? ''));
	let detectedReferenceSummary = $derived.by<DetectedReferenceSummary>(() => {
		const references = collectDetectedReferences(blocks);
		const artifactPaths: string[] = [];
		const seenArtifactPaths: string[] = [];
		const counts = {
			artifacts: 0,
			appLinks: 0,
			externalLinks: 0
		};

		for (const reference of references) {
			switch (reference.kind) {
				case 'artifact':
					counts.artifacts += 1;

					if (!seenArtifactPaths.includes(reference.path)) {
						seenArtifactPaths.push(reference.path);
						artifactPaths.push(reference.path);
					}
					break;
				case 'appLink':
					counts.appLinks += 1;
					break;
				case 'externalLink':
					counts.externalLinks += 1;
					break;
			}
		}

		return {
			references,
			artifactPaths,
			counts
		};
	});
	let detectedReferences = $derived(detectedReferenceSummary.references);
	let artifactStatuses = $state.raw<Record<string, ArtifactReferenceStatus>>({});
	let artifactReferencePaths = $derived(detectedReferenceSummary.artifactPaths);
	let referenceSummaryExpanded = $state(false);
	let referenceSummaryCounts = $derived(detectedReferenceSummary.counts);
	let previewDialogOpen = $state(false);
	let previewState = $state<ArtifactPreviewState>({
		path: '',
		label: '',
		kind: null,
		status: 'idle',
		content: '',
		errorMessage: ''
	});
	let contextArtifactByPath = $derived.by<Record<string, ContextArtifactReference>>(() =>
		Object.fromEntries(
			contextArtifacts.map(
				(artifact: ContextArtifactReference) => [artifact.path, artifact] as const
			)
		)
	);
	let copiedArtifactPath = $state<string | null>(null);
	let copiedCodeBlockKey = $state<string | null>(null);
	let attachActionState = $state<{
		path: string;
		status: 'loading' | 'success' | 'error';
		message: string;
	} | null>(null);

	$effect(() => {
		if (text !== undefined || text === undefined) {
			referenceSummaryExpanded = false;
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		if (artifactReferencePaths.length === 0) {
			artifactStatuses = {};
			return;
		}

		let cancelled = false;
		artifactStatuses = Object.fromEntries(
			artifactReferencePaths.flatMap((path) => {
				const cachedStatus = artifactReferenceStatusCache[path];
				return cachedStatus ? [[path, cachedStatus] as const] : [];
			})
		);

		void Promise.all(
			artifactReferencePaths.map(
				async (path) => [path, await loadArtifactReferenceStatus(path)] as const
			)
		).then((entries) => {
			if (cancelled) {
				return;
			}

			artifactStatuses = Object.fromEntries(entries);
		});

		return () => {
			cancelled = true;
		};
	});

	function parseMessageBlocks(source: string): MessageBlock[] {
		const normalized = source.replace(/\r\n?/g, '\n').trim();

		if (!normalized) {
			return [];
		}

		const lines = normalized.split('\n');
		const parsedBlocks: MessageBlock[] = [];
		let index = 0;

		while (index < lines.length) {
			const currentLine = lines[index];

			if (blankPattern.test(currentLine)) {
				index += 1;
				continue;
			}

			const fenceMatch = currentLine.match(codeFencePattern);
			if (fenceMatch) {
				index += 1;
				const codeLines: string[] = [];

				while (index < lines.length && !codeFencePattern.test(lines[index])) {
					codeLines.push(lines[index]);
					index += 1;
				}

				if (index < lines.length) {
					index += 1;
				}

				parsedBlocks.push({
					type: 'code',
					text: codeLines.join('\n'),
					language: fenceMatch[1] || null
				});
				continue;
			}

			const headingBlock = createHeadingBlock(currentLine);
			if (headingBlock) {
				parsedBlocks.push(headingBlock);
				index += 1;
				continue;
			}

			const bulletMatch = currentLine.match(bulletPattern);
			if (bulletMatch) {
				const items = [[bulletMatch[1]]];
				index += 1;

				while (index < lines.length) {
					const nextLine = lines[index];
					const nextBulletMatch = nextLine.match(bulletPattern);

					if (blankPattern.test(nextLine)) {
						break;
					}

					if (nextBulletMatch) {
						items.push([nextBulletMatch[1]]);
						index += 1;
						continue;
					}

					if (!startsStructuredBlock(nextLine)) {
						items[items.length - 1].push(nextLine);
						index += 1;
						continue;
					}

					break;
				}

				parsedBlocks.push({
					type: 'list',
					ordered: false,
					items: items.map((itemLines) => normalizeFlowContent(itemLines))
				});
				continue;
			}

			const orderedMatch = currentLine.match(orderedPattern);
			if (orderedMatch) {
				const items = [[orderedMatch[1]]];
				index += 1;

				while (index < lines.length) {
					const nextLine = lines[index];
					const nextOrderedMatch = nextLine.match(orderedPattern);

					if (blankPattern.test(nextLine)) {
						break;
					}

					if (nextOrderedMatch) {
						items.push([nextOrderedMatch[1]]);
						index += 1;
						continue;
					}

					if (!startsStructuredBlock(nextLine)) {
						items[items.length - 1].push(nextLine);
						index += 1;
						continue;
					}

					break;
				}

				parsedBlocks.push({
					type: 'list',
					ordered: true,
					items: items.map((itemLines) => normalizeFlowContent(itemLines))
				});
				continue;
			}

			const quoteMatch = currentLine.match(quotePattern);
			if (quoteMatch) {
				const quoteLines = [quoteMatch[1]];
				index += 1;

				while (index < lines.length) {
					const nextLine = lines[index];
					const nextQuoteMatch = nextLine.match(quotePattern);

					if (!nextQuoteMatch) {
						break;
					}

					quoteLines.push(nextQuoteMatch[1]);
					index += 1;
				}

				parsedBlocks.push({ type: 'quote', paragraphs: normalizeQuotedParagraphs(quoteLines) });
				continue;
			}

			const paragraphLines = [currentLine];
			index += 1;

			while (index < lines.length) {
				const nextLine = lines[index];

				if (blankPattern.test(nextLine) || startsStructuredBlock(nextLine)) {
					break;
				}

				paragraphLines.push(nextLine);
				index += 1;
			}

			parsedBlocks.push({ type: 'paragraph', text: normalizeFlowContent(paragraphLines) });
		}

		return parsedBlocks;
	}

	function normalizeFlowContent(lines: string[]) {
		let content = '';
		let previousLineHasHardBreak = false;

		for (const line of lines) {
			const cleanedLine = trimFlowLine(line);

			if (cleanedLine.length === 0) {
				continue;
			}

			if (content.length === 0) {
				content = cleanedLine;
			} else {
				content += previousLineHasHardBreak ? `\n${cleanedLine}` : ` ${cleanedLine}`;
			}

			previousLineHasHardBreak = hardBreakPattern.test(line);
		}

		return content.trim();
	}

	function normalizeQuotedParagraphs(lines: string[]) {
		const paragraphs: string[] = [];
		let currentParagraph: string[] = [];

		for (const line of lines) {
			if (blankPattern.test(line)) {
				if (currentParagraph.length > 0) {
					paragraphs.push(normalizeFlowContent(currentParagraph));
					currentParagraph = [];
				}
				continue;
			}

			currentParagraph.push(line);
		}

		if (currentParagraph.length > 0) {
			paragraphs.push(normalizeFlowContent(currentParagraph));
		}

		return paragraphs;
	}

	function trimFlowLine(line: string) {
		return line.replace(hardBreakPattern, '').trim();
	}

	function createHeadingBlock(line: string): MessageBlock | null {
		const markdownHeadingMatch = line.match(headingPattern);
		if (markdownHeadingMatch) {
			return {
				type: 'heading',
				level: markdownHeadingMatch[1].length,
				text: markdownHeadingMatch[2]
			};
		}

		const boldHeadingMatch = line.match(boldHeadingPattern);
		if (boldHeadingMatch && !boldHeadingMatch[1].includes('\n')) {
			return { type: 'heading', level: 3, text: boldHeadingMatch[1] };
		}

		return null;
	}

	function startsStructuredBlock(line: string) {
		return (
			codeFencePattern.test(line) ||
			Boolean(createHeadingBlock(line)) ||
			bulletPattern.test(line) ||
			orderedPattern.test(line) ||
			quotePattern.test(line)
		);
	}

	function bodyTextClass() {
		return tone === 'muted' ? 'text-slate-300' : 'text-slate-200';
	}

	function headingTextClass(level: number) {
		if (level <= 2) {
			return tone === 'muted'
				? 'text-base font-semibold text-slate-100'
				: 'text-base font-semibold text-white';
		}

		return tone === 'muted'
			? 'text-sm font-semibold text-slate-100'
			: 'text-sm font-semibold text-white';
	}

	function listTextClass() {
		return tone === 'muted'
			? 'text-slate-300 marker:text-slate-500'
			: 'text-slate-200 marker:text-slate-500';
	}

	function collectDetectedReferences(messageBlocks: MessageBlock[]) {
		const referencesByKey: Record<string, DetectedReference> = {};

		for (const block of messageBlocks) {
			const values =
				block.type === 'list'
					? block.items
					: block.type === 'quote'
						? block.paragraphs
						: [block.text];

			for (const value of values) {
				for (const token of collectReferenceTokens(parseInlineTokens(value))) {
					if (token.type === 'localPath') {
						referencesByKey[`artifact:${token.path}`] = {
							key: `artifact:${token.path}`,
							kind: 'artifact',
							label: localPathLabel(token.reference),
							path: token.path,
							reference: token.reference
						};
						continue;
					}

					if (
						token.type === 'markdownLink' &&
						token.href.startsWith('/') &&
						!isNavigableHref(token.href)
					) {
						const path = trimLocalPathFragment(token.href);
						referencesByKey[`artifact:${path}`] = {
							key: `artifact:${path}`,
							kind: 'artifact',
							label: token.label,
							path,
							reference: token.href
						};
						continue;
					}

					if (token.type === 'markdownLink' && token.href.startsWith('/app/')) {
						referencesByKey[`app:${token.href}`] = {
							key: `app:${token.href}`,
							kind: 'appLink',
							label: token.label,
							href: token.href
						};
						continue;
					}

					if (token.type === 'markdownLink' && token.href.startsWith('http')) {
						referencesByKey[`external:${token.href}`] = {
							key: `external:${token.href}`,
							kind: 'externalLink',
							label: token.label,
							href: token.href
						};
						continue;
					}

					if (token.type === 'url') {
						referencesByKey[`external:${token.value}`] = {
							key: `external:${token.value}`,
							kind: 'externalLink',
							label: urlLabel(token.value),
							href: token.value
						};
					}
				}
			}
		}

		return Object.values(referencesByKey);
	}

	function collectReferenceTokens(tokens: InlineToken[]): InlineToken[] {
		return tokens.flatMap((token) => {
			if (token.type === 'strong' || token.type === 'emphasis' || token.type === 'strikethrough') {
				return collectReferenceTokens(token.children);
			}

			return [token];
		});
	}

	function parseInlineTokens(text: string): InlineToken[] {
		const tokens: InlineToken[] = [];
		let cursor = 0;
		let linkMatch = findNextMarkdownLink(text, cursor);

		while (linkMatch) {
			if (linkMatch.index > cursor) {
				tokens.push(...parseStyledReferenceTokens(text.slice(cursor, linkMatch.index)));
			}

			tokens.push({
				type: 'markdownLink',
				label: linkMatch.label,
				href: normalizeMarkdownHref(linkMatch.href)
			});

			cursor = linkMatch.index + linkMatch.raw.length;
			linkMatch = findNextMarkdownLink(text, cursor);
		}

		if (cursor < text.length) {
			tokens.push(...parseStyledReferenceTokens(text.slice(cursor)));
		}

		return mergeAdjacentTextTokens(tokens);
	}

	function findNextMarkdownLink(text: string, startIndex: number) {
		let index = text.indexOf('[', startIndex);

		while (index >= 0) {
			const labelEnd = text.indexOf('](', index);

			if (labelEnd < 0) {
				return null;
			}

			const hrefStart = labelEnd + 2;
			let hrefEnd = -1;
			let parenDepth = 0;

			for (let cursor = hrefStart; cursor < text.length; cursor += 1) {
				const character = text[cursor];

				if (character === '(') {
					parenDepth += 1;
					continue;
				}

				if (character === ')') {
					if (parenDepth === 0) {
						hrefEnd = cursor;
						break;
					}

					parenDepth -= 1;
				}
			}

			if (hrefEnd > hrefStart) {
				return {
					index,
					raw: text.slice(index, hrefEnd + 1),
					label: text.slice(index + 1, labelEnd),
					href: text.slice(hrefStart, hrefEnd)
				};
			}

			index = text.indexOf('[', index + 1);
		}

		return null;
	}

	function parseStyledReferenceTokens(text: string): InlineToken[] {
		const tokens: InlineToken[] = [];
		let cursor = 0;

		while (cursor < text.length) {
			const nextMatch = nextInlineMatch(text, cursor);

			if (!nextMatch) {
				break;
			}

			if (nextMatch.index > cursor) {
				tokens.push({ type: 'text', value: text.slice(cursor, nextMatch.index) });
			}

			switch (nextMatch.kind) {
				case 'inlineCode':
					tokens.push({ type: 'inlineCode', value: nextMatch.value });
					break;
				case 'strong':
					tokens.push({ type: 'strong', children: parseInlineTokens(nextMatch.value) });
					break;
				case 'emphasis':
					tokens.push({ type: 'emphasis', children: parseInlineTokens(nextMatch.value) });
					break;
				case 'strikethrough':
					tokens.push({ type: 'strikethrough', children: parseInlineTokens(nextMatch.value) });
					break;
				case 'url':
					tokens.push({ type: 'url', value: nextMatch.value });
					break;
				case 'localPath':
					tokens.push({
						type: 'localPath',
						path: trimLocalPathFragment(nextMatch.value),
						reference: nextMatch.value
					});
					break;
			}

			cursor = nextMatch.end;
		}

		if (cursor < text.length) {
			tokens.push({ type: 'text', value: text.slice(cursor) });
		}

		return mergeAdjacentTextTokens(tokens);
	}

	function isNavigableHref(href: string) {
		return (
			href.startsWith('http://') ||
			href.startsWith('https://') ||
			href.startsWith('mailto:') ||
			href.startsWith('tel:') ||
			href.startsWith('/app/') ||
			href.startsWith('#')
		);
	}

	function nextInlineMatch(text: string, startIndex: number) {
		const matches = [
			firstRegexMatch(text, inlineCodePattern, startIndex, 'inlineCode'),
			firstRegexMatch(text, strongPattern, startIndex, 'strong'),
			firstRegexMatch(text, emphasisPattern, startIndex, 'emphasis'),
			firstRegexMatch(text, strikethroughPattern, startIndex, 'strikethrough'),
			firstReferenceMatch(text, rawUrlPattern, startIndex, 'url', 4),
			firstReferenceMatch(text, localPathPattern, startIndex, 'localPath', 5)
		].filter((match): match is NonNullable<typeof match> => match !== null);

		if (matches.length === 0) {
			return null;
		}

		return matches.reduce((earliest, candidate) => {
			if (candidate.index < earliest.index) {
				return candidate;
			}

			if (candidate.index === earliest.index && candidate.priority < earliest.priority) {
				return candidate;
			}

			return earliest;
		});
	}

	function firstRegexMatch(
		text: string,
		pattern: RegExp,
		startIndex: number,
		kind: 'inlineCode' | 'strong' | 'emphasis' | 'strikethrough'
	) {
		pattern.lastIndex = startIndex;
		const match = pattern.exec(text);
		pattern.lastIndex = 0;

		if (!match) {
			return null;
		}

		const priorityMap = {
			inlineCode: 0,
			strong: 1,
			strikethrough: 2,
			emphasis: 3
		} as const;

		return {
			kind,
			index: match.index,
			value: match[1] ?? '',
			end: match.index + match[0].length,
			priority: priorityMap[kind]
		};
	}

	function firstReferenceMatch(
		text: string,
		pattern: RegExp,
		startIndex: number,
		kind: 'url' | 'localPath',
		priority: number
	) {
		pattern.lastIndex = startIndex;
		const match = pattern.exec(text);
		pattern.lastIndex = 0;

		if (!match) {
			return null;
		}

		if (kind === 'localPath') {
			return normalizeLocalPathMatch(match[0], match.index);
		}

		const matches = [
			{
				kind,
				index: match.index,
				value: match[0],
				end: match.index + match[0].length,
				priority
			}
		];

		return matches[0];
	}

	function normalizeLocalPathMatch(value: string, index: number) {
		const trimmed = trimTrailingPathPunctuation(value);
		return {
			kind: 'localPath' as const,
			index,
			value: trimmed,
			end: index + trimmed.length,
			priority: 5
		};
	}

	function trimTrailingPathPunctuation(value: string) {
		let trimmed = value;

		while (trimmed.length > 0) {
			const lastCharacter = trimmed.at(-1);

			if (lastCharacter && /[,.!?;:]$/.test(lastCharacter)) {
				trimmed = trimmed.slice(0, -1);
				continue;
			}

			if (lastCharacter === ')' && unmatchedClosingParentheses(trimmed) > 0) {
				trimmed = trimmed.slice(0, -1);
				continue;
			}

			break;
		}

		return trimmed;
	}

	function unmatchedClosingParentheses(value: string) {
		let depth = 0;
		let unmatchedClosers = 0;

		for (const character of value) {
			if (character === '(') {
				depth += 1;
				continue;
			}

			if (character === ')') {
				if (depth === 0) {
					unmatchedClosers += 1;
					continue;
				}

				depth -= 1;
			}
		}

		if (depth < 0) {
			unmatchedClosers += Math.abs(depth);
		}

		return unmatchedClosers;
	}

	function normalizeMarkdownHref(href: string) {
		const trimmedHref = href.trim();
		return trimmedHref.startsWith('<') && trimmedHref.endsWith('>')
			? trimmedHref.slice(1, -1)
			: trimmedHref;
	}

	function splitLocalPathReference(reference: string) {
		const normalizedReference = normalizeMarkdownHref(reference);
		const hashLocationMatch = normalizedReference.match(/#L(\d+)(?:C(\d+))?$/);
		const referenceWithoutHash = hashLocationMatch
			? normalizedReference.slice(0, hashLocationMatch.index)
			: normalizedReference;
		const colonLocationMatch = referenceWithoutHash.match(/^(.*\/[^:]+):(\d+)(?::(\d+))?$/);

		if (colonLocationMatch) {
			return {
				path: colonLocationMatch[1],
				line: Number.parseInt(colonLocationMatch[2], 10),
				column: colonLocationMatch[3] ? Number.parseInt(colonLocationMatch[3], 10) : null,
				location: `L${colonLocationMatch[2]}${colonLocationMatch[3] ? `:${colonLocationMatch[3]}` : ''}`
			};
		}

		if (hashLocationMatch) {
			return {
				path: referenceWithoutHash,
				line: Number.parseInt(hashLocationMatch[1], 10),
				column: hashLocationMatch[2] ? Number.parseInt(hashLocationMatch[2], 10) : null,
				location: `L${hashLocationMatch[1]}${hashLocationMatch[2] ? `:${hashLocationMatch[2]}` : ''}`
			};
		}

		return {
			path: referenceWithoutHash,
			line: null,
			column: null,
			location: null
		};
	}

	function trimLocalPathFragment(reference: string) {
		return splitLocalPathReference(reference).path;
	}

	function localPathLabel(reference: string) {
		const { path, location } = splitLocalPathReference(reference);
		const name = path.split('/').pop() || path;
		return location ? `${name} ${location}` : name;
	}

	function localPathPreviewHref(reference: string) {
		return artifactPreviewHref(trimLocalPathFragment(reference));
	}

	function localArtifactPageHref(path: string) {
		const { path: normalizedPath, line, column } = splitLocalPathReference(path);
		return artifactFileHref(normalizedPath, { line, column });
	}

	function urlLabel(url: string) {
		try {
			const parsed = new URL(url);
			const label = `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
			return label.length > 56 ? `${label.slice(0, 53)}...` : label;
		} catch {
			return url.length > 56 ? `${url.slice(0, 53)}...` : url;
		}
	}

	function artifactReferenceStatus(path: string) {
		return artifactStatuses[path] ?? artifactReferenceStatusCache[path] ?? null;
	}

	function contextArtifactReference(path: string) {
		return contextArtifactByPath[path] ?? null;
	}

	function canOpenArtifactReference(path: string) {
		return artifactReferenceStatus(path) === 'file';
	}

	function canBrowseArtifactReference(path: string) {
		return artifactReferenceStatus(path) === 'directory';
	}

	function canPreviewArtifactReference(path: string) {
		return canOpenArtifactReference(path) && artifactPreviewKind(path) !== null;
	}

	function canWriteClipboard() {
		return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
	}

	function openExternalHref(href: string) {
		if (typeof window === 'undefined') {
			return;
		}

		window.open(href, '_blank', 'noopener,noreferrer');
	}

	function followDirectHref(href: string) {
		if (typeof window === 'undefined') {
			return;
		}

		window.location.href = href;
	}

	async function copyArtifactPath(path: string) {
		if (!canWriteClipboard()) {
			return;
		}

		try {
			await navigator.clipboard.writeText(path);
			copiedArtifactPath = path;

			window.setTimeout(() => {
				if (copiedArtifactPath === path) {
					copiedArtifactPath = null;
				}
			}, 1600);
		} catch {
			copiedArtifactPath = null;
		}
	}

	async function copyCodeBlock(text: string, key: string) {
		if (!canWriteClipboard()) {
			return;
		}

		try {
			await navigator.clipboard.writeText(text);
			copiedCodeBlockKey = key;

			window.setTimeout(() => {
				if (copiedCodeBlockKey === key) {
					copiedCodeBlockKey = null;
				}
			}, 1600);
		} catch {
			copiedCodeBlockKey = null;
		}
	}

	async function attachArtifactToFollowUp(path: string, label: string) {
		if (!onAttachArtifact) {
			return;
		}

		attachActionState = {
			path,
			status: 'loading',
			message: ''
		};

		try {
			await onAttachArtifact({ path, label });
			attachActionState = {
				path,
				status: 'success',
				message: ''
			};
		} catch (error) {
			attachActionState = {
				path,
				status: 'error',
				message: error instanceof Error ? error.message : 'Could not attach file.'
			};
		}
	}

	async function openArtifactPreview(reference: string, label: string) {
		const path = trimLocalPathFragment(reference);
		const kind = artifactPreviewKind(path);

		if (!kind) {
			return;
		}

		previewDialogOpen = true;
		previewState = {
			path,
			label,
			kind,
			status: 'loading',
			content: '',
			errorMessage: ''
		};

		if (kind === 'image' || kind === 'pdf') {
			previewState = {
				path,
				label,
				kind,
				status: 'ready',
				content: localPathPreviewHref(reference),
				errorMessage: ''
			};
			return;
		}

		try {
			const response = await fetch(localPathPreviewHref(reference));

			if (!response.ok) {
				throw new Error('Preview could not be loaded.');
			}

			previewState = {
				path,
				label,
				kind,
				status: 'ready',
				content: await response.text(),
				errorMessage: ''
			};
		} catch (error) {
			previewState = {
				path,
				label,
				kind,
				status: 'error',
				content: '',
				errorMessage: error instanceof Error ? error.message : 'Preview could not be loaded.'
			};
		}
	}

	async function loadArtifactReferenceStatus(path: string): Promise<ArtifactReferenceStatus> {
		const cachedStatus = artifactReferenceStatusCache[path];
		if (cachedStatus) {
			return cachedStatus;
		}

		const pendingStatus = pendingArtifactReferenceRequests[path];
		if (pendingStatus) {
			return pendingStatus;
		}

		const request = fetch(resolve(`/api/artifacts/inspect?path=${encodeURIComponent(path)}`))
			.then(async (response) => {
				if (!response.ok) {
					return 'error' as const;
				}

				const payload = (await response.json()) as { exists: boolean; kind: string };

				if (!payload.exists) {
					return 'missing' as const;
				}

				if (payload.kind === 'file') {
					return 'file' as const;
				}

				if (payload.kind === 'directory') {
					return 'directory' as const;
				}

				return 'error' as const;
			})
			.catch(() => 'error' as const)
			.then((status) => {
				artifactReferenceStatusCache[path] = status;
				delete pendingArtifactReferenceRequests[path];
				return status;
			});

		pendingArtifactReferenceRequests[path] = request;
		return request;
	}

	function mergeAdjacentTextTokens(tokens: InlineToken[]) {
		const mergedTokens: InlineToken[] = [];

		for (const token of tokens) {
			if (token.type === 'text' && token.value.length === 0) {
				continue;
			}

			const previousToken = mergedTokens.at(-1);
			if (token.type === 'text' && previousToken?.type === 'text') {
				previousToken.value += token.value;
				continue;
			}

			mergedTokens.push(token);
		}

		return mergedTokens;
	}
</script>

{#snippet inlineTokens(tokens: InlineToken[])}
	{#each tokens as token, tokenIndex (`${token.type}-${tokenIndex}`)}
		{#if token.type === 'text'}
			{token.value}
		{:else if token.type === 'strong'}
			<strong class="font-semibold text-white">
				{@render inlineTokens(token.children)}
			</strong>
		{:else if token.type === 'emphasis'}
			<em class="text-slate-100 italic">
				{@render inlineTokens(token.children)}
			</em>
		{:else if token.type === 'strikethrough'}
			<span class="text-slate-400 line-through decoration-slate-500/70">
				{@render inlineTokens(token.children)}
			</span>
		{:else if token.type === 'inlineCode'}
			<code
				class="rounded-md border border-slate-700/80 bg-slate-950/85 px-1.5 py-0.5 align-baseline font-mono text-[0.84em] text-sky-200"
			>
				{token.value}
			</code>
		{:else if token.type === 'markdownLink'}
			{#if isNavigableHref(token.href)}
				{#if token.href.startsWith('http://') || token.href.startsWith('https://')}
					<button
						type="button"
						title={token.href}
						class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-sky-800/70 bg-sky-950/35 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-sky-200 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:border-sky-700/90 hover:bg-sky-950/50 hover:text-sky-100"
						onclick={() => openExternalHref(token.href)}
					>
						{token.label}
					</button>
				{:else if token.href.startsWith('mailto:') || token.href.startsWith('tel:')}
					<button
						type="button"
						title={token.href}
						class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-sky-800/70 bg-sky-950/35 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-sky-200 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:border-sky-700/90 hover:bg-sky-950/50 hover:text-sky-100"
						onclick={() => followDirectHref(token.href)}
					>
						{token.label}
					</button>
				{:else}
					<a
						href={token.href}
						rel="external"
						title={token.href}
						class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-sky-800/70 bg-sky-950/35 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-sky-200 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:border-sky-700/90 hover:bg-sky-950/50 hover:text-sky-100"
					>
						{token.label}
					</a>
				{/if}
			{:else if token.href.startsWith('/')}
				{@const path = trimLocalPathFragment(token.href)}
				{#if canOpenArtifactReference(path)}
					<button
						type="button"
						title={token.href}
						class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-emerald-800/70 bg-emerald-950/30 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-emerald-200 underline decoration-emerald-500/60 decoration-1 underline-offset-4 transition hover:border-emerald-700/90 hover:bg-emerald-950/45 hover:text-emerald-100"
						onclick={() => followDirectHref(localArtifactPageHref(path))}
					>
						{token.label}
					</button>
				{:else if canBrowseArtifactReference(path)}
					<button
						type="button"
						title={token.href}
						class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-sky-800/70 bg-sky-950/30 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-sky-200 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:border-sky-700/90 hover:bg-sky-950/45 hover:text-sky-100"
						onclick={() => followDirectHref(localArtifactPageHref(path))}
					>
						{token.label}
					</button>
				{:else}
					<span
						title={`${token.href}${artifactReferenceStatus(path) === 'missing' ? ' (missing from disk)' : artifactReferenceStatus(path) === 'directory' ? ' (folder reference)' : ''}`}
						class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-slate-700/80 bg-slate-950/50 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-slate-300"
					>
						{token.label}
					</span>
				{/if}
			{:else}
				<span
					title={token.href}
					class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-sky-800/60 bg-sky-950/30 px-2 py-0.5 align-baseline text-[0.92em] font-medium text-sky-200"
				>
					{token.label}
				</span>
			{/if}
		{:else if token.type === 'localPath'}
			{#if canOpenArtifactReference(token.path)}
				<button
					type="button"
					title={token.reference}
					class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-emerald-800/70 bg-emerald-950/30 px-2 py-0.5 align-baseline font-mono text-[0.84em] text-emerald-200 underline decoration-emerald-500/60 decoration-1 underline-offset-4 transition hover:border-emerald-700/90 hover:bg-emerald-950/45 hover:text-emerald-100"
					onclick={() =>
						followDirectHref(localArtifactPageHref(trimLocalPathFragment(token.reference)))}
				>
					{localPathLabel(token.reference)}
				</button>
			{:else if canBrowseArtifactReference(token.path)}
				<button
					type="button"
					title={token.reference}
					class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-sky-800/70 bg-sky-950/30 px-2 py-0.5 align-baseline font-mono text-[0.84em] text-sky-200 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:border-sky-700/90 hover:bg-sky-950/45 hover:text-sky-100"
					onclick={() =>
						followDirectHref(localArtifactPageHref(trimLocalPathFragment(token.reference)))}
				>
					{localPathLabel(token.reference)}
				</button>
			{:else}
				<span
					title={`${token.reference}${artifactReferenceStatus(token.path) === 'missing' ? ' (missing from disk)' : artifactReferenceStatus(token.path) === 'directory' ? ' (folder reference)' : ''}`}
					class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-slate-700/80 bg-slate-950/50 px-2 py-0.5 align-baseline font-mono text-[0.84em] text-slate-300"
				>
					{localPathLabel(token.reference)}
				</span>
			{/if}
		{:else if token.type === 'url'}
			<button
				type="button"
				class="ui-wrap-anywhere inline-flex max-w-full items-center rounded-md border border-slate-700 bg-slate-950/80 px-1.5 py-0.5 align-baseline font-mono text-[0.84em] text-sky-300 underline decoration-sky-500/60 decoration-1 underline-offset-4 transition hover:border-sky-700/80 hover:text-sky-200"
				onclick={() => openExternalHref(token.value)}
			>
				{token.value}
			</button>
		{/if}
	{/each}
{/snippet}

{#snippet inlineText(text: string)}
	{@const lines = text.split('\n')}
	{#each lines as line, lineIndex (`${lineIndex}-${line}`)}
		{@render inlineTokens(parseInlineTokens(line))}
		{#if lineIndex < lines.length - 1}
			<br />
		{/if}
	{/each}
{/snippet}

<div class="space-y-3.5">
	{#if showReferenceSummary && detectedReferences.length > 0}
		<div class="rounded-lg border border-slate-800/80 bg-slate-950/70">
			<button
				type="button"
				class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
				onclick={() => {
					referenceSummaryExpanded = !referenceSummaryExpanded;
				}}
			>
				<div class="min-w-0">
					<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
						Referenced files and links
					</p>
					<p class="mt-1 text-xs text-slate-400">
						{detectedReferences.length} item{detectedReferences.length === 1 ? '' : 's'}
						{#if referenceSummaryCounts.artifacts > 0}
							· {referenceSummaryCounts.artifacts} file{referenceSummaryCounts.artifacts === 1
								? ''
								: 's'}
						{/if}
						{#if referenceSummaryCounts.appLinks > 0}
							· {referenceSummaryCounts.appLinks} app link{referenceSummaryCounts.appLinks === 1
								? ''
								: 's'}
						{/if}
						{#if referenceSummaryCounts.externalLinks > 0}
							· {referenceSummaryCounts.externalLinks} external link{referenceSummaryCounts.externalLinks ===
							1
								? ''
								: 's'}
						{/if}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/80 px-2 py-1 text-[11px] leading-none text-slate-300 uppercase"
					>
						{detectedReferences.length}
					</span>
					<span class="text-[11px] font-medium tracking-[0.14em] text-slate-300 uppercase">
						{referenceSummaryExpanded ? 'Collapse' : 'Expand'}
					</span>
				</div>
			</button>

			{#if referenceSummaryExpanded}
				<div class="border-t border-slate-800/80 px-3 py-2.5">
					<div class="space-y-2">
						{#each detectedReferences as reference (reference.key)}
							<div class="rounded-md border border-slate-800/80 bg-black/15 p-2.5">
								<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
									<div class="min-w-0">
										<p class="ui-wrap-anywhere text-sm font-medium text-white">
											{reference.label}
										</p>
										<p class="ui-wrap-anywhere mt-1 text-[11px] text-slate-500">
											{reference.kind === 'artifact' ? reference.reference : reference.href}
										</p>
									</div>
									<div class="flex flex-wrap items-center gap-2">
										{#if reference.kind === 'artifact'}
											{@const status = artifactReferenceStatus(reference.path)}
											{@const context = contextArtifactReference(reference.path)}
											<span
												class={`inline-flex items-center rounded-full px-2 py-1 text-[10px] leading-none uppercase ${
													status === 'file'
														? 'border border-emerald-800/70 bg-emerald-950/35 text-emerald-200'
														: status === 'missing'
															? 'border border-amber-900/70 bg-amber-950/35 text-amber-200'
															: status === 'directory'
																? 'border border-sky-900/70 bg-sky-950/35 text-sky-200'
																: 'border border-slate-700 bg-slate-950/70 text-slate-300'
												}`}
											>
												{status === 'file'
													? 'Available'
													: status === 'missing'
														? 'Missing'
														: status === 'directory'
															? 'Folder'
															: 'Checking'}
											</span>
											{#if context}
												<span
													class="inline-flex items-center rounded-full border border-sky-900/70 bg-sky-950/35 px-2 py-1 text-[10px] leading-none text-sky-200 uppercase"
												>
													{context.sourceLabel}
												</span>
											{/if}
											{#if context}
												<a
													href={context.href}
													rel="external"
													class="rounded-full border border-sky-800/70 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-sky-200 uppercase transition hover:border-sky-700/90 hover:text-sky-100"
												>
													{context.actionLabel ?? 'Jump'}
												</a>
											{/if}
											{#if canWriteClipboard()}
												<button
													type="button"
													class="rounded-full border border-slate-700 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
													onclick={() => {
														void copyArtifactPath(reference.path);
													}}
												>
													{copiedArtifactPath === reference.path ? 'Copied' : 'Copy path'}
												</button>
											{/if}
											{#if canOpenArtifactReference(reference.path)}
												{#if onAttachArtifact}
													<button
														type="button"
														class="rounded-full border border-violet-800/70 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-violet-200 uppercase transition hover:border-violet-700/90 hover:text-violet-100"
														disabled={attachActionState?.path === reference.path &&
															attachActionState.status === 'loading'}
														onclick={() => {
															void attachArtifactToFollowUp(reference.path, reference.label);
														}}
														title={attachActionState?.path === reference.path &&
														attachActionState.status === 'error'
															? attachActionState.message
															: undefined}
													>
														{attachActionState?.path === reference.path &&
														attachActionState.status === 'loading'
															? 'Attaching'
															: attachActionState?.path === reference.path &&
																  attachActionState.status === 'success'
																? 'Attached'
																: attachActionState?.path === reference.path &&
																	  attachActionState.status === 'error'
																	? 'Retry attach'
																	: 'Attach'}
													</button>
												{/if}
												<a
													href={resolveUncheckedPath(localArtifactPageHref(reference.reference))}
													class="rounded-full border border-sky-800/70 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-sky-200 uppercase transition hover:border-sky-700/90 hover:text-sky-100"
												>
													Open page
												</a>
												{#if canPreviewArtifactReference(reference.path)}
													<button
														type="button"
														class="rounded-full border border-slate-700 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-slate-200 uppercase transition hover:border-slate-600 hover:text-white"
														onclick={() => {
															void openArtifactPreview(reference.reference, reference.label);
														}}
													>
														Preview
													</button>
												{/if}
												<a
													href={resolveUncheckedPath(
														artifactDownloadHref(trimLocalPathFragment(reference.reference))
													)}
													class="rounded-full border border-emerald-800/70 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-emerald-200 uppercase transition hover:border-emerald-700/90 hover:text-emerald-100"
												>
													Download
												</a>
											{:else if canBrowseArtifactReference(reference.path)}
												<a
													href={resolveUncheckedPath(
														artifactFileHref(trimLocalPathFragment(reference.reference))
													)}
													class="rounded-full border border-sky-800/70 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-sky-200 uppercase transition hover:border-sky-700/90 hover:text-sky-100"
												>
													Browse
												</a>
											{/if}
										{:else if reference.kind === 'appLink'}
											<span
												class="inline-flex items-center rounded-full border border-sky-900/70 bg-sky-950/35 px-2 py-1 text-[10px] leading-none text-sky-200 uppercase"
											>
												App link
											</span>
											<a
												href={reference.href}
												rel="external"
												class="rounded-full border border-sky-800/70 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-sky-200 uppercase transition hover:border-sky-700/90 hover:text-sky-100"
											>
												Open
											</a>
										{:else}
											<span
												class="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] leading-none text-slate-300 uppercase"
											>
												External
											</span>
											<button
												type="button"
												class="rounded-full border border-slate-700 px-2.5 py-1.5 text-[11px] font-medium tracking-[0.12em] text-sky-200 uppercase transition hover:border-sky-700/90 hover:text-sky-100"
												onclick={() => openExternalHref(reference.href)}
											>
												Open
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#each blocks as block, index (`${block.type}-${index}`)}
		{#if block.type === 'heading'}
			<p class={`${headingTextClass(block.level)} ui-wrap-anywhere tracking-[0.01em]`}>
				{@render inlineText(block.text)}
			</p>
		{:else if block.type === 'paragraph'}
			<p class={`${bodyTextClass()} ui-wrap-anywhere text-sm leading-7`}>
				{@render inlineText(block.text)}
			</p>
		{:else if block.type === 'list'}
			<svelte:element
				this={block.ordered ? 'ol' : 'ul'}
				class={`${listTextClass()} ui-wrap-anywhere ml-5 space-y-2.5 text-sm leading-7 marker:font-semibold ${block.ordered ? 'list-decimal' : 'list-disc'}`}
			>
				{#each block.items as item, itemIndex (`${index}-${itemIndex}`)}
					<li class="pl-1">{@render inlineText(item)}</li>
				{/each}
			</svelte:element>
		{:else if block.type === 'quote'}
			<blockquote
				class="space-y-2 rounded-r-xl border-l-2 border-sky-800/70 bg-slate-950/35 px-4 py-3"
			>
				{#each block.paragraphs as paragraph, lineIndex (`${index}-${lineIndex}`)}
					<p class={`${bodyTextClass()} ui-wrap-anywhere text-sm leading-7 italic`}>
						{@render inlineText(paragraph)}
					</p>
				{/each}
			</blockquote>
		{:else}
			{@const codeBlockKey = `code-${index}`}
			<div
				class="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/95 shadow-[0_0_0_1px_rgba(15,23,42,0.35)]"
			>
				<div
					class="flex items-center justify-between gap-3 border-b border-slate-800/90 bg-slate-950/80 px-4 py-2.5"
				>
					<div class="min-w-0">
						<p class="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
							{block.language ?? 'Code'}
						</p>
					</div>
					{#if canWriteClipboard()}
						<button
							type="button"
							class="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
							onclick={() => {
								void copyCodeBlock(block.text, codeBlockKey);
							}}
						>
							{copiedCodeBlockKey === codeBlockKey ? 'Copied' : 'Copy'}
						</button>
					{/if}
				</div>
				<pre
					data-testid="thread-message-code-block"
					class="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-6 whitespace-pre text-slate-200 [tab-size:2]"><code
						>{block.text}</code
					></pre>
			</div>
		{/if}
	{/each}
</div>

<AppDialog
	bind:open={previewDialogOpen}
	title={previewState.label || 'Artifact preview'}
	description={previewState.path}
	panelClass="max-w-6xl"
	bodyClass="space-y-4"
	closeLabel="Close preview"
>
	{#if previewState.status === 'loading'}
		<p class="text-sm text-slate-300">Loading preview…</p>
	{:else if previewState.status === 'error'}
		<p class="text-sm text-amber-300">{previewState.errorMessage}</p>
	{:else if previewState.kind === 'image' && previewState.content}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
			<img
				src={previewState.content}
				alt={previewState.label}
				class="mx-auto max-h-[70vh] w-auto rounded-xl"
			/>
		</div>
	{:else if previewState.kind === 'pdf' && previewState.content}
		<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
			<iframe
				src={previewState.content}
				title={previewState.label || previewState.path}
				class="h-[72vh] w-full rounded-xl bg-white"
			></iframe>
		</div>
	{:else if previewState.kind === 'text'}
		<pre
			class="ui-wrap-anywhere overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-7 whitespace-pre-wrap text-slate-200">{previewState.content}</pre>
	{:else}
		<p class="text-sm text-slate-400">No preview is available for this artifact.</p>
	{/if}
</AppDialog>
