import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Archive, Check, ExternalLink, FileDown, Mail, Phone, Sparkles, Users } from "lucide-react";
import ContactCard from "../components/ContactCard";
import QualificationBadge from "../components/QualificationBadge";
import LeadCard from "../components/LeadCard";
import RelevanceBadge from "../components/RelevanceBadge";
import ScriptDisplay from "../components/ScriptDisplay";
import { useToast } from "../components/StatusToast";
import { createLeadActions } from "../application/services/leadActions";
import { contactName, contactQualification, rankContacts } from "../domain/leads/contact";
import { leadName, phoneHref, websiteHref } from "../domain/leads/lead";
import { relevanceFactors } from "../domain/leads/relevance";
import type { Lead, LeadWithCapture } from "../domain/shared/types";
import { downloadCsv, leadsToCsv } from "../infrastructure/browser/csv";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

const Field = ({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) => (
  <div className="min-w-0">
    <div className="snap-label">{label}</div>
    <div className={`${mono ? "mono" : ""} mt-1 truncate text-sm font-medium text-ink`}>{value || <span className="text-muted">-</span>}</div>
  </div>
);

const scoreFactors = (lead: LeadWithCapture) => [
  { label: "SIREN identifié", weight: 0.4, hit: Boolean(lead.siren) },
  { label: "Téléphone extrait", weight: 0.3, hit: Boolean(lead.telephone) },
  { label: "Nom commercial / raison sociale", weight: 0.2, hit: Boolean(lead.nom_commercial || lead.raison_sociale) },
  { label: "Site web détecté", weight: 0.2, hit: Boolean(lead.site_web) },
  { label: "Ville ou département cohérent", weight: 0.1, hit: Boolean(lead.ville || lead.departement || lead.captures?.exif_city) },
  { label: "NAF disponible", weight: 0.1, hit: Boolean(lead.code_naf) },
  { label: "GPS / contexte terrain", weight: 0.05, hit: Boolean(lead.captures?.exif_lat && lead.captures?.exif_lng) },
];

const BigScore = ({ score, title, source, onOpen }: { score?: number | null; title: string; source: string; onOpen: () => void }) => {
  if (score === null || score === undefined) {
    return (
      <button onClick={onOpen} className="snap-panel block w-full p-6 text-left transition hover:border-brick/60">
        <div className="text-5xl font-bold leading-none text-muted">N/A</div>
        <div className="mt-4 text-sm font-semibold">{title} · Non qualifié</div>
        <div className="mt-4 flex justify-between border-t pt-3 text-xs text-muted" style={{ borderColor: "var(--c-line)" }}>
          <span>{source}</span>
          <span>Qualification requise</span>
        </div>
      </button>
    );
  }
  const pct = Math.round((score ?? 0) * 100);
  const label = pct >= 70 ? "Score élevé" : pct >= 40 ? "Score moyen" : "Score faible";
  const color = pct >= 70 ? "var(--c-confirm)" : pct >= 40 ? "var(--c-warn)" : "var(--c-alert)";
  return (
    <button onClick={onOpen} className="snap-panel block w-full p-6 text-left transition hover:border-brick/60">
      <div className="flex items-baseline gap-1">
        <div className="text-7xl font-bold leading-none">{pct}</div>
        <div className="text-2xl font-semibold text-muted">/100</div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold">{title} · {label}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-cream">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-4 flex justify-between border-t pt-3 text-xs text-muted" style={{ borderColor: "var(--c-line)" }}>
        <span>{source}</span>
        <span>Voir justification</span>
      </div>
    </button>
  );
};

const ScoreDetails = ({ lead, onClose }: { lead: LeadWithCapture; onClose: () => void }) => {
  const factors = scoreFactors(lead);
  const pct = Math.round((lead.confidence_score ?? 0) * 100);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className="snap-panel max-h-[86vh] w-full max-w-xl overflow-auto p-5 shadow-[var(--shadow-elegant)]" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confidence-dialog-title">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="snap-label text-brick">Justification du scoring</div>
            <h2 id="confidence-dialog-title" className="mt-1 text-2xl">{pct}/100</h2>
          </div>
          <button onClick={onClose} className="snap-button-secondary px-3 py-1.5 text-sm">Fermer</button>
        </div>
        <p className="mb-4 text-sm text-muted">
          Score calculé à partir des signaux disponibles après extraction photo, Sirene et Pappers. Les poids affichés suivent la grille de confiance du cahier des charges.
        </p>
        <div className="space-y-2">
          {factors.map((factor) => (
            <div key={factor.label} className="flex items-center gap-3 rounded border p-3" style={{ borderColor: "var(--c-line)", background: factor.hit ? "var(--c-panel)" : "var(--c-panelAlt)" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: factor.hit ? "var(--c-confirm)" : "var(--c-inkFaint)" }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{factor.label}</div>
                <div className="text-xs text-muted">{factor.hit ? "Signal présent" : "Signal absent ou non confirmé"}</div>
              </div>
              <div className="mono text-xs text-muted">+{factor.weight.toFixed(2)}</div>
            </div>
          ))}
        </div>
        {lead.source_matching && <div className="mt-4 text-sm text-muted">Source matching : {lead.source_matching}</div>}
      </div>
    </div>
  );
};

const RelevanceDetails = ({ lead, onClose }: { lead: LeadWithCapture; onClose: () => void }) => {
  const factors = relevanceFactors(lead);
  const pct = lead.company_qualification_score === null ? null : Math.round(lead.company_qualification_score * 100);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div className="snap-panel max-h-[86vh] w-full max-w-xl overflow-auto p-5 shadow-[var(--shadow-elegant)]" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="relevance-dialog-title">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="snap-label text-brick">Pertinence commerciale</div>
            <h2 id="relevance-dialog-title" className="mt-1 text-2xl">{pct === null ? "N/A" : `${pct}/100`}</h2>
          </div>
          <button onClick={onClose} className="snap-button-secondary px-3 py-1.5 text-sm">Fermer</button>
        </div>
        <p className="mb-4 text-sm text-muted">
          {pct === null ? "Ce lead n'a pas encore été qualifié." : "Score orienté prospection KarayCRM. Il mesure l'intérêt commercial du lead."}
        </p>
        <div className="space-y-2">
          {factors.map((factor) => (
            <div key={factor.label} className="flex items-center gap-3 rounded border p-3" style={{ borderColor: "var(--c-line)", background: factor.score >= 0.7 ? "var(--c-panel)" : "var(--c-panelAlt)" }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: factor.score >= 0.7 ? "var(--c-confirm)" : factor.score >= 0.4 ? "var(--c-warn)" : "var(--c-alert)" }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{factor.label}</div>
                <div className="text-xs text-muted">{factor.detail}</div>
              </div>
              <div className="mono text-xs text-muted">{Math.round(factor.score * 100)}% · {Math.round(factor.weight * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const leadActions = createLeadActions(supabaseDataGateway);

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState<LeadWithCapture | null>(null);
  const [confreres, setConfreres] = useState<LeadWithCapture[]>([]);
  const [contacts, setContacts] = useState<LeadWithCapture[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [relevanceOpen, setRelevanceOpen] = useState(false);
  const [qualificationMenuOpen, setQualificationMenuOpen] = useState(false);
  const toast = useToast();

  const load = async () => {
    if (!id) return;
    try {
      const { lead: nextLead, confreres: nextConfreres, contacts: nextContacts } = await supabaseDataGateway.fetchLeadDetail(id);
      setLead(nextLead);
      setNotes(nextLead?.notes ?? "");
      setConfreres(nextConfreres);
      setContacts(rankContacts(nextContacts));
    } catch (error) {
      toast.error("Chargement lead échoué", error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    const closeDialogs = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setScoreOpen(false);
        setRelevanceOpen(false);
      }
    };
    window.addEventListener("keydown", closeDialogs);
    return () => window.removeEventListener("keydown", closeDialogs);
  }, []);

  const updateLead = async (payload: Partial<Lead>) => {
    if (!lead) return;
    try {
      await leadActions.updateLead(lead.id, payload);
    } catch (error) {
      toast.error("Mise à jour lead échouée", error instanceof Error ? error.message : String(error));
      return;
    }
    toast.success("Lead mis à jour");
    await load();
  };

  const searchConfreres = async () => {
    if (!lead) return;
    setBusy(true);
    try {
      const data = await leadActions.searchConfreres(lead.id);
      toast.success(`${data?.created ?? 0} confrère(s) ajouté(s)`);
    } catch (error) {
      toast.error("Recherche confrères échouée", error instanceof Error ? error.message : String(error));
    }
    await load();
    setBusy(false);
  };

  const qualify = async (scope: "lead" | "contacts" | "both") => {
    if (!lead) return;
    setBusy(true);
    setQualificationMenuOpen(false);
    try {
      await leadActions.qualifyLeads([lead.id], scope);
      toast.success("Qualification terminée");
      await load();
    } catch (error) {
      toast.error("Qualification échouée", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!lead) return <div>Chargement</div>;
  const all = [lead, ...contacts.filter((contact) => contact.id !== lead.id), ...confreres];
  const qualification = contactQualification(lead);
  const primaryDecisionMaker = contacts.find((contact) => contactQualification(contact).role === "Décideur");
  const operationalSponsor = contacts.find((contact) => contactQualification(contact).role === "Sponsor opérationnel");
  const financialInfluencer = contacts.find((contact) => {
    const title = (contact.contact_job_title ?? "").toLowerCase();
    return title.includes("financial") || title.includes("financier") || title.includes("administratif") || title.includes("daf");
  });

  const captured = lead.captures?.exif_taken_at ? new Date(lead.captures.exif_taken_at).toLocaleString("fr-FR") : "sur le terrain";
  const location = lead.captures?.exif_address || [lead.ville, lead.departement].filter(Boolean).join(" · ") || "Zone inconnue";

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm font-medium text-brick">Retour</Link>

      <header className="mb-6 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-brick" style={{ background: "var(--c-signalSoft)" }}>
              Capturé sur le terrain
            </span>
            <span className="snap-label">{location}</span>
          </div>
          <div>
            <h1 className="text-2xl leading-tight md:text-[30px]">{leadName(lead)}</h1>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="rounded bg-cream px-2 py-1 text-xs font-semibold text-slate">NAF {lead.code_naf || "-"}</span>
              <span className="text-lg font-semibold text-slate">{lead.libelle_naf || lead.activite || "Activité non identifiée"}</span>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Adresse" value={lead.adresse_siege || lead.adresse || location} />
            <Field label="Téléphone" value={lead.telephone} mono />
            <Field label="Site web" value={lead.site_web} mono />
          </div>
        </div>
        <div className="grid gap-3">
          <BigScore score={lead.company_qualification_score} title="Pertinence" source="Activité · taille · contactabilité" onOpen={() => setRelevanceOpen(true)} />
          <BigScore score={lead.confidence_score} title="Confiance" source="Sirene · Pappers · Vision" onOpen={() => setScoreOpen(true)} />
        </div>
      </header>

      <section className="snap-panel mb-6 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-6">
        <div className="border-b p-4 sm:border-r lg:border-b-0" style={{ borderColor: "var(--c-line)" }}><Field label="SIREN" value={lead.siren} mono /></div>
        <div className="border-b p-4 sm:border-r lg:border-b-0" style={{ borderColor: "var(--c-line)" }}><Field label="SIRET" value={lead.siret} mono /></div>
        <div className="border-b p-4 sm:border-r lg:border-b-0" style={{ borderColor: "var(--c-line)" }}><Field label="Code NAF" value={lead.code_naf} mono /></div>
        <div className="border-b p-4 sm:border-r lg:border-b-0" style={{ borderColor: "var(--c-line)" }}><Field label="Création" value={lead.date_creation} /></div>
        <div className="border-b p-4 sm:border-r lg:border-b-0" style={{ borderColor: "var(--c-line)" }}><Field label="Effectif" value={lead.effectif} /></div>
        <div className="p-4"><Field label="Statut" value={lead.status} /></div>
      </section>

      {(lead.contact_first_name || lead.contact_last_name || lead.email || lead.contact_job_title) && (
        <section className="snap-panel mb-7 p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="snap-label font-semibold text-ember">Fiche contact</div>
              <h2 className="mt-1 text-2xl">{contactName(lead)}</h2>
              <p className="mt-1 text-sm text-muted">{lead.contact_job_title || "Fonction à qualifier"}</p>
            </div>
            <div className="text-right">
              <div className="mono text-3xl font-bold">{qualification.score}/100</div>
              <div className="mt-1 text-xs font-semibold text-muted">{qualification.role} · {qualification.priority}</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Email" value={lead.email} mono />
            <Field label="Téléphone" value={lead.telephone} mono />
            <Field label="LinkedIn" value={lead.contact_linkedin} />
            <Field label="Pertinence" value={qualification.reason} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {lead.email && <a href={`mailto:${lead.email}`} className="snap-button"><Mail size={16} />Écrire</a>}
            {lead.telephone && <a href={phoneHref(lead.telephone)} className="snap-button-secondary"><Phone size={16} />Appeler</a>}
            {lead.contact_linkedin && <a href={lead.contact_linkedin} target="_blank" rel="noreferrer" className="snap-button-secondary"><ExternalLink size={16} />LinkedIn</a>}
          </div>
        </section>
      )}

      <section className="mb-7 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="snap-panel p-4">
            <div className="mb-3 flex justify-between">
              <span className="text-sm font-semibold">Champs extraits</span>
              <button onClick={() => setRelevanceOpen(true)} className="text-left">
                {lead.company_qualification_status === "qualified"
                  ? <RelevanceBadge score={lead.company_qualification_score} />
                  : <QualificationBadge status={lead.company_qualification_status} score={lead.company_qualification_score} />}
              </button>
            </div>
            <div className="space-y-2">
              <Field label="Nom commercial" value={lead.nom_commercial} />
              <Field label="Activité" value={lead.activite || lead.libelle_naf} />
              <Field label="Email" value={lead.email} mono />
              <Field label="Source matching" value={lead.source_matching} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <h2 className="snap-title text-3xl">Synthèse</h2>
            <span className="snap-label">Générée à partir des sources publiques</span>
          </div>
          <div>
            <div className="snap-label font-semibold text-ink">L'essentiel</div>
            <p className="snap-copy mt-2 text-xl">{lead.resume_business || "Synthèse non générée."}</p>
          </div>
          <div className="h-px" style={{ background: "var(--c-line)" }} />
          <div>
            <div className="snap-label font-semibold text-ink">Angle d'approche recommandé</div>
            <p className="snap-copy mt-2 text-lg">« {lead.angle_approche || "Angle non généré."} »</p>
          </div>
          <div className="h-px" style={{ background: "var(--c-line)" }} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Dirigeant" value={lead.dirigeant} />
            <Field label="Chiffre d'affaires" value={lead.chiffre_affaires} />
            <Field label="Sources" value={lead.source_matching || "Sirene · Pappers"} />
          </div>
        </div>
      </section>

      {contacts.length > 0 && (
        <section className="mb-7">
          <div className="mb-4">
            <div className="snap-label font-semibold text-ember">Contacts de l'entreprise</div>
            <h2 className="mt-1 text-2xl">{contacts.length} contact{contacts.length > 1 ? "s" : ""} classé{contacts.length > 1 ? "s" : ""} par pertinence</h2>
            <p className="mt-1 text-sm text-muted">Le score combine pouvoir de décision, proximité avec les opérations et moyens de contact disponibles.</p>
          </div>
          {(primaryDecisionMaker || operationalSponsor) && (
            <div className="snap-panel-alt mb-4 p-4">
              <div className="snap-label font-semibold text-ember">Stratégie de contact recommandée</div>
              <p className="mt-2 text-sm leading-6">
                {primaryDecisionMaker && <>Décision : <strong>{contactName(primaryDecisionMaker)}</strong>{primaryDecisionMaker.contact_job_title ? `, ${primaryDecisionMaker.contact_job_title}` : ""}. </>}
                {operationalSponsor && <>Validation terrain : <strong>{contactName(operationalSponsor)}</strong>{operationalSponsor.contact_job_title ? `, ${operationalSponsor.contact_job_title}` : ""}. </>}
                {financialInfluencer && financialInfluencer.id !== primaryDecisionMaker?.id && <>Validation administrative : <strong>{contactName(financialInfluencer)}</strong>.</>}
              </p>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {contacts.map((contact) => <ContactCard key={contact.id} contact={contact} selected={contact.id === lead.id} />)}
          </div>
        </section>
      )}

      <section className="mb-7 border-y py-7" style={{ borderColor: "var(--c-line)" }}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="snap-label font-semibold text-brick">Entreprises similaires</div>
            <h2 className="snap-title mt-1 text-4xl">{confreres.length || "Aucun"} profil{confreres.length > 1 ? "s" : ""} dans la zone</h2>
            <p className="mt-1 text-sm text-muted">Recherche Pappers · NAF {lead.code_naf || "-"} · département {lead.departement || "-"}</p>
          </div>
          <button disabled={busy} onClick={searchConfreres} className="snap-button disabled:opacity-50">
            <Users size={16} />
            Rechercher
          </button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {confreres.map((peer, index) => <LeadCard key={peer.id} lead={peer} index={index} />)}
          {confreres.length === 0 && <div className="snap-panel p-6 text-muted">Aucun confrère recherché pour ce lead.</div>}
        </div>
      </section>

      <section className="mb-7">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl">Prochaines actions</h2>
          <span className="snap-label">Tout est prêt à copier-coller</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ScriptDisplay title="Script d'appel · 30 s" content={lead.script_appel} />
          <ScriptDisplay title="Email de prise de contact" content={lead.email_prospection} />
        </div>
      </section>

      <section className="snap-panel p-4">
        <label htmlFor="lead-notes" className="mb-2 block font-semibold">Notes</label>
        <textarea id="lead-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Note rapide après appel…" className="snap-input min-h-28 p-3" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => updateLead({ notes })} className="snap-button-secondary">Enregistrer</button>
          <div className="relative">
            <button disabled={busy} onClick={() => setQualificationMenuOpen((open) => !open)} className="snap-button disabled:opacity-50"><Sparkles size={16} />Qualifier</button>
            {qualificationMenuOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-lg border border-border bg-popover p-2 shadow-[var(--shadow-elegant)]">
                <button onClick={() => qualify("lead")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">Lead uniquement</button>
                <button onClick={() => qualify("contacts")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">Contacts uniquement</button>
                <button onClick={() => qualify("both")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">Lead et contacts</button>
              </div>
            )}
          </div>
          <button onClick={() => updateLead({ status: "contacted" })} className="snap-button bg-good border-good"><Check size={16} />Contacté</button>
          <button onClick={() => updateLead({ status: "archived" })} className="snap-button-secondary"><Archive size={16} />Archiver</button>
          <button onClick={() => downloadCsv("scovio-lead.csv", leadsToCsv(all))} className="snap-button-secondary"><FileDown size={16} />CSV</button>
          {lead.telephone && <a href={phoneHref(lead.telephone)} className="snap-button-secondary"><Phone size={16} />Appeler</a>}
          {lead.site_web && <a href={websiteHref(lead.site_web)} target="_blank" rel="noreferrer" className="snap-button-secondary"><ExternalLink size={16} />Site</a>}
        </div>
      </section>
      {scoreOpen && <ScoreDetails lead={lead} onClose={() => setScoreOpen(false)} />}
      {relevanceOpen && <RelevanceDetails lead={lead} onClose={() => setRelevanceOpen(false)} />}
    </div>
  );
}
