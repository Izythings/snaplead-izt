import { Link } from "react-router-dom";
import { Camera, ChevronRight, CircleAlert, LoaderCircle } from "lucide-react";
import type { Capture } from "../domain/shared/types";

const statusMeta = {
  pending: { label: "En attente", className: "bg-muted-surface/90 text-muted", icon: LoaderCircle },
  processing: { label: "En cours", className: "bg-warning/15 text-warning", icon: LoaderCircle },
  done: { label: "Analysée", className: "bg-success/15 text-success", icon: Camera },
  failed: { label: "Erreur", className: "bg-destructive/15 text-destructive", icon: CircleAlert },
};

export default function CaptureCard({ capture }: { capture: Capture }) {
  const meta = statusMeta[capture.status];
  const StatusIcon = meta.icon;
  return (
    <article className="snap-panel group overflow-hidden transition-colors hover:border-ember/30 hover:shadow-[var(--shadow-elegant)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted-surface">
        {capture.photo_url ? (
          <img src={capture.photo_url} alt={`Capture terrain à ${capture.exif_city || "un lieu non identifié"}`} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <Camera size={36} aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/90 to-transparent" />
        <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur ${meta.className}`}>
          <StatusIcon size={13} aria-hidden="true" />
          {meta.label}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="font-display text-base font-semibold">{capture.exif_city || "Lieu non détecté"}</div>
          <div className="mt-1 truncate text-xs text-muted">{capture.exif_address || capture.photo_path}</div>
        </div>
      </div>
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
        <div className="mono text-xs text-muted">{new Date(capture.created_at).toLocaleString("fr-FR")}</div>
        <Link to={`/leads?capture=${capture.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ember hover:underline">
          Voir les leads
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {capture.error_message && <p className="border-t border-border px-4 py-3 text-sm text-destructive">{capture.error_message}</p>}
    </article>
  );
}
