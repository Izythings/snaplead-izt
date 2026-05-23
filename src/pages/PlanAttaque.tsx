import { useState } from "react";
import ScriptDisplay from "../components/ScriptDisplay";
import { useToast } from "../components/StatusToast";
import { useLeads } from "../hooks/useLeads";
import { usePlan } from "../hooks/usePlan";
import { downloadCsv, leadsToCsv } from "../lib/csv";
import { leadName } from "../lib/constants";
import { supabase } from "../lib/supabase";

export default function PlanAttaque() {
  const { plan, generate } = usePlan();
  const { leads } = useLeads();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const content = plan?.contenu;

  const pushAll = async () => {
    setBusy(true);
    let ok = 0;
    let ko = 0;
    for (const lead of leads.filter((item) => item.status === "actionable")) {
      const { error } = await supabase.functions.invoke("webhook-push", { body: { lead_id: lead.id, trigger: "manual" } });
      if (error) ko += 1;
      else {
        ok += 1;
        await supabase.from("leads").update({ pushed_at: new Date().toISOString() }).eq("id", lead.id);
      }
    }
    if (ko > 0) toast.error("Push bulk terminé avec erreurs", `${ok} OK · ${ko} KO`);
    else toast.success(`${ok} lead(s) poussé(s) au CRM`);
    setBusy(false);
  };

  return (
    <div className="pb-20">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-medium text-brick">Demain matin</div>
          <h1 className="text-3xl font-semibold">Plan d'attaque</h1>
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
          }} className="rounded bg-brick px-4 py-2 font-medium text-white disabled:opacity-50">
            Générer
          </button>
          <button onClick={() => downloadCsv("leadsnap-plan.csv", leadsToCsv(leads))} className="rounded border border-ink/15 px-4 py-2 font-medium">
            Export CSV
          </button>
          <button disabled={busy} onClick={pushAll} className="rounded bg-ink px-4 py-2 font-medium text-paper disabled:opacity-50">
            Push all
          </button>
        </div>
      </header>

      {content ? (
        <>
          <section className="mb-5 dark-surface rounded p-5">
            <div className="text-sm text-paper/50">{content.date}</div>
            <p className="mt-2 text-xl">{content.resume_journee}</p>
          </section>
          <div className="space-y-5">
            {content.groupes.map((group) => {
              const principal = leads.find((lead) => lead.id === group.lead_principal.lead_id);
              return (
                <section key={`${group.metier}-${group.zone}`} className="surface rounded p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{group.metier}</h2>
                      <p className="text-muted">{group.zone} · {group.contexte}</p>
                    </div>
                    <div className="mono rounded bg-paper px-2 py-1 text-sm">{group.ordre_recommande.length} appels</div>
                  </div>
                  <div className="mb-4 rounded bg-paper p-4">
                    <div className="text-sm font-medium text-brick">Lead vu terrain</div>
                    <div className="mt-1 text-lg font-semibold">{principal ? leadName(principal) : group.lead_principal.nom}</div>
                    <p className="mt-2 text-muted">{group.lead_principal.angle}</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ScriptDisplay title="Script principal" content={group.lead_principal.script_appel} />
                    <ScriptDisplay title="Email principal" content={group.lead_principal.email} />
                  </div>
                  {group.confreres.length > 0 && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {group.confreres.map((peer, index) => (
                        <article key={peer.lead_id} className="rounded border border-ink/10 p-4">
                          <div className="mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</div>
                          <h3 className="mt-1 font-semibold">{peer.nom}</h3>
                          <p className="mt-2 text-sm text-muted">{peer.accroche}</p>
                          <button onClick={() => navigator.clipboard.writeText(peer.script_appel)} className="mt-3 rounded bg-ink px-3 py-1.5 text-sm text-paper">
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
        <div className="surface rounded p-8 text-center text-muted">Aucun plan généré.</div>
      )}
    </div>
  );
}
