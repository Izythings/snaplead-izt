import { useState } from "react";
import ScriptDisplay from "../components/ScriptDisplay";
import { useToast } from "../components/StatusToast";
import { useLeads } from "../hooks/useLeads";
import { usePlan } from "../hooks/usePlan";
import { createLeadActions } from "../application/services/leadActions";
import { leadName } from "../domain/leads/lead";
import { downloadCsv, leadsToCsv } from "../infrastructure/browser/csv";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

const leadActions = createLeadActions(supabaseDataGateway);

export default function PlanAttaque() {
  const { plan, generate } = usePlan();
  const { leads } = useLeads();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const content = plan?.contenu;

  const pushAll = async () => {
    setBusy(true);
    const { ok, ko } = await leadActions.pushActionableLeads(leads);
    if (ko > 0) toast.error("Push bulk terminé avec erreurs", `${ok} OK · ${ko} KO`);
    else toast.success(`${ok} lead(s) poussé(s) au CRM`);
    setBusy(false);
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="snap-label text-ember">Aujourd'hui</div>
          <h1 className="mt-2 text-xl md:text-[30px]">Plan d'appel</h1>
          <p className="snap-copy mt-2 text-sm md:text-base">Priorités, scripts et séquence commerciale prêts à exécuter.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              await generate();
              toast.success("Plan généré");
            } catch (error) {
              toast.error("Génération du plan échouée", error);
            } finally {
              setBusy(false);
            }
          }} className="snap-button disabled:opacity-50">
            Générer
          </button>
          <button onClick={() => downloadCsv("scovio-plan.csv", leadsToCsv(leads))} className="snap-button-secondary">
            Export CSV
          </button>
          <button disabled={busy} onClick={pushAll} className="snap-button disabled:opacity-50">
            Push all
          </button>
        </div>
      </header>

      {content ? (
        <>
          <section className="snap-panel mb-5 border-ember/20 bg-ember/10 p-5">
            <div className="text-sm text-muted">{content.date}</div>
            <p className="mt-2 text-xl">{content.resume_journee}</p>
          </section>
          <div className="space-y-5">
            {content.groupes.map((group) => {
              const principal = leads.find((lead) => lead.id === group.lead_principal.lead_id);
              return (
                <section key={`${group.metier}-${group.zone}`} className="snap-panel p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="snap-title text-3xl">{group.metier}</h2>
                      <p className="text-muted">{group.zone} · {group.contexte}</p>
                    </div>
                    <div className="mono rounded bg-secondary px-2 py-1 text-sm">{group.ordre_recommande.length} appels</div>
                  </div>
                  <div className="snap-panel-alt mb-4 p-4">
                    <div className="text-sm font-medium text-brick">Lead vu terrain</div>
                    <div className="mt-1 text-lg font-semibold">{principal ? leadName(principal) : group.lead_principal.nom}</div>
                    <p className="mt-2 text-muted">{group.lead_principal.angle}</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ScriptDisplay title="Script principal" content={group.lead_principal.script_appel} />
                    <ScriptDisplay title="Email principal" content={group.lead_principal.email} emailTo={principal?.email} enableEmail />
                  </div>
                  {group.confreres.length > 0 && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {group.confreres.map((peer, index) => (
                        <article key={peer.lead_id} className="snap-panel p-4">
                          <div className="mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</div>
                          <h3 className="mt-1 font-semibold">{peer.nom}</h3>
                          <p className="mt-2 text-sm text-muted">{peer.accroche}</p>
                          <button onClick={() => navigator.clipboard.writeText(peer.script_appel)} className="snap-button mt-3 py-1.5 text-sm">
                            Copier script
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <div className="snap-panel p-8 text-center text-muted">Aucun plan généré.</div>
      )}
    </div>
  );
}
