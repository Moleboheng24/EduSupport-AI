import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/common";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Solution Architecture — EduSupport AI" },
      { name: "description", content: "End-to-end architecture of the EduSupport AI prototype." },
      { property: "og:title", content: "Solution Architecture — EduSupport AI" },
      { property: "og:description", content: "End-to-end architecture of the EduSupport AI prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArchitecturePage,
});

const SECTIONS = [
    { h: 'Architecture flow', p: 'Data input → Validation and preprocessing → Analysis engine → Insights and explanations → Human review → Support action → Outcome tracking' },
    { h: '1. Data input [Implemented]', p: 'Built-in seeded synthetic generator (120 records) or anonymised CSV upload. Output: raw records.' },
    { h: '2. Validation and preprocessing [Implemented]', p: 'Checks required columns, blocks identifying columns (names, emails, ID numbers), validates 0–100 ranges, engagement values and duplicates; missing values are kept and flagged. Shows a preview before processing.' },
    { h: '3. Analysis engine [Implemented — deterministic]', p: 'Transparent points-based rules with configurable thresholds, run in the browser (TypeScript). Output: category, score, contributing factors, qualitative uncertainty. Not a trained model.' },
    { h: '4. Insights and explanations [Implemented — template-based]', p: 'Plain-language explanations and recommendations are produced from templates tied to observed indicators. Pearson correlations and data-quality summaries are real calculations.' },
    { h: '5. Human review [Implemented]', p: 'Educators accept, edit, defer or dismiss every suggestion. Nothing is actioned automatically.' },
    { h: '6. Support action and 7. Outcome tracking [Implemented]', p: 'Actions with notes, follow-up dates and status, saved in browser local storage (single-user, not a secure database).' },
    { h: 'Technologies', p: 'TanStack Start (React 19), TypeScript, Tailwind CSS, Recharts, browser localStorage. No external AI service is called in this prototype, so no API keys are needed or exposed.' },
    { h: 'Future enhancements [Not implemented]', p: 'Server-side AI explanations via a secured AI gateway using only anonymised indicators; secure multi-user database with role-based access and audit logs; validated model trained and evaluated on consented data with fairness testing; outcome evaluation of interventions.' },
];

function ArchitecturePage() {
  return (
    <>
      <PageHeader title="Solution Architecture" description="End-to-end architecture of the EduSupport AI prototype." />
      <Panel title="Architecture diagram" className="mb-4">
        <pre className="overflow-x-auto text-xs leading-relaxed">{`[Synthetic generator] --+
                        +--> [Validation] --> [Rule engine] --> [Insights & explanations]
[CSV upload] -----------+                                            |
                                                                     v
[Reports / CSV export] <-- [Action tracker] <-- [Educator review] <--+
                 (all in browser, localStorage persistence)`}</pre>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Panel key={s.h} title={s.h}>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.p}</p>
          </Panel>
        ))}
      </div>
    </>
  );
}
