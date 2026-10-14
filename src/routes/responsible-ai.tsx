import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/common";

export const Route = createFileRoute("/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI — EduSupport AI" },
      { name: "description", content: "Privacy, fairness, transparency and human oversight safeguards." },
      { property: "og:title", content: "Responsible AI — EduSupport AI" },
      { property: "og:description", content: "Privacy, fairness, transparency and human oversight safeguards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResponsibleAiPage,
});

const SECTIONS = [
    { h: 'Privacy', p: 'Synthetic data by default. Only six anonymised indicators are used. CSV uploads containing name, email, phone, address, date of birth or ID number columns are rejected. Data stays in this browser.' },
    { h: 'Fairness', p: "Attendance and academic indicators can reflect illness, caring responsibilities, transport, disability or other circumstances outside a student's control. No sensitive personal characteristics are collected or used to rank students." },
    { h: 'Transparency', p: 'Every category shows the exact indicators, thresholds and points that produced it. Settings are visible and adjustable.' },
    { h: 'Human oversight', p: 'All recommendations are suggestions. An educator must accept, edit, defer or dismiss each one.' },
    { h: 'Uncertainty', p: 'Records with missing data or values near thresholds are marked with moderate or high uncertainty. Incomplete or inaccurate data can produce misleading conclusions.' },
    { h: 'Accountability', p: 'Users can review records, adjust rules, dismiss suggestions and remove recorded actions. A production version would need audit logs and a formal challenge process.' },
    { h: 'Non-discrimination', p: 'The system must never be used to automatically suspend, punish, exclude or deny opportunities to a student. Recommendations are supportive only.' },
    { h: 'Limitations', p: 'This prototype is not clinically or statistically validated, is not a substitute for educator judgement and must be independently evaluated before any real-world deployment.' },
];

function ResponsibleAiPage() {
  return (
    <>
      <PageHeader title="Responsible AI" description="Privacy, fairness, transparency and human oversight safeguards." />
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
