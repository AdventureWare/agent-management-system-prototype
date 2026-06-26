# Autonomous Work Queue v0

The Autonomous Queue answers: "What should an agent work on next if there is available capacity?"

This v0 is selection and explanation only. It does not launch unattended execution.

## Ready Recommendations

A task is recommended only when all of these are true:

- Status is `ready`.
- The task is not blocked and has no unmet dependencies.
- There is no pending approval and no open review.
- Readiness is `R3_EXECUTABLE`, `R4_REVIEWABLE`, or `R5_AUTOMATABLE`.
- Autonomy is one of `A1` through `A4`.
- Risk is not `high` or `critical`.
- Validation quality is at least partial, meaning the task has validation steps, success criteria, or an expected outcome.

## Separate Sections

The page also surfaces work that should not be treated as ready autonomous execution:

- Blocked tasks: blocked status, blocked reason, or unmet dependencies.
- High-priority needs planning: high or urgent tasks that are underspecified, low-readiness, or missing execution-contract fields.
- High-risk requires review: high or critical risk tasks.

## Scoring

The scoring function is deterministic and intentionally simple. It combines:

- Task priority.
- Readiness level.
- Autonomy level.
- Goal planning priority.
- Review requirement.
- Validation quality.
- Risk level.
- Estimated effort when available.
- Constraint penalties.

Higher scores sort first. Small estimated tasks receive a modest boost so capacity can be used efficiently, but strategic priority and readiness dominate.

## Exclusions

`A5_AGENT_MAY_MERGE_DEPLOY_OR_CHANGE_EXTERNAL_STATE` is excluded from ready recommendations because it can change external state. High and critical risk tasks are also excluded from ready recommendations for v0, even if they otherwise look executable.
