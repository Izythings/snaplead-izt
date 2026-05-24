import { Link } from "react-router-dom";
import type { Capture } from "../lib/types";

const statusClass = {
  pending: "bg-muted/10 text-muted",
  processing: "bg-amber-500/10 text-amber-700",
  done: "bg-good/10 text-good",
  failed: "bg-red-500/10 text-red-700",
};

export default function CaptureCard({ capture }: { capture: Capture }) {
  return (
    <article className="snap-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mono text-xs text-muted">{new Date(capture.created_at).toLocaleString("fr-FR")}</div>
          <div className="mt-1 font-semibold">{capture.exif_city || "Lieu non détecté"}</div>
          <div className="mt-1 text-sm text-muted">{capture.exif_address || capture.photo_path}</div>
        </div>
        <span className={`rounded px-2 py-1 text-xs ${statusClass[capture.status]}`}>{capture.status}</span>
      </div>
      {capture.error_message && <p className="mt-3 text-sm text-red-700">{capture.error_message}</p>}
      <Link to={`/leads?capture=${capture.id}`} className="mt-3 inline-block text-sm font-medium text-brick">
        Voir les leads extraits
      </Link>
    </article>
  );
}
