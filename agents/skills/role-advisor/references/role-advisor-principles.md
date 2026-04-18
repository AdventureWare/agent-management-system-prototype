# Role Advisor Principles

## Why this skill exists

A role advisor is useful when the real problem is routing ambiguity: the work is known, but the best owning role is not. The goal is to reduce ambiguity, compare nearby role boundaries honestly, and avoid creating new roles unless the missing responsibility is durable.

## Research-backed principles

### 1. Separate recommendation, decision, contribution, execution, and review

- Bain's RAPID framework separates `Recommend`, `Agree`, `Perform`, `Input`, and `Decide`, and describes the recommender as the role that gathers relevant input, develops a recommendation, has broad visibility and access to information, and needs trust and credibility across stakeholders.
- Atlassian's DACI framework similarly separates `Driver`, `Approver`, `Contributors`, and `Informed`, with contributors providing expertise but not owning the final call.
- Implication for this repo: a good role advisor should identify what kind of ownership the work needs instead of matching on title alone. Many bad routing decisions come from confusing recommendation work with decision authority or implementation work.

Sources:

- Bain, RAPID Decision Making: https://www.bain.com/insights/rapid-decision-making/
- Atlassian, DACI Framework: https://www.atlassian.com/team-playbook/plays/daci

### 2. Optimize for role clarity because ambiguity degrades performance

- Research on work role ambiguity consistently treats lack of clarity around responsibilities, means, or expected outcomes as a real organizational problem rather than a naming issue.
- Abramis's meta-analysis found role ambiguity negatively related to job satisfaction and performance.
- Implication for this repo: routing advice should leave the task author with clearer ownership boundaries than they started with. If the recommendation still leaves scope, means, or expected outputs muddy, the advice is weak.

Source:

- Abramis, _Work Role Ambiguity, Job Satisfaction, and Job Performance: Meta-Analyses and Review_: https://www.researchgate.net/publication/232579182_Work_Role_Ambiguity_Job_Satisfaction_and_Job_Performance_Meta-Analyses_and_Review

### 3. Good advisors do not only recommend; they analyze alternatives and critique weak framing

- Recent AI-assisted decision-making research found that a pure recommender role is not always the most effective AI role. Analyzer-style support can be preferable, especially when confidence or evidence quality is weaker.
- Implication for this repo: a strong role advisor should sometimes act as an analyzer or critic by showing overlaps, weak assumptions, and non-role fixes rather than rushing to a single role pick.

Source:

- Ma et al., _Beyond Recommender: An Exploratory Study of the Effects of Different AI Roles in AI-Assisted Decision Making_: https://arxiv.org/abs/2403.01791

## Practical heuristics for this project

- Prefer the narrowest existing role that can own the work outcome without distorting its purpose.
- Compare nearest neighbors explicitly. A routing recommendation is weak if the closest alternatives are not named and distinguished.
- Treat "best existing fit" and "best actual fit" as separate outputs when the catalog is imperfect.
- Recommend a new role only when the gap is durable, repeatable, and not better solved by a skill, tool, provider, execution surface, or workflow-instruction change.
- Define proposed new roles as responsibility contracts with owned outputs, non-goals, and overlaps, then hand off actual role authoring to `role-creator`.
