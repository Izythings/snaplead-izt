import { Link } from "react-router-dom";
import CaptureCard from "../components/CaptureCard";
import LeadCard from "../components/LeadCard";
import { useCaptures } from "../hooks/useCaptures";
import { useLeads } from "../hooks/useLeads";

export default function Dashboard() {
  const { captures } = useCaptures();
  const { leads } = useLeads();
  const confreres = leads.filter((lead) => !lead.is_from_photo);
  const contacted = leads.filter((lead) => lead.status === "contacted");
  const pushed = leads.filter((lead) => lead.pushed_at);

  const cards = [
    ["Captures", captures.length],
    ["Leads", leads.filter((lead) => lead.is_from_photo).length],
    ["Confrères", confreres.length],
    ["Contactés", contacted.length],
    ["Pushés", pushed.length],
  ];

  return (
    <div className="pb-20">
      <header className="mb-6 dark-surface rounded p-5">
        <div className="text-sm font-medium text-brick">SnapLead</div>
        <h1 className="mt-1 text-3xl font-semibold">Plan commercial terrain</h1>
        <p className="mt-2 max-w-2xl text-paper/60">Importer les signaux visuels, identifier les sociétés, générer le plan d’appel.</p>
      </header>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="surface rounded p-4">
            <div className="text-sm text-muted">{label}</div>
            <div className="mono mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link to="/import" className="rounded bg-brick px-4 py-3 font-medium text-white">Importer des photos</Link>
        <Link to="/plan" className="rounded bg-ink px-4 py-3 font-medium text-paper">Générer le plan</Link>
        <Link to="/settings" className="rounded border border-ink/15 px-4 py-3 font-medium">Configurer webhook</Link>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Dernières captures</h2>
          <div className="space-y-3">
            {captures.slice(0, 5).map((capture) => <CaptureCard key={capture.id} capture={capture} />)}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Derniers leads</h2>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
