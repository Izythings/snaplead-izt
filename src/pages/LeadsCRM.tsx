import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Check, ExternalLink, Filter, Flame, Phone, Search, Send, Users } from "lucide-react";
import ConfidenceBadge from "../components/ConfidenceBadge";
import ScoreChip from "../components/ScoreChip";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import LeadCard from "../components/LeadCard";
import { useLeads } from "../hooks/useLeads";
import { useToast } from "../components/StatusToast";
import { createLeadActions } from "../application/services/leadActions";
import { activityOf, compareText, formatLeadDate, leadName, phoneHref, statusLabels, websiteHref } from "../domain/leads/lead";
import { relevanceScore } from "../domain/leads/relevance";
import type { LeadStatus, LeadWithCapture } from "../domain/shared/types";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

const scoreOptions = [
  { value: "all", label: "Toute pertinence" },
  { value: "75", label: "75+ très pertinent" },
  { value: "55", label: "55+ pertinent" },
  { value: "35", label: "35+ à qualifier" },
];

const sortOptions = [
  { value: "date-desc", label: "Plus récents" },
  { value: "date-asc", label: "Plus anciens" },
  { value: "score-desc", label: "Pertinence décroissante" },
  { value: "score-asc", label: "Pertinence croissante" },
  { value: "confidence-desc", label: "Confiance décroissante" },
  { value: "confidence-asc", label: "Confiance croissante" },
  { value: "name-asc", label: "Entreprise A-Z" },
  { value: "activity-asc", label: "Activité A-Z" },
];

type SortField = "name" | "activity" | "score" | "confidence" | "date" | "status";
type SortDirection = "asc" | "desc";

const parseSort = (sort: string): { field: SortField; direction: SortDirection } => {
  const [field, direction] = sort.split("-");
  const validField = ["name", "activity", "score", "confidence", "date", "status"].includes(field) ? (field as SortField) : "date";
  const validDirection = direction === "asc" ? "asc" : "desc";
  return { field: validField, direction: validDirection };
};

const leadActions = createLeadActions(supabaseDataGateway);

export default function LeadsCRM() {
  const { leads, loading, reload } = useLeads();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const query = params.get("q") ?? "";
  const activity = params.get("activity") ?? "all";
  const status = params.get("status") ?? "all";
  const score = params.get("score") ?? "all";
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
    const Icon = active ? (activeSort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 text-left transition hover:text-ink ${active ? "text-ink" : ""}`}
        aria-label={`Trier par ${String(children)}`}
      >
        <span>{children}</span>
        <Icon size={13} />
      </button>
    );
  };

  const activities = Array.from(new Set(leads.map(activityOf))).sort((a, b) => a.localeCompare(b, "fr"));

  const filtered = leads
    .filter((lead) => {
      const haystack = [leadName(lead), lead.raison_sociale, lead.telephone, lead.ville, lead.departement, activityOf(lead)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (activity !== "all" && activityOf(lead) !== activity) return false;
      if (status !== "all" && lead.status !== status) return false;
      if (capture && lead.capture_id !== capture) return false;
      if (score !== "all" && Math.round(relevanceScore(lead) * 100) < Number(score)) return false;
      const created = lead.created_at.slice(0, 10);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    })
    .sort((a, b) => {
      let result = 0;
      if (activeSort.field === "score") result = relevanceScore(a) - relevanceScore(b);
      if (activeSort.field === "confidence") result = (a.confidence_score ?? 0) - (b.confidence_score ?? 0);
      if (activeSort.field === "date") result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (activeSort.field === "name") result = compareText(leadName(a), leadName(b));
      if (activeSort.field === "activity") result = compareText(activityOf(a), activityOf(b));
      if (activeSort.field === "status") result = compareText(statusLabels[a.status], statusLabels[b.status]);
      return activeSort.direction === "asc" ? result : -result;
    });

  const photoLeads = filtered.filter((lead) => lead.is_from_photo).length;
  const toCall = filtered.filter((lead) => lead.status === "actionable" || lead.status === "enriched").length;
  const contacted = filtered.filter((lead) => lead.status === "contacted").length;
  const avgRelevance = filtered.length
    ? Math.round((filtered.reduce((sum, lead) => sum + relevanceScore(lead), 0) / filtered.length) * 100)
    : 0;

  const updateStatus = async (lead: LeadWithCapture, nextStatus: LeadStatus) => {
    try {
      await leadActions.updateLead(lead.id, { status: nextStatus });
    } catch (error) {
      toast.error("Statut non modifié", error instanceof Error ? error.message : String(error));
      return;
    }
    toast.success(`${leadName(lead)} passé en ${statusLabels[nextStatus]}`);
    await reload();
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="snap-label text-ember">CRM interne</div>
          <h1 className="mt-2 text-xl md:text-[30px]">Leads</h1>
          <p className="snap-copy mt-2 max-w-2xl text-sm md:text-base">Base commerciale issue des captures terrain et des entreprises similaires.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/plan" className="snap-button-secondary"><Send size={16} />Plan d'appel</Link>
          <Link to="/import" className="snap-button">Nouvelle capture</Link>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads filtrés" value={filtered.length} icon={Users} />
        <StatCard label="Captures terrain" value={photoLeads} icon={Search} />
        <StatCard label="À appeler" value={toCall} icon={Phone} />
        <StatCard label="Score moyen" value={`${avgRelevance}/100`} icon={Flame} />
      </section>

      <section className="sticky top-14 z-20 -mx-4 mb-5 border-y border-border bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-16 lg:-mx-8 lg:px-8">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            ["all", "Tous", leads.length],
            ["identified", "Nouveaux", leads.filter((lead) => lead.status === "identified").length],
            ["actionable", "À appeler", leads.filter((lead) => lead.status === "actionable").length],
            ["contacted", "Contactés", contacted],
          ].map(([value, label, count]) => (
            <button
              key={String(value)}
              onClick={() => updateParam("status", String(value))}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
                status === value || (value === "all" && status === "all") ? "border-ember/40 bg-ember/15 text-ember" : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              {label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(240px,1fr)_repeat(5,auto)]">
          <label className="relative">
            <span className="sr-only">Rechercher des leads</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(event) => updateParam("q", event.target.value)} placeholder="Nom, ville, téléphone…" className="snap-input py-2 pl-9 pr-3 text-sm" />
          </label>
          <select aria-label="Activité" value={activity} onChange={(event) => updateParam("activity", event.target.value)} className="snap-input px-3 text-sm md:w-40">
            <option value="all">Toutes activités</option>
            {activities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Score minimum" value={score} onChange={(event) => updateParam("score", event.target.value)} className="snap-input px-3 text-sm md:w-40">
            {scoreOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <label className="relative">
            <span className="sr-only">Date de début</span>
            <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="date" value={from} onChange={(event) => updateParam("from", event.target.value)} className="snap-input py-2 pl-9 pr-2 text-sm md:w-40" />
          </label>
          <input aria-label="Date de fin" type="date" value={to} onChange={(event) => updateParam("to", event.target.value)} className="snap-input px-3 text-sm md:w-40" />
          <select value={sort} onChange={(event) => updateParam("sort", event.target.value)} aria-label="Tri" className="snap-input px-3 text-sm md:w-48">
            {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        {capture && <button onClick={() => updateParam("capture", "")} className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-ember"><Filter size={14} />Retirer le filtre capture</button>}
      </section>

      {loading ? (
        <div className="snap-panel p-6 text-muted" role="status">Chargement des leads</div>
      ) : filtered.length === 0 ? (
        <div className="snap-panel grid min-h-60 place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted"><Search size={22} /></span>
            <h2 className="mt-4 text-lg">Aucun lead pour ce filtre</h2>
            <p className="mt-1 text-sm text-muted">Modifiez la recherche ou réinitialisez les filtres.</p>
            <button onClick={() => setParams({}, { replace: true })} className="snap-button mt-4">Réinitialiser</button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {filtered.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>

          <section className="snap-panel hidden overflow-hidden lg:block">
            <div className="grid h-11 grid-cols-[1.35fr_1fr_0.65fr_0.75fr_0.7fr_1.1fr] items-center border-b border-border bg-muted-surface/60 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <SortHeader field="name">Entreprise</SortHeader>
              <SortHeader field="activity">Activité</SortHeader>
              <SortHeader field="score">Score</SortHeader>
              <SortHeader field="date">Date</SortHeader>
              <SortHeader field="status">Statut</SortHeader>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((lead) => (
                <article key={lead.id} className="grid min-h-[52px] grid-cols-[1.35fr_1fr_0.65fr_0.75fr_0.7fr_1.1fr] items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted-surface/30">
                  <div className="min-w-0">
                    <Link to={`/leads/${lead.id}`} className="truncate font-semibold hover:text-ember">{leadName(lead)}</Link>
                    <div className="mt-0.5 truncate text-xs text-muted">{lead.ville || lead.departement || "Zone inconnue"} {lead.telephone ? `· ${lead.telephone}` : ""}</div>
                  </div>
                  <div className="truncate text-muted">{activityOf(lead)}</div>
                  <div className="flex items-center gap-1.5">
                    <ScoreChip score={relevanceScore(lead)} label="Pertinence" />
                    <ConfidenceBadge score={lead.confidence_score} />
                  </div>
                  <div className="mono text-xs text-muted">{formatLeadDate(lead.created_at)}</div>
                  <StatusBadge status={lead.status} />
                  <div className="flex gap-1">
                    {lead.telephone && <a href={phoneHref(lead.telephone)} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Appeler ${leadName(lead)}`}><Phone size={15} /></a>}
                    {lead.site_web && <a href={websiteHref(lead.site_web)} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-accent hover:text-ember" aria-label={`Ouvrir le site de ${leadName(lead)}`}><ExternalLink size={15} /></a>}
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
