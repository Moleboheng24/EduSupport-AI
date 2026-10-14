import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, Brain, ClipboardCheck, BarChart3, Network, ShieldCheck, Presentation, Info, Menu, X, GraduationCap,
} from "lucide-react";
import { hydrateStore, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Student Records", icon: Users },
  { to: "/analysis", label: "AI Analysis", icon: Brain },
  { to: "/actions", label: "Support Actions", icon: ClipboardCheck },
  { to: "/insights", label: "Insights and Reports", icon: BarChart3 },
  { to: "/architecture", label: "Solution Architecture", icon: Network },
  { to: "/responsible-ai", label: "Responsible AI", icon: ShieldCheck },
  { to: "/presentation", label: "Project Presentation", icon: Presentation },
  { to: "/about", label: "About", icon: Info },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { source, students } = useAppState();
  useEffect(() => hydrateStore(), []);
  useEffect(() => setOpen(false), [path]);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link key={to} to={to} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
            <Icon className={cn("h-4 w-4", active && "text-sidebar-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar print:hidden lg:flex">
        <Brand />
        {nav}
        <div className="mt-auto border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/70">
          Dataset: {students.length} records ({source === "synthetic" ? "synthetic demo" : "uploaded CSV"}). Stored locally in this browser.
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex items-center justify-between bg-sidebar px-4 py-3 print:hidden lg:hidden">
        <Brand compact />
        <button aria-label="Toggle navigation" onClick={() => setOpen(!open)} className="rounded p-2 text-sidebar-foreground">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && <div className="fixed inset-x-0 top-14 z-20 bg-sidebar shadow-lg lg:hidden">{nav}</div>}
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 text-sidebar-foreground", !compact && "px-6 py-5")}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-semibold">EduSupport AI</span>
    </Link>
  );
}
