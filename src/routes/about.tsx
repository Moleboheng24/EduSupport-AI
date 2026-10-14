import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/common";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { actions as store } from "@/lib/store";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — EduSupport AI" },
      { name: "description", content: "About the EduSupport AI portfolio prototype." },
      { property: "og:title", content: "About — EduSupport AI" },
      { property: "og:description", content: "About the EduSupport AI portfolio prototype." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const SECTIONS = [
    { h: 'What this is', p: 'EduSupport AI is an individual portfolio prototype demonstrating an end-to-end, responsible AI-assisted support workflow for educators.' },
    { h: 'Data', p: 'All initial records are synthetic and generated deterministically in the browser. Use only anonymised demonstration data when uploading.' },
    { h: 'Deterministic vs AI', p: 'Categories, scores, correlations, explanations and recommendations are all deterministic and run locally. No external AI service is used, so the demonstration works with no paid API access.' },
    { h: 'Storage', p: "Your dataset, settings and actions are saved in this browser's local storage. They are not shared and are not a secure multi-user database." },
];

function AboutPage() {
  return (
    <>
      <PageHeader title="About" description="About the EduSupport AI portfolio prototype." />
      <div className="mb-4"><Button variant="outline" onClick={() => { store.resetAll(); toast.success("All local data reset to the synthetic dataset"); }}>Reset all local data</Button></div>
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
