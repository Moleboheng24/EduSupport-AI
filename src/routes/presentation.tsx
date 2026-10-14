import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/common";

export const Route = createFileRoute("/presentation")({
  head: () => ({
    meta: [
      { title: "Project Presentation — EduSupport AI" },
      { name: "description", content: "A ten-part story of the EduSupport AI project with talking points." },
      { property: "og:title", content: "Project Presentation — EduSupport AI" },
      { property: "og:description", content: "A ten-part story of the EduSupport AI project with talking points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PresentationPage,
});

const SECTIONS = [
    { h: '1. The problem', p: 'Talking points: Support needs are often noticed only after performance has already dropped. Early signals exist across attendance, assignments and engagement but are scattered.' },
    { h: '2. Who it affects', p: 'Talking points: Students who miss timely help; teachers, advisors and coordinators with limited time to review many records.' },
    { h: '3. The proposed solution', p: 'Talking points: An explainable assistant that brings indicators together, suggests which records may merit a review, and proposes supportive next steps — always for human approval.' },
    { h: '4. End-to-end workflow', p: 'Talking points: Load or upload → validate → analyse → findings → inspect a record → approve or edit → record action and follow-up → track status → report.' },
    { h: '5. Live demonstration', p: 'Demo: open the Dashboard, then AI Analysis, open a Priority review record, accept a recommendation with a follow-up date, update it in Support Actions, and generate the report. [Demonstrated capability]' },
    { h: '6. Key insights', p: 'Talking points: Show the factor chart and correlations from Insights. Stress that these are synthetic data and associations, not causes.' },
    { h: '7. Supporting human decisions', p: 'Talking points: Each suggestion lists the observed indicators behind it; the educator decides. Nothing happens automatically.' },
    { h: '8. Responsible AI and limitations', p: 'Talking points: Synthetic data, no personal identifiers, transparent rules, uncertainty flags, not validated.' },
    { h: '9. Expected value and success criteria [Expected, not yet evidenced]', p: 'Proposed measures for a future pilot: time from first signal to first check-in; share of suggestions educators find useful; data-quality rate; educator trust survey. No impact has been measured.' },
    { h: '10. Future improvements', p: 'Talking points: Secure multi-user storage, privacy review, integration with school systems, AI-written explanations on the server, validated models with fairness auditing, piloting with consent.' },
];

function PresentationPage() {
  return (
    <>
      <PageHeader title="Project Presentation" description="A ten-part story of the EduSupport AI project with talking points." />
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
