import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ConfidenceBadge from "../components/ConfidenceBadge";
import LeadCard from "../components/LeadCard";
import ScriptDisplay from "../components/ScriptDisplay";
import { downloadCsv, leadsToCsv } from "../lib/csv";
import { leadName } from "../lib/constants";
import { supabase } from "../lib/supabase";
import type { LeadWithCapture } from "../lib/types";

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState<LeadWithCapture | null>(null);
  const [confreres, setConfreres] = useState<LeadWithCapture[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("leads").select("*, captures(*)").eq("id", id).single();
    const nextLead = data as LeadWithCapture | null;
    setLead(nextLead);
    setNotes(nextLead?.notes ?? "");
    const { data: peers } = await supabase.from("leads").select("*, captures(*)").eq("parent_lead_id", id).order("created_at");
    setConfreres((peers ?? []) as LeadWithCapture[]);
  };

  useEffect(() => {
    void load();
  }, [id]);

  const updateLead = async (payload: Partial<LeadWithCapture>) => {
    if (!lead) return;
    await supabase.from("leads").update(payload).eq("id", lead.id);
    await load();
  };

  const push = async () => {
    if (!lead) return;
    setBusy(true);
    await supabase.functions.invoke("webhook-push", { body: { lead_id: lead.id, trigger: "manual" } });
    await updateLead({ pushed_at: new Date().toISOString() });
    setBusy(false);
  };

  const searchConfreres = async () => {
    if (!lead) return;
    setBusy(true);
    await supabase.functions.invoke("search-confreres", { body: { lead_id: lead.id } });
    await load();
    setBusy(false);
  };

  if (!lead) return <div>Chargement</div>;
  const all = [lead, ...confreres];

  return (
    <div className="pb-20">
      <Link to="/" className="mb-4 inline-block text-sm text-brick">Retour</Link>
      <header className="mb-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="dark-surface rounded p-5">
          <div className="mb-3 text-sm text-paper/60">Capturé {lead.captures?.exif_taken_at ? new Date(lead.captures.exif_taken_at).toLocaleString("fr-FR") : "sur le terrain"}</div>
          <h1 className="text-4xl font-semibold">{leadName(lead)}</h1>
          <p className="mt-2 text-paper/70">{lead.libelle_naf || lead.activite || "Activité non identifiée"}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded bg-white/10 px-2 py-1">NAF {lead.code_naf || "-"}</span>
            <span className="rounded bg-white/10 px-2 py-1">{lead.ville || lead.departement || "Zone inconnue"}</span>
            <span className="rounded bg-white/10 px-2 py-1">{lead.status}</span>
          </div>
        </div>
        <div className="surface rounded p-5">
          <ConfidenceBadge score={lead.confidence_score} />
          <div className="mt-4 space-y-2 text-sm">
            <p><span className="text-muted">Source</span> {lead.source_matching || "-"}</p>
            <p><span className="text-muted">SIREN</span> <span className="mono">{lead.siren || "-"}</span></p>
            <p><span className="text-muted">SIRET</span> <span className="mono">{lead.siret || "-"}</span></p>
          </div>
        </div>
      </header>

      <section className="mb-5 grid gap-4 lg:grid-cols-3">
        {[
          ["Téléphone", lead.telephone],
          ["Site web", lead.site_web],
          ["Email", lead.email],
          ["Adresse", lead.adresse_siege || lead.adresse],
          ["Dirigeant", lead.dirigeant],
          ["Effectif", lead.effectif],
          ["Création", lead.date_creation],
          ["CA", lead.chiffre_affaires],
          ["Capture", lead.captures?.exif_address],
        ].map(([label, value]) => (
          <div key={label} className="surface rounded p-4">
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-1 font-medium">{value || "-"}</div>
          </div>
        ))}
      </section>

      <section className="mb-5 surface rounded p-4">
        <h2 className="font-semibold">Synthèse</h2>
        <p className="mt-2 text-muted">{lead.resume_business || "Synthèse non générée."}</p>
        <h3 className="mt-4 font-semibold">Angle recommandé</h3>
        <p className="mt-2 text-muted">{lead.angle_approche || "Angle non généré."}</p>
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ScriptDisplay title="Script d'appel · 30 s" content={lead.script_appel} />
        <ScriptDisplay title="Email de prise de contact" content={lead.email_prospection} />
      </div>

      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Entreprises similaires</h2>
          <button disabled={busy} onClick={searchConfreres} className="rounded bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50">
            Rechercher
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {confreres.map((peer, index) => <LeadCard key={peer.id} lead={peer} index={index} />)}
        </div>
      </section>

      <section className="surface rounded p-4">
        <label className="mb-2 block font-semibold">Notes</label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 w-full rounded border border-ink/15 p-3" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => updateLead({ notes })} className="rounded border border-ink/15 px-3 py-2 text-sm">Enregistrer</button>
          <button onClick={() => updateLead({ status: "contacted" })} className="rounded bg-good px-3 py-2 text-sm text-white">Marquer comme contacté</button>
          <button onClick={() => updateLead({ status: "archived" })} className="rounded bg-slate px-3 py-2 text-sm text-white">Archiver</button>
          <button disabled={busy} onClick={push} className="rounded bg-brick px-3 py-2 text-sm text-white disabled:opacity-50">Push to CRM</button>
          <button onClick={() => downloadCsv("leadsnap-lead.csv", leadsToCsv(all))} className="rounded border border-ink/15 px-3 py-2 text-sm">Exporter CSV</button>
        </div>
      </section>
    </div>
  );
}
