import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CalendarDays,
  Check,
  ExternalLink,
  Flame,
  Mail,
  Phone,
  Rocket,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import CampaignBadge from "../components/CampaignBadge";
import ConfidenceBadge from "../components/ConfidenceBadge";
import LeadCard from "../components/LeadCard";
import QualificationBadge from "../components/QualificationBadge";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { createLeadActions } from "../application/services/leadActions";
import { activityOf, compareText, formatLeadDate, leadName, phoneHref, statusLabels, websiteHref } from "../domain/leads/lead";
import type { LeadStatus, LeadWithCapture } from "../domain/shared/types";
import { useLeads } from "../hooks/useLeads";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";
import { useToast } from "../components/StatusToast";

const scoreOptions = [
  { value: "all", label: "Tous les scores" },
  { value: "na", label: "N/A · non qualifiés" },
  { value: "75", label: "75+ très pertinent" },
  { value: "55", label: "55+ pertinent" },
  { value: "35", label: "35+ à qualifier" },
  { value: "below35", label: "Moins de 35" },
];

const sortOptions = [
  { value: "date-desc", label: "Plus récents" },
  { value: "date-asc", label: "Plus anciens" },
  { value: "score-desc", label: "Score décroissant" },
  { value: "score-asc", label: "Score croissant" },
  { value: "confidence-desc", label: "Confiance décroissante" },
  { value: "name-asc", label: "Entreprise A-Z" },
  { value: "activity-asc", label: "Activité A-Z" },
];

type SortField = "name" | "activity" | "score" | "confidence" | "date" | "status";
type SortDirection = "asc" | "desc";

const parseSort = (sort: string): { field: SortField; direction: SortDirection } => {
  const [field, direction] = sort.split("-");
  return {
    field: ["name", "activity", "score", "confidence", "date", "status"].includes(field) ? field as SortField : "date",
    direction: direction === "asc" ? "asc" : "desc",
  };
};

const companyKey = (lead: LeadWithCapture) =>
  lead.source_external_id || lead.siren || lead.raison_sociale || lead.nom_commercial || lead.id;

const leadActions = createLeadActions(supabaseDataGateway);

export default function LeadsCRM() {
  const { leads, loading, reload } = useLeads();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState<Set<string>>(new Set());
  const [launchingBatch, setLaunchingBatch] = useState(false);
  const [qualifying, setQualifying] = useState(false);
  const [qualificationMenuOpen, setQualificationMenuOpen] = useState(false);

  const query = params.get("q") ?? "";
  const activity = params.get("activity") ?? "all";
  const status = params.get("status") ?? "all";
  const score = params.get("score") ?? "all";
  const naf = params.get("naf") ?? "all";
  const size = params.get("size") ?? "all";
  const source = params.get("source") ?? "all";
  const qualification = params.get("qualification") ?? "all";
  const campaign = params.get("campaign") ?? "all";
  const email = params.get("email") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const sort = params.get("sort") ?? "date-desc";
  const capture = params.get("capture") ?? "";
  const activeSort = parseSort(sort);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const toggleSort = (field: SortField) => {
    const direction = activeSort.field === field && activeSort.direction === "asc" ? "desc" : "asc";
    updateParam("sort", `${field}-${direction}`);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const active = activeSort.field === field;
    const Icon = active ? activeSort.direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
    return (
      <button type="button" onClick={() => toggleSort(field)} className={`flex items-center gap-1 text-left hover:text-ink ${active ? "text-ink" : ""}`} aria-label={`Trier par ${String(children)}`}>
        <span>{children}</span><Icon size={13} />
      </button>
    );
  };

  const activities = Array.from(new Set(leads.map(activityOf))).sort((a, b) => a.localeCompare(b, "fr"));
  const nafCodes = Array.from(new Set(leads.map((lead) => lead.code_naf).filter(Boolean) as string[])).sort();
  const sizes = Array.from(new Set(leads.map((lead) => lead.effectif).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "fr"));

  const filtered = leads
    .filter((lead) => {
      const haystack = [
        leadName(lead),
        lead.raison_sociale,
        lead.contact_first_name,
        lead.contact_last_name,
        lead.email,
        lead.telephone,
        lead.ville,
        lead.departement,
        lead.code_naf,
        activityOf(lead),
      ].filter(Boolean).join(" ").toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (activity !== "all" && activityOf(lead) !== activity) return false;
      if (naf !== "all" && lead.code_naf !== naf) return false;
      if (size !== "all" && lead.effectif !== size) return false;
      if (source === "photo" && !lead.is_from_photo) return false;
      if (source === "import" && lead.is_from_photo) return false;
      if (qualification !== "all" && lead.company_qualification_status !== qualification) return false;
      if (campaign !== "all" && lead.campaign_status !== campaign) return false;
      if (email === "yes" && !lead.email) return false;
      if (email === "no" && lead.email) return false;
      if (status !== "all" && lead.status !== status) return false;
      if (capture && lead.capture_id !== capture) return false;
      if (score === "na" && lead.company_qualification_status === "qualified") return false;
      if (score === "below35" && (lead.company_qualification_score === null || lead.company_qualification_score >= 0.35)) return false;
      if (!["all", "na", "below35"].includes(score) && (lead.company_qualification_score === null || lead.company_qualification_score * 100 < Number(score))) return false;
      const created = lead.created_at.slice(0, 10);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    })
    .sort((a, b) => {
      let result = 0;
      if (activeSort.field === "score") result = (a.company_qualification_score ?? -1) - (b.company_qualification_score ?? -1);
      if (activeSort.field === "confidence") result = (a.confidence_score ?? -1) - (b.confidence_score ?? -1);
      if (activeSort.field === "date") result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (activeSort.field === "name") result = compareText(leadName(a), leadName(b));
      if (activeSort.field === "activity") result = compareText(activityOf(a), activityOf(b));
      if (activeSort.field === "status") result = compareText(statusLabels[a.status], statusLabels[b.status]);
      return activeSort.direction === "asc" ? result : -result;
    });

  const qualifiedLeads = filtered.filter((lead) => lead.company_qualification_score !== null);
  const avgScore = qualifiedLeads.length
    ? Math.round(qualifiedLeads.reduce((sum, lead) => sum + (lead.company_qualification_score ?? 0), 0) / qualifiedLeads.length * 100)
    : null;
  const selectedLeads = leads.filter((lead) => selectedIds.has(lead.id));
  const campaignReady = selectedLeads.filter((lead) => lead.email && ["ready", "failed"].includes(lead.campaign_status));
  const allFilteredSelected = filtered.length > 0 && filtered.every((lead) => selectedIds.has(lead.id));

  const toggleLead = (leadId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filtered.forEach((lead) => allFilteredSelected ? next.delete(lead.id) : next.add(lead.id));
      return next;
    });
  };

  const updateStatus = async (lead: LeadWithCapture, nextStatus: LeadStatus) => {
    try {
      await leadActions.updateLead(lead.id, { status: nextStatus });
      toast.success(`${leadName(lead)} passé en ${statusLabels[nextStatus]}`);
      await reload();
    } catch (error) {
      toast.error("Statut non modifié", error instanceof Error ? error.message : String(error));
    }
  };

  const launchCampaign = async (lead: LeadWithCapture) => {
    setLaunching((current) => new Set(current).add(lead.id));
    try {
      await leadActions.launchCampaign(lead.id);
      toast.success(`Campagne lancée pour ${lead.contact_first_name || leadName(lead)}`);
    } catch (error) {
      toast.error("Campagne non lancée", error instanceof Error ? error.message : String(error));
    } finally {
      setLaunching((current) => {
        const next = new Set(current);
        next.delete(lead.id);
        return next;
      });
      await reload();
    }
  };

  const launchSelectedCampaigns = async () => {
    if (!campaignReady.length || !window.confirm(`Lancer la campagne pour ${campaignReady.length} contact(s) ?`)) return;
    setLaunchingBatch(true);
    let ok = 0;
    let ko = 0;
    for (const lead of campaignReady) {
      try {
        await leadActions.launchCampaign(lead.id);
        ok += 1;
      } catch {
        ko += 1;
      }
    }
    if (ok) toast.success(`${ok} campagne(s) lancée(s)`);
    if (ko) toast.error(`${ko} campagne(s) en échec`, "Vérifiez le webhook n8n.");
    setLaunchingBatch(false);
    setSelectedIds(new Set());
    await reload();
  };

  const qualifySelected = async (scope: "lead" | "contacts" | "both") => {
    if (!selectedIds.size) return;
    setQualifying(true);
    setQualificationMenuOpen(false);
    try {
      const result = await leadActions.qualifyLeads([...selectedIds], scope);
      toast.success(`${result.qualified ?? selectedIds.size} ligne(s) traitée(s)`);
      setSelectedIds(new Set());
      await reload();
    } catch (error) {
      toast.error("Qualification échouée", error instanceof Error ? error.message : String(error));
    } finally {
      setQualifying(false);
    }
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="snap-label text-ember">CRM interne</div>
          <h1 className="mt-2 text-xl md:text-[30px]">Leads</h1>
          <p className="snap-copy mt-2 max-w-2xl text-sm md:text-base">Filtrez, sélectionnez, qualifiez puis activez vos campagnes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/plan" className="snap-button-secondary"><Send size={16} />Plan d'appel</Link>
          <Link to="/import" className="snap-button-secondary">Importer</Link>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Lignes filtrées" value={filtered.length} icon={Users} />
        <StatCard label="Entreprises" value={new Set(filtered.map(companyKey)).size} icon={Building2} />
        <StatCard label="Non qualifiés" value={filtered.filter((lead) => lead.company_qualification_status === "pending").length} icon={Sparkles} />
        <StatCard label="À appeler" value={filtered.filter((lead) => ["actionable", "enriched"].includes(lead.status)).length} icon={Phone} />
        <StatCard label="Score moyen" value={avgScore === null ? "N/A" : `${avgScore}/100`} icon={Flame} />
      </section>

      <section className="-mx-4 mb-5 border-y border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:sticky md:top-16 md:z-20 lg:-mx-8 lg:px-8">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            ["all", "Tous", leads.length],
            ["identified", "Nouveaux", leads.filter((lead) => lead.status === "identified").length],
            ["actionable", "À contacter", leads.filter((lead) => lead.status === "actionable").length],
            ["contacted", "Contactés", leads.filter((lead) => lead.status === "contacted").length],
          ].map(([value, label, count]) => (
            <button key={String(value)} onClick={() => updateParam("status", String(value))} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold ${status === value ? "border-ember/40 bg-ember/15 text-ember" : "border-border bg-card text-muted hover:text-foreground"}`}>
              {label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Rechercher des leads</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(event) => updateParam("q", event.target.value)} placeholder="Entreprise, contact, email…" className="snap-input py-2 pl-9 pr-3 text-sm" />
          </label>
          <select aria-label="Activité" value={activity} onChange={(event) => updateParam("activity", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Toutes activités</option>
            {activities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Code NAF" value={naf} onChange={(event) => updateParam("naf", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Tous codes NAF</option>
            {nafCodes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Effectif" value={size} onChange={(event) => updateParam("size", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Tous effectifs</option>
            {sizes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Score" value={score} onChange={(event) => updateParam("score", event.target.value)} className="snap-input px-3 text-sm">
            {scoreOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select aria-label="Qualification" value={qualification} onChange={(event) => updateParam("qualification", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Toute qualification</option>
            <option value="pending">Non qualifiés</option>
            <option value="qualified">Qualifiés</option>
            <option value="failed">En erreur</option>
          </select>
          <select aria-label="Source" value={source} onChange={(event) => updateParam("source", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Toutes sources</option>
            <option value="photo">Photos</option>
            <option value="import">Imports manuels</option>
          </select>
          <select aria-label="Campagne" value={campaign} onChange={(event) => updateParam("campaign", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Toutes campagnes</option>
            <option value="ready">Prêts</option>
            <option value="queued">En file</option>
            <option value="sent">J0 envoyé</option>
            <option value="replied">Répondus</option>
            <option value="failed">En erreur</option>
          </select>
          <select aria-label="Présence email" value={email} onChange={(event) => updateParam("email", event.target.value)} className="snap-input px-3 text-sm">
            <option value="all">Avec ou sans email</option>
            <option value="yes">Avec email</option>
            <option value="no">Sans email</option>
          </select>
          <label className="relative">
            <span className="sr-only">Date de début</span>
            <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="date" value={from} onChange={(event) => updateParam("from", event.target.value)} className="snap-input py-2 pl-9 pr-2 text-sm" />
          </label>
          <input aria-label="Date de fin" type="date" value={to} onChange={(event) => updateParam("to", event.target.value)} className="snap-input px-3 text-sm" />
          <select value={sort} onChange={(event) => updateParam("sort", event.target.value)} aria-label="Tri" className="snap-input px-3 text-sm">
            {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </section>

      {selectedIds.size > 0 && (
        <section className="sticky top-[8.5rem] z-20 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-ember/30 bg-popover p-3 shadow-[var(--shadow-elegant)] md:top-[9.5rem]">
          <span className="mr-2 text-sm font-semibold">{selectedIds.size} sélectionné(s)</span>
          <div className="relative">
            <button disabled={qualifying} onClick={() => setQualificationMenuOpen((open) => !open)} className="snap-button disabled:opacity-50">
              <Sparkles size={16} />{qualifying ? "Qualification…" : "Qualifier"}
            </button>
            {qualificationMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-lg border border-border bg-popover p-2 shadow-[var(--shadow-elegant)]">
                <button onClick={() => qualifySelected("lead")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">Leads uniquement</button>
                <button onClick={() => qualifySelected("contacts")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">Contacts uniquement</button>
                <button onClick={() => qualifySelected("both")} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent">Leads et contacts</button>
              </div>
            )}
          </div>
          <button disabled={launchingBatch || !campaignReady.length} onClick={launchSelectedCampaigns} className="snap-button-secondary disabled:opacity-50">
            <Rocket size={16} />{launchingBatch ? "Lancement…" : `Lancer campagne (${campaignReady.length})`}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs font-semibold text-muted hover:text-foreground">Effacer</button>
        </section>
      )}

      {loading ? (
        <div className="snap-panel p-6 text-muted" role="status">Chargement des leads</div>
      ) : filtered.length === 0 ? (
        <div className="snap-panel grid min-h-60 place-items-center p-6 text-center">
          <div>
            <Search size={22} className="mx-auto text-muted" />
            <h2 className="mt-4 text-lg">Aucun lead pour ces filtres</h2>
            <button onClick={() => setParams({}, { replace: true })} className="snap-button mt-4">Réinitialiser</button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            <label className="flex items-center gap-2 px-1 text-xs font-semibold text-muted">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="h-4 w-4 accent-[oklch(var(--ember))]" />
              Sélectionner les résultats filtrés
            </label>
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                selected={selectedIds.has(lead.id)}
                onToggle={() => toggleLead(lead.id)}
                onLaunch={() => launchCampaign(lead)}
                launching={launching.has(lead.id)}
              />
            ))}
          </div>

          <section className="snap-panel hidden overflow-x-auto lg:block">
            <div className="grid h-11 min-w-[1220px] grid-cols-[32px_1.2fr_0.9fr_1fr_0.8fr_0.65fr_0.8fr_0.85fr_1.15fr] items-center gap-3 border-b border-border bg-muted-surface/60 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="h-4 w-4 accent-[oklch(var(--ember))]" aria-label="Sélectionner les résultats filtrés" />
              <SortHeader field="name">Entreprise</SortHeader>
              <div>Contact</div>
              <SortHeader field="activity">Activité / NAF</SortHeader>
              <SortHeader field="score">Score</SortHeader>
              <SortHeader field="status">Statut</SortHeader>
              <div>Campagne</div>
              <div>Dernier événement</div>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((lead) => (
                <article key={lead.id} className={`grid min-h-[58px] min-w-[1220px] grid-cols-[32px_1.2fr_0.9fr_1fr_0.8fr_0.65fr_0.8fr_0.85fr_1.15fr] items-center gap-3 px-4 py-2 text-sm hover:bg-muted-surface/30 ${selectedIds.has(lead.id) ? "bg-ember/5" : ""}`}>
                  <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleLead(lead.id)} className="h-4 w-4 accent-[oklch(var(--ember))]" aria-label={`Sélectionner ${leadName(lead)}`} />
                  <div className="min-w-0">
                    <Link to={`/leads/${lead.id}`} className="block truncate font-semibold hover:text-ember">{leadName(lead)}</Link>
                    <div className="mt-0.5 truncate text-xs text-muted">{lead.ville || lead.departement || "Zone inconnue"}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{[lead.contact_first_name, lead.contact_last_name].filter(Boolean).join(" ") || lead.dirigeant || "Contact inconnu"}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">{lead.contact_job_title || lead.email || "Aucune fonction"}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-muted">{activityOf(lead)}</div>
                    <div className="mt-0.5 text-xs text-muted">{lead.code_naf || "NAF inconnu"} · {lead.effectif || "effectif inconnu"}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <QualificationBadge status={lead.company_qualification_status} score={lead.company_qualification_score} />
                    <ConfidenceBadge score={lead.confidence_score} />
                  </div>
                  <StatusBadge status={lead.status} />
                  <CampaignBadge status={lead.campaign_status ?? "not_started"} />
                  <div className="mono text-xs text-muted">
                    {lead.campaign_last_event_at ? formatLeadDate(lead.campaign_last_event_at) : "Jamais"}
                    {lead.campaign_error && <div className="mt-0.5 max-w-36 truncate text-destructive" title={lead.campaign_error}>{lead.campaign_error}</div>}
                  </div>
                  <div className="flex gap-1">
                    {lead.email && <a href={`mailto:${lead.email}`} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Écrire à ${lead.email}`}><Mail size={15} /></a>}
                    {lead.telephone && <a href={phoneHref(lead.telephone)} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Appeler ${leadName(lead)}`}><Phone size={15} /></a>}
                    {lead.site_web && <a href={websiteHref(lead.site_web)} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Ouvrir le site de ${leadName(lead)}`}><ExternalLink size={15} /></a>}
                    {lead.email && ["ready", "failed"].includes(lead.campaign_status) && (
                      <button disabled={launching.has(lead.id)} onClick={() => launchCampaign(lead)} className="inline-flex h-9 items-center gap-1 rounded-md bg-ember px-2 text-xs font-semibold text-[oklch(var(--ember-foreground))] disabled:opacity-50">
                        <Rocket size={14} />{launching.has(lead.id) ? "…" : "Lancer"}
                      </button>
                    )}
                    {lead.status !== "contacted" && <button onClick={() => updateStatus(lead, "contacted")} className="inline-flex h-9 items-center gap-1 rounded-md bg-secondary px-2 text-xs font-semibold hover:bg-accent"><Check size={14} />Contacté</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
