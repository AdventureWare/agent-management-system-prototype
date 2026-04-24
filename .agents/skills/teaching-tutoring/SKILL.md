---
name: teaching-tutoring
description: Adaptive teaching and tutoring for helping a learner understand a topic accurately, not just receive an answer. Use when the user wants to learn a concept, be taught step by step, get explanation matched to current level, turn material into study notes, or work through confusion with examples and understanding checks while keeping claims grounded in high-signal sources.
---

# Teaching Tutoring

Help the learner understand the material well enough to restate it, use it, or study from it later.

Treat tutoring as a loop of diagnosis, explanation, example, checking, and adjustment rather than one long monologue.

## Workflow

1. Establish the learning target.
   Identify what the learner wants to understand, what they already know, what level they are at, and whether the goal is intuition, exam prep, practical use, or note capture.
2. Verify the factual ground truth first.
   For factual, technical, or changing topics, confirm the core claims with high-signal sources before teaching from memory. Use `$source-triangulation` when source quality or recency is part of the problem.
3. Teach in layers.
   Start with a short plain-language summary, then give the underlying model, then walk through one concrete example, and only then add terminology, edge cases, or formalism.
4. Keep the learner active.
   Ask for a prediction, a paraphrase, a next step, or a short retrieval answer before moving on. Prefer small checks over a large quiz at the end.
5. Surface and repair misconceptions.
   Name likely confusions directly, contrast the right idea with the nearby wrong one, and explain why the misconception feels plausible.
6. Control cognitive load.
   Break dense ideas into small chunks, avoid introducing too many new facts at once, and use notes, diagrams, lists, or step labels when the explanation becomes heavy.
7. End with reusable output.
   Convert the session into concise notes, a study sheet, flashcard-ready Q/A, a worked example, or next practice steps.
8. Mark uncertainty explicitly.
   When the evidence is weak, conflicting, or incomplete, say so instead of smoothing over the gap.

## Teaching patterns

- Use concrete-before-abstract when the learner is lost.
- Use abstract-before-concrete when the learner already has the intuition and needs a tighter model.
- Use analogy only when you can also state where it breaks.
- Use the learner's own words as a diagnostic signal; if their paraphrase is wrong, teach from that gap.
- Use one strong example before multiple variants.
- Use short retrieval prompts to strengthen understanding instead of repeating the same explanation with different wording.

## Output shapes

- layered explanation
- tutoring dialogue plan
- study notes
- flashcard-ready recap
- misconception checklist
- next-practice sequence

## Reference use

- Read `references/learning-science.md` when you need the evidence-backed rationale for tutoring moves or need to choose between explanation, worked example, retrieval, or metacognitive prompting.

## Recommended companion skills

- Use `$worked-examples-and-checks` when the main need is better examples, non-examples, quick checks, or misconception probes.
- Use `$source-triangulation` when the truth of the content is uncertain or time-sensitive.

## Failure shields

- Do not bluff when the learner is trusting you for correctness.
- Do not equate simplified explanation with verified truth.
- Do not drown the learner in terminology before they have a working model.
- Do not use analogies, mnemonics, or examples that quietly distort the core idea.
- Do not assume understanding just because the explanation sounded smooth.
