# FBPLY Money Score Architecture Specification

Status: specification only  
Scope: product architecture, scoring principles, explainability, and future analytics definitions  
Rule: the score must help users understand their money system, not judge them

## A. Inputs

Money Score should use only app-owned, user-provided, and user-reviewed data. It should measure stability, coverage, consistency, and open obligations rather than income size or wealth.

| Input | What it measures | Example signals | Suggested weight |
| --- | --- | --- | --- |
| Bill coverage | Whether known upcoming fixed obligations are covered by current monthly room. | Income exists, monthly commitments are known, safe room remains after fixed bills and EMIs, upcoming due items are not creating negative room. | 30% |
| Spending stability | Whether recent spending is readable and not unusually concentrated or volatile. | Recent expense count, month-to-date usage, category concentration, day-to-day spikes, safe-to-spend trend. | 20% |
| Savings consistency | Whether the user is maintaining visible saving behavior. | Active savings goals, saved-vs-target progress, recurring/monthly contribution, recent goal updates. | 20% |
| Repayment status | Whether money the user owes is under control. | Borrow/lend entries marked pending vs settled, overdue repayments, payable amount relative to monthly room. | 15% |
| Collection status | Whether money owed back to the user is visible and being resolved. | Shared expense recoveries, receivables, settlement status, old uncollected balances. | 15% |
| Data confidence | Whether there is enough recent data to show a score responsibly. | At least two meaningful factor groups, recent activity, setup completeness, reviewed statement rows if used. | Gate, not booster |

Data confidence should never inflate the score. It only decides whether FBPLY can show a score, show a Learning state, or lower confidence in the explanation.

## B. Exclusions

Money Score must not use inputs that turn it into a wealth, status, investment, or credit-like score.

Do not contribute:

- Absolute income size.
- Net worth or wealth.
- Investment holdings, returns, stock/crypto activity, or portfolio size.
- Property ownership, vehicle ownership, or asset value.
- Credit score, external credit history, loan eligibility, or bureau-like signals.
- Bank name, employer, job title, age, gender, location, caste, religion, or any demographic signal.
- Ad behavior, support payments, founder/admin status, device type, or app engagement unrelated to money clarity.
- Raw statement upload volume unless rows are reviewed and relevant to spending stability.

Income may be used only as a denominator for coverage and pressure ratios. A higher-income user should not receive a higher score simply for earning more.

## C. Formula Logic

Recommendation: use an internal 0-100 normalized score, but display a 5-state rating to users.

Why:

- 0-100 is useful internally for trend detection, score-improved/declined events, and consistent weighting.
- A visible 0-100 score can imply false precision and make the product feel judgmental.
- A 5-state display is easier to explain and safer for a daily money companion.

High-level formula:

```text
if confidence is insufficient:
  state = Learning
else:
  internalScore =
    billCoverageScore * 0.30 +
    spendingStabilityScore * 0.20 +
    savingsConsistencyScore * 0.20 +
    repaymentStatusScore * 0.15 +
    collectionStatusScore * 0.15

  apply caps and guardrails
  map internalScore to display label
```

Factor rules:

- Each factor should produce 0-100 internally.
- Missing optional factors should not automatically punish the user.
- Active factor weights should be normalized when optional factors are absent.
- Required core factors are bill coverage or spending stability plus at least one of savings, repayment, or collection.
- If fewer than two meaningful factor groups exist, show Learning.
- A severe unresolved obligation should cap the score even if other factors are strong.
- Recent improvements should be reflected gradually, not through instant large jumps.

Suggested caps:

| Condition | Cap |
| --- | --- |
| No recent activity and setup is incomplete | Learning |
| Bills or EMIs appear uncovered | Max 60 |
| Overdue repayment from user is unresolved | Max 70 |
| Spending data is too sparse | Max 75 |
| Score depends on only two factor groups | Max 80 |
| Statement data is unreviewed or low confidence | Do not include it |

## D. Labels

Recommended user-facing labels:

| State | Internal range | Meaning |
| --- | --- | --- |
| Learning | No reliable score | FBPLY needs more recent or complete data before rating the money system. |
| Needs Attention | 0-49 | One or more current obligations or spending patterns needs review. |
| Building | 50-64 | The foundation exists, but one clear action could improve stability. |
| Healthy | 65-79 | The current month is mostly readable and under control. |
| Strong | 80-100 | Bills, spending, savings, and people-money obligations look consistent. |

Avoid labels such as Poor, Bad, Failing, Rich, Wealthy, Excellent Credit, or Financially Free.

## E. User Explanation

Every score must show exactly one primary reason. The reason should be specific, calm, and action-oriented when needed.

Explanation format:

```text
{reason}
```

Examples:

- "All upcoming bills are covered."
- "Savings goals have recent progress."
- "One repayment is still pending."
- "Spending is higher than usual this month."
- "Shared expense recovery is still open."
- "FBPLY needs more recent activity to score this safely."

Reason selection priority:

1. If Learning, explain the missing confidence.
2. If a hard cap applies, explain the cap reason.
3. If the score declined, explain the largest negative change.
4. If the score improved, explain the largest positive change.
5. Otherwise, explain the strongest stable factor.

Do not show multiple competing reasons in the compact score. A deeper details view may show factor cards later, but the score itself should stay simple.

## F. Edge Cases

| Case | Expected behavior |
| --- | --- |
| New user with only setup income | Show Learning. Do not reward income size. |
| User has no savings goals | Do not punish by default. Exclude savings factor unless goals exist or the user has chosen a savings preference workflow. |
| User has no borrow/lend or shared expenses | Exclude repayment and collection factors. Do not treat absence as perfect behavior. |
| User has high income but uncovered bills | Score should stay capped by coverage risk. |
| User has low income but bills are covered and spending is stable | Score can be Healthy or Strong. |
| One large planned purchase or bill spike | Prefer "review" language and avoid harsh downgrades unless coverage is actually affected. |
| Old pending receivable | Lower collection status gradually with age, but do not frame it as user failure. |
| Statement uploaded but not reviewed | Do not include statement data in score. |
| Contradictory or sparse data | Show Learning or lower confidence; do not guess. |
| User edits data after a bad score | Recalculate from current state, but avoid instant artificial jumps beyond caps. |

## G. Analytics

No analytics changes are part of this specification. Future analytics should be privacy-light, amount-free where possible, and focused on product usefulness rather than user judgment.

Future event definitions:

| Event | When it fires | Suggested properties |
| --- | --- | --- |
| `money_score_viewed` | User sees the Money Score module. | `score_state`, `confidence_state`, `surface` |
| `money_score_improved` | Display state improves or internal score crosses a meaningful threshold. | `previous_state`, `next_state`, `change_bucket`, `primary_factor` |
| `money_score_declined` | Display state declines or internal score crosses a meaningful threshold downward. | `previous_state`, `next_state`, `change_bucket`, `primary_factor` |
| `money_score_reason_viewed` | User opens score explanation details, if such a view exists later. | `score_state`, `primary_factor`, `surface` |
| `money_score_learning_shown` | Learning state is shown instead of a score. | `missing_factor_count`, `surface` |

Analytics guardrails:

- Do not send income, exact balances, exact bill amounts, names, merchants, people names, trip names, notes, or raw statement text.
- Use buckets instead of raw score deltas, such as `small`, `medium`, or `large`.
- Track score state changes only after meaningful recalculation, not on every render.
- Do not use Money Score events for ads, lending, credit, or eligibility decisions.

Final product rule: Money Score is a clarity signal. It should tell the user what is steady, what needs review, and why, without implying personal worth or financial status.
