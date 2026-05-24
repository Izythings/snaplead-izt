import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Camera, ClipboardList, Home, Settings, UploadCloud } from "lucide-react";
import { useSession } from "./hooks/useSession";
import { supabase } from "./lib/supabase";
import Dashboard from "./pages/Dashboard";
import Import from "./pages/Import";
import Captures from "./pages/Captures";
import LeadDetail from "./pages/LeadDetail";
import PlanAttaque from "./pages/PlanAttaque";
import SettingsPage from "./pages/Settings";
import Auth from "./pages/Auth";
import { ToastProvider } from "./components/StatusToast";

const nav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/import", label: "Import", icon: UploadCloud },
  { to: "/captures", label: "Captures", icon: Camera },
  { to: "/plan", label: "Plan", icon: ClipboardList },
  { to: "/settings", label: "Réglages", icon: Settings },
];

const SnapLeadMark = ({ small = false }: { small?: boolean }) => (
  <div className={`relative flex ${small ? "h-7 w-7" : "h-9 w-9"} items-center justify-center rounded-md bg-ink text-paper`}>
    <span className="absolute left-1.5 top-1.5 h-2 w-2 border-l-2 border-t-2 border-paper" />
    <span className="absolute bottom-1.5 right-1.5 h-2 w-2 border-b-2 border-r-2 border-paper" />
    <span className={`${small ? "text-base" : "text-xl"} font-bold leading-none`}>S</span>
    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brick" />
  </div>
);

const Layout = () => (
  <div className="min-h-screen bg-paper text-ink">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r px-4 py-5 md:block" style={{ background: "var(--c-dossier)", borderColor: "var(--c-line)" }}>
      <div className="mb-8 flex items-center gap-3 border-b pb-5" style={{ borderColor: "var(--c-line)" }}>
        <SnapLeadMark />
        <div>
          <div className="font-bold">SnapLead<span className="text-brick">.</span></div>
          <div className="text-xs text-muted">Terrain → action</div>
        </div>
      </div>
      <nav className="space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                isActive ? "bg-ink text-paper" : "text-muted hover:bg-cream hover:text-ink"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={() => supabase.auth.signOut()}
        className="absolute bottom-5 left-4 right-4 rounded border px-3 py-2 text-sm text-muted hover:bg-cream"
        style={{ borderColor: "var(--c-line)" }}
      >
        Déconnexion
      </button>
    </aside>
    <main className="md:pl-64">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between border-b pb-4 md:hidden" style={{ borderColor: "var(--c-line)" }}>
          <div className="flex items-center gap-2 font-semibold">
            <SnapLeadMark small />
            <span>SnapLead<span className="text-brick">.</span></span>
          </div>
          <NavLink to="/import" className="rounded bg-brick px-3 py-2 text-sm text-white">
            Import
          </NavLink>
        </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<Import />} />
          <Route path="/captures" element={<Captures />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/plan" element={<PlanAttaque />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-paper md:hidden" style={{ borderColor: "var(--c-line)" }}>
      {nav.map((item) => (
        <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-1 px-1 py-2 text-[11px]">
          <item.icon size={17} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  </div>
);

export default function App() {
  const e2eAuth = import.meta.env.VITE_E2E_AUTH === "true";
  const disableAuth = import.meta.env.VITE_DISABLE_AUTH === "true";
  const localDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "";
  const skipAuth = disableAuth || e2eAuth || localDev;
  const { session, loading } = useSession();
  if (!skipAuth && loading) return <div className="grid min-h-screen place-items-center bg-paper">Chargement</div>;
  if (!skipAuth && !session) return <Auth />;
  return (
    <ToastProvider>
      <Layout />
    </ToastProvider>
  );
}
