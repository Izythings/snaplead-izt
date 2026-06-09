import { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { supabase } from "../infrastructure/supabase/client";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
};

type ToastContextValue = {
  last: Toast | null;
  pushToast: (toast: Omit<Toast, "id">) => void;
  success: (message: string) => void;
  error: (message: string, reason?: unknown) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const reasonText = (reason?: unknown) => {
  if (!reason) return undefined;
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (typeof reason === "object" && "message" in reason) return String((reason as { message?: unknown }).message);
  return String(reason);
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [last, setLast] = useState<Toast | null>(null);

  const value = useMemo<ToastContextValue>(() => {
    const pushToast = (toast: Omit<Toast, "id">) => {
      const next = { ...toast, id: crypto.randomUUID() };
      setLast(next);
      setToasts((current) => [next, ...current].slice(0, 3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== next.id));
      }, 6500);
    };

    return {
      last,
      pushToast,
      success: (message) => pushToast({ kind: "success", title: "OK", message }),
      error: (message, reason) => pushToast({ kind: "error", title: "KO", message: [message, reasonText(reason)].filter(Boolean).join(" · ") }),
      info: (message) => pushToast({ kind: "info", title: "Info", message }),
    };
  }, [last]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} dismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
      <StatusBar last={last} />
    </ToastContext.Provider>
  );
}

function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed inset-x-4 bottom-20 z-[60] flex flex-col gap-2 md:inset-x-auto md:bottom-10 md:right-4 md:w-[min(92vw,420px)]" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? CircleAlert : Info;
        const color = toast.kind === "success" ? "text-success" : toast.kind === "error" ? "text-destructive" : "text-ember";
        return (
          <div key={toast.id} className="rounded-lg border border-border bg-popover p-3 shadow-[var(--shadow-elegant)]">
            <div className="flex items-start gap-3">
              <Icon className={color} size={18} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{toast.title}</div>
                {toast.message && <div className="mt-1 break-words text-sm text-muted">{toast.message}</div>}
              </div>
              <button onClick={() => dismiss(toast.id)} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent">
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBar({ last }: { last: Toast | null }) {
  const supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL || "https://supabase.local").hostname;
  const statusColor = last?.kind === "error" ? "bg-destructive" : last?.kind === "success" ? "bg-success" : "bg-ember";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-border bg-sidebar/95 px-4 py-2 text-xs backdrop-blur md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="font-medium">Session sécurisée</span>
          <span className="text-muted">Supabase: {supabaseHost}</span>
        </div>
        <div className="min-w-0 truncate text-muted">
          {last ? `${last.title}: ${last.message ?? ""}` : "Prêt"}
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-muted hover:text-ink">
          Reset session
        </button>
      </div>
    </div>
  );
}
