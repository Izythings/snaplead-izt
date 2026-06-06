import { Link } from "react-router-dom";
import { Camera, CheckCircle2, ClipboardList, Flame, Plus, Users } from "lucide-react";
import CaptureCard from "../components/CaptureCard";
import LeadCard from "../components/LeadCard";
import StatCard from "../components/StatCard";
import { useCaptures } from "../hooks/useCaptures";
import { useLeads } from "../hooks/useLeads";
import { relevanceScore } from "../domain/leads/relevance";

export default function Dashboard() {
  const { captures } = useCaptures();
  const { leads } = useLeads();
  const photoLeads = leads.filter((lead) => lead.is_from_photo);
  const contacted = leads.filter((lead) => lead.status === "contacted");
  const hotLeads = leads.filter((lead) => relevanceScore(lead) >= 0.7 && lead.status !== "contacted" && lead.status !== "archived");

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="snap-label text-ember">Du terrain à l'action</div>
          <h1 className="mt-2 text-xl md:text-[30px]">Tableau de bord</h1>
          <p className="snap-copy mt-2 max-w-2xl text-sm md:text-base">Suivez les signaux capturés, priorisez les leads chauds et lancez vos appels.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/plan" className="snap-button-secondary">
            <ClipboardList size={17} />
            Plan d'appel
          </Link>
          <Link to="/import" className="snap-button">
            <Plus size={17} />
            Nouvelle capture
          </Link>
        </div>
      </header>

      <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Captures" value={captures.length} icon={Camera} />
        <StatCard label="Leads terrain" value={photoLeads.length} icon={Users} />
        <StatCard label="Leads chauds" value={hotLeads.length} icon={Flame} delta={hotLeads.length ? "À traiter aujourd'hui" : undefined} />
        <StatCard label="Contactés" value={contacted.length} icon={CheckCircle2} />
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="snap-label">Terrain</div>
              <h2 className="mt-1 text-lg md:text-xl">Captures récentes</h2>
            </div>
            <Link to="/captures" className="min-h-11 py-3 text-sm font-semibold text-ember hover:underline">Tout voir</Link>
          </div>
          {captures.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {captures.slice(0, 3).map((capture) => <CaptureCard key={capture.id} capture={capture} />)}
            </div>
          ) : (
            <div className="snap-panel grid min-h-56 place-items-center p-6 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted"><Camera size={22} /></span>
                <h3 className="mt-4 text-lg">Aucune capture aujourd'hui</h3>
                <p className="mt-1 text-sm text-muted">Prenez votre première photo pour générer un lead.</p>
                <Link to="/import" className="snap-button mt-4">Capturer</Link>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="snap-label">Priorité</div>
              <h2 className="mt-1 text-lg md:text-xl">Leads à activer</h2>
            </div>
            <Link to="/leads" className="min-h-11 py-3 text-sm font-semibold text-ember hover:underline">Ouvrir le CRM</Link>
          </div>
          <div className="space-y-2">
            {(hotLeads.length ? hotLeads : leads).slice(0, 6).map((lead) => <LeadCard key={lead.id} lead={lead} />)}
            {leads.length === 0 && <div className="snap-panel p-6 text-center text-sm text-muted">Aucun lead disponible.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
