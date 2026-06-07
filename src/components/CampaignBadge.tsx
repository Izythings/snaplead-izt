import type { CampaignStatus } from "../domain/shared/types";

const labels: Record<CampaignStatus, string> = {
  not_started: "Sans email",
  ready: "Prêt",
  queued: "En file",
  sent: "J0 envoyé",
  follow_up_1: "Relance J+3",
  follow_up_2: "Relance J+7",
  replied: "Répondu",
  completed: "Terminé",
  failed: "Erreur",
  stopped: "Arrêté",
};

const colors: Record<CampaignStatus, string> = {
  not_started: "border-border bg-secondary text-muted",
  ready: "border-info/30 bg-info/10 text-info",
  queued: "border-warning/30 bg-warning/10 text-warning",
  sent: "border-ember/30 bg-ember/10 text-ember",
  follow_up_1: "border-ember/30 bg-ember/10 text-ember",
  follow_up_2: "border-ember/30 bg-ember/10 text-ember",
  replied: "border-success/30 bg-success/10 text-success",
  completed: "border-success/30 bg-success/10 text-success",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  stopped: "border-border bg-secondary text-muted",
};

export default function CampaignBadge({ status }: { status: CampaignStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${colors[status]}`}>{labels[status]}</span>;
}
