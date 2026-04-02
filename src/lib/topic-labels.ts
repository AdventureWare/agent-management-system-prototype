export function uniqueTopicLabels(topicLabels: readonly string[] | null | undefined) {
	return [...new Set((topicLabels ?? []).filter((topicLabel) => topicLabel.trim().length > 0))];
}
