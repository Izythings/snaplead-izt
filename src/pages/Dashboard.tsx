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
      <header className="mb-8 border-b pb-8" style={{ borderColor: "var(--c-line)" }}>
        <div className="text-sm font-semibold text-brick">SnapLead</div>
        <h1 className="snap-title mt-2 text-5xl leading-none md:text-6xl">Plan commercial terrain</h1>
        <p className="snap-copy mt-3 max-w-2xl text-xl">Importer les signaux visuels, identifier les sociétés, générer le plan d’appel KarayCRM.</p>
      </header>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="snap-panel p-4">
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-2 text-5xl font-bold leading-none">{value}</div>
          </div>
        ))}
      </section>
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link to="/import" className="snap-button bg-brick border-brick">Importer des photos</Link>
        <Link to="/plan" className="snap-button">Générer le plan</Link>
        <Link to="/settings" className="snap-button-secondary">Configurer webhook</Link>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="snap-title mb-3 text-3xl">Dernières captures</h2>
          <div className="space-y-3">
            {captures.slice(0, 5).map((capture) => <CaptureCard key={capture.id} capture={capture} />)}
          </div>
        </section>
        <section>
          <h2 className="snap-title mb-3 text-3xl">Derniers leads</h2>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
