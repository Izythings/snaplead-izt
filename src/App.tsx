import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Menu,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useSession } from "./hooks/useSession";
import { supabase } from "./infrastructure/supabase/client";
import Auth from "./pages/Auth";
import { ToastProvider } from "./components/StatusToast";
import { AnimatedDock } from "./components/AnimatedDock";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Import = lazy(() => import("./pages/Import"));
const Captures = lazy(() => import("./pages/Captures"));
const LeadsCRM = lazy(() => import("./pages/LeadsCRM"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const PlanAttaque = lazy(() => import("./pages/PlanAttaque"));
const SettingsPage = lazy(() => import("./pages/Settings"));

const navGroups = [
  {
    label: "Navigation",
    items: [
      { to: "/", label: "Tableau de bord", icon: Home },
      { to: "/captures", label: "Captures", icon: Camera },
      { to: "/leads", label: "Leads (CRM)", icon: Users },
      { to: "/plan", label: "Plan d'appel", icon: ClipboardList },
    ],
  },
  {
    label: "Outils",
    items: [
      { to: "/import", label: "Importer", icon: UploadCloud },
      { to: "/settings", label: "Réglages", icon: Settings },
    ],
  },
];

const mobileNav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/import", label: "Capturer", icon: UploadCloud, featured: true },
  { to: "/captures", label: "Captures", icon: Camera },
  { to: "/plan", label: "Plan", icon: ClipboardList },
];

const routeMeta = [
  { match: /^\/$/, title: "Tableau de bord · Scovi", description: "Pilotez les captures terrain, les leads qualifiés et l'activité commerciale." },
  { match: /^\/captures/, title: "Captures terrain · Scovi", description: "Retrouvez les photos terrain et leur statut de traitement." },
  { match: /^\/leads\/[^/]+/, title: "Détail du lead · Scovi", description: "Consultez l'enrichissement, les scores et les actions d'un lead." },
  { match: /^\/leads/, title: "CRM Leads · Scovi", description: "Triez, filtrez et activez les leads issus du terrain." },
  { match: /^\/plan/, title: "Plan d'appel · Scovi", description: "Exécutez le plan d'appel priorisé du jour." },
  { match: /^\/import/, title: "Nouvelle capture · Scovi", description: "Ajoutez des photos terrain pour générer de nouveaux leads." },
  { match: /^\/settings/, title: "Réglages · Scovi", description: "Configurez les intégrations CRM et les webhooks Scovi." },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-ember)] font-display text-lg font-bold text-[oklch(var(--ember-foreground))] shadow-[var(--shadow-ember)]">
        S
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-base font-semibold tracking-tight">Scovi</span>
          <span className="block text-[11px] text-muted">Terrain → action</span>
        </span>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Brand compact={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            {!collapsed && <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{group.label}</div>}
            <nav className="space-y-1" aria-label={group.label}>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-foreground before:absolute before:-left-3 before:h-6 before:w-0.5 before:bg-ember"
                        : "text-muted hover:bg-accent hover:text-foreground"
                    } ${collapsed ? "justify-center px-0" : ""}`
                  }
                >
                  <item.icon size={18} className="shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
      {!collapsed && (
        <div className="m-3 rounded-lg border border-sidebar-border bg-secondary/60 p-3">
          <Sparkles size={17} className="mb-2 text-ember" aria-hidden="true" />
          <div className="text-xs font-semibold">Astuce terrain</div>
          <p className="mt-1 text-[11px] leading-4 text-muted">Cadrez l'enseigne et le numéro de téléphone pour améliorer le score.</p>
        </div>
      )}
      <button onClick={() => supabase.auth.signOut()} className="m-3 min-h-11 rounded-md text-xs font-semibold text-muted transition-colors hover:bg-accent hover:text-foreground">
        {collapsed ? "↪" : "Déconnexion"}
      </button>
    </div>
  );
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const meta = routeMeta.find((entry) => entry.match.test(location.pathname)) ?? routeMeta[0];
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 md:block ${collapsed ? "w-14" : "w-60"}`}>
        <Sidebar collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Fermer la navigation" />
          <aside className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] border-r border-sidebar-border shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-accent hover:text-foreground" aria-label="Fermer">
              <X size={20} />
            </button>
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${collapsed ? "md:pl-14" : "md:pl-60"}`}>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-xl md:h-16 md:px-6">
            <button onClick={() => setMobileOpen(true)} className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-accent hover:text-foreground md:hidden" aria-label="Ouvrir la navigation">
              <Menu size={20} />
            </button>
            {location.pathname !== "/" && (
              <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-accent hover:text-foreground md:hidden" aria-label="Retour">
                <ArrowLeft size={20} />
              </button>
            )}
            <button onClick={() => setCollapsed((value) => !value)} className="hidden h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent hover:text-foreground md:grid" aria-label={collapsed ? "Déplier la barre latérale" : "Réduire la barre latérale"}>
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <div className="hidden items-center gap-2 text-xs text-muted lg:flex">
              <Wifi size={14} className="text-success" />
              Connecté
            </div>
            <button className="ml-auto hidden h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-input px-3 text-left text-sm text-muted transition-colors hover:border-ember/30 lg:flex" aria-label="Recherche globale">
              <Search size={16} />
              <span>Rechercher</span>
              <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <NavLink to="/import" className="ml-auto hidden min-h-9 items-center gap-2 rounded-md bg-ember px-3 text-sm font-bold text-[oklch(var(--ember-foreground))] shadow-[var(--shadow-ember)] md:inline-flex lg:ml-2">
              <Camera size={16} />
              Nouvelle capture
            </NavLink>
            <button className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-accent hover:text-foreground" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-display text-xs font-bold text-ember" aria-label="Profil utilisateur">PZ</span>
          </header>

          <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-14 lg:px-8">
            <Suspense
              fallback={
                <div className="snap-panel p-6 text-muted" role="status" aria-live="polite">
                  Chargement de la page
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/import" element={<Import />} />
                <Route path="/captures" element={<Captures />} />
                <Route path="/leads" element={<LeadsCRM />} />
                <Route path="/leads/:id" element={<LeadDetail />} />
                <Route path="/plan" element={<PlanAttaque />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
      </div>

      <AnimatedDock
        items={mobileNav.map((item) => ({
          to: item.to,
          label: item.label,
          icon: <item.icon size={20} aria-hidden="true" />,
          featured: item.featured,
        }))}
      />
    </div>
  );
}

export default function App() {
  const e2eAuth = import.meta.env.VITE_E2E_AUTH === "true";
  const disableAuth = import.meta.env.VITE_DISABLE_AUTH === "true";
  const localDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "";
  const skipAuth = disableAuth || e2eAuth || localDev;
  const { session, loading } = useSession();

  if (!skipAuth && loading) return <div className="grid min-h-screen place-items-center bg-background text-muted">Chargement</div>;
  if (!skipAuth && !session) return <Auth />;

  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  );
}
