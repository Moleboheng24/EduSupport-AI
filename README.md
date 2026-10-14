# EduSupport AI

Portfolio prototype of an explainable student-support and early-intervention platform.

- Synthetic dataset (120 records) loads automatically; anonymised CSV upload with validation and preview.
- Transparent, configurable rule-based analysis (not a trained/validated model), template-based explanations and recommendations.
- Educator review (accept / edit / defer / dismiss), action tracking with follow-up dates, insights, CSV export and printable report.
- All processing is deterministic and runs in the browser; data is stored in localStorage (single-user, not a secure database). No API keys required.

Setup: `bun install && bun run dev`.
