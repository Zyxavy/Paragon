
### 1. Surface the success metrics the product already defines (strongest recommendation)

PRD §12 defines three metrics the *product itself* is measured by — floor-hold rate, review completion rate, system survival rate — but there's no UI showing any of them to the user today. This is the most defensible next feature because it's not new scope, it's finishing what's already specified:

- **Floor-hold rate** (% of Instances marked `full`/`floor`, not `missed`, per system, rolling 4 weeks) — a natural addition to the System Detail page, sitting right next to the existing Streak widget.
- **Review completion rate** — could live on the Review Day view ("3 of 4 systems reviewed with a change applied this month").

This is explicitly *not* the same as the out-of-scope "cross-system life health score" (PRD §11) — it's per-system, which keeps it inside the guardrails already drawn.

### 2. Minimum Viable Day prompt

`insights.md` names this directly as a suggested-but-unbuilt idea: during onboarding or review, ask *"What would count as a win on your worst day?"* — essentially reframing the floor action question more explicitly. Small UI addition (a prompt/tooltip in the System Creator or Review form), no new data model.

### 3. If-Then scaffolding in the floor action / review flow

Also from `insights.md`: *"If I can't do the full protocol, then I do the floor"* as an explicit structured field rather than an implicit convention. Could be a small addition to the Review form's "what broke" flow — turning a reflection into a pre-committed rule for next time, which is the mechanism the research base (Gollwitzer's if-then data cited throughout `sources.md`) says actually works.

### 4. Keyboard shortcuts on the Dashboard

`insights.md` flags this explicitly: *"keyboard shortcuts (f/g/m) for full/floor/missed to reduce taps further; not in v1 scope."* Directly serves PRD Principle 2 ("remove the decision, not just the friction") and is cheap — no backend change, just event listeners on the existing dashboard state buttons.
