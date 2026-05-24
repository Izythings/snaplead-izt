import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Check, ExternalLink, Filter, Phone, Search, Send } from "lucide-react";
import ConfidenceBadge from "../components/ConfidenceBadge";
import RelevanceBadge from "../components/RelevanceBadge";
import { useLeads } from "../hooks/useLeads";
import { useToast } from "../components/StatusToast";
import { leadName } from "../lib/constants";
import { relevanceScore } from "../lib/relevance";
import { supabase } from "../lib/supabase";
import type { LeadStatus, LeadWithCapture } from "../lib/types";

const statusLabels: Record<LeadStatus, string> = {
  identified: "Identifié",
  enriched: "Enrichi",
  actionable: "À contacter",
  contacted: "Contacté",
  archived: "Archivé",
};

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

const activityOf = (lead: LeadWithCapture) => lead.libelle_naf || lead.activite || "Activité non identifiée";
const formatDate = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

type SortField = "name" | "activity" | "score" | "confidence" | "date" | "status";
type SortDirection = "asc" | "desc";

const parseSort = (sort: string): { field: SortField; direction: SortDirection } => {
  const [field, direction] = sort.split("-");
  const validField = ["name", "activity", "score", "confidence", "date", "status"].includes(field) ? (field as SortField) : "date";
  const validDirection = direction === "asc" ? "asc" : "desc";
  return { field: validField, direction: validDirection };
};

const compareText = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });

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
    const { error } = await supabase.from("leads").update({ status: nextStatus }).eq("id", lead.id);
    if (error) {
      toast.error("Statut non modifié", error.message);
      return;
    }
    toast.success(`${leadName(lead)} passé en ${statusLabels[nextStatus]}`);
    await reload();
  };

  return (
    <div className="pb-24">
      <header className="mb-6 border-b pb-6" style={{ borderColor: "var(--c-line)" }}>
        <div className="snap-label text-brick">CRM interne</div>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="snap-title text-5xl leading-none md:text-6xl">Leads</h1>
            <p className="snap-copy mt-2 max-w-2xl text-base">
              Base commerciale issue des captures terrain et des confrères similaires.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/import" className="snap-button bg-brick border-brick">Nouvelle capture</Link>
            <Link to="/plan" className="snap-button-secondary"><Send size={16} />Plan d'appel</Link>
          </div>
        </div>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Leads filtrés", filtered.length],
          ["Captures terrain", photoLeads],
          ["À appeler", toCall],
          ["Pertinence moyenne", `${avgRelevance}/100`],
        ].map(([label, value]) => (
          <div key={label} className="snap-panel p-4">
            <div className="snap-label">{label}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
          </div>
        ))}
      </section>

      <section className="snap-panel mb-5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter size={16} className="text-brick" />
          <div className="snap-label text-ink">Filtres</div>
          {capture && <button onClick={() => updateParam("capture", "")} className="ml-auto text-sm font-medium text-brick">Retirer le filtre capture</button>}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_0.8fr_1fr]">
          <label className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => updateParam("q", event.target.value)}
              placeholder="Rechercher nom, ville, téléphone"
              className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brick"
              style={{ borderColor: "var(--c-line)" }}
            />
          </label>
          <select value={activity} onChange={(event) => updateParam("activity", event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-brick" style={{ borderColor: "var(--c-line)" }}>
            <option value="all">Toutes activités</option>
            {activities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={status} onChange={(event) => updateParam("status", event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-brick" style={{ borderColor: "var(--c-line)" }}>
            <option value="all">Tous statuts</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={score} onChange={(event) => updateParam("score", event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-brick" style={{ borderColor: "var(--c-line)" }}>
            {scoreOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <label className="relative">
            <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="date" value={from} onChange={(event) => updateParam("from", event.target.value)} className="w-full rounded-md border bg-white py-2 pl-9 pr-2 text-sm outline-none focus:border-brick" style={{ borderColor: "var(--c-line)" }} />
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input type="date" value={to} onChange={(event) => updateParam("to", event.target.value)} className="min-w-0 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-brick" style={{ borderColor: "var(--c-line)" }} />
            <select value={sort} onChange={(event) => updateParam("sort", event.target.value)} aria-label="Tri" className="rounded-md border bg-white px-2 py-2 text-sm outline-none focus:border-brick" style={{ borderColor: "var(--c-line)" }}>
              {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="snap-panel overflow-hidden">
        <div className="grid grid-cols-[1.25fr_1fr_0.65fr_0.65fr_0.75fr_0.75fr_1.15fr] border-b bg-cream px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted max-lg:hidden" style={{ borderColor: "var(--c-line)" }}>
          <SortHeader field="name">Entreprise</SortHeader>
          <SortHeader field="activity">Activité</SortHeader>
          <SortHeader field="score">Pertinence</SortHeader>
          <SortHeader field="confidence">Confiance</SortHeader>
          <SortHeader field="date">Date</SortHeader>
          <SortHeader field="status">Statut</SortHeader>
          <div className="flex items-center gap-1"><ArrowUpDown size={13} />Actions</div>
        </div>
        {loading ? (
          <div className="p-6 text-muted">Chargement des leads</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-muted">Aucun lead ne correspond aux filtres.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--c-line)" }}>
            {filtered.map((lead) => (
              <article key={lead.id} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.25fr_1fr_0.65fr_0.65fr_0.75fr_0.75fr_1.15fr] lg:items-center">
                <div className="min-w-0">
                  <Link to={`/leads/${lead.id}`} className="font-semibold hover:text-brick">{leadName(lead)}</Link>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{lead.ville || lead.departement || "Zone inconnue"}</span>
                    {lead.telephone && <span className="mono">{lead.telephone}</span>}
                    {lead.is_from_photo ? <span>Photo</span> : <span>Confrère</span>}
                  </div>
                </div>
                <div className="text-muted lg:text-ink">{activityOf(lead)}</div>
                <RelevanceBadge score={relevanceScore(lead)} />
                <ConfidenceBadge score={lead.confidence_score} />
                <div className="mono text-xs text-muted">{formatDate(lead.created_at)}</div>
                <div>
                  <span className="rounded bg-cream px-2 py-1 text-xs font-semibold">{statusLabels[lead.status]}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.telephone && <a href={`tel:${lead.telephone.replace(/\s/g, "")}`} className="snap-button-secondary py-1.5 text-xs"><Phone size={14} />Appeler</a>}
                  {lead.site_web && <a href={lead.site_web.startsWith("http") ? lead.site_web : `https://${lead.site_web}`} target="_blank" rel="noreferrer" className="snap-button-secondary py-1.5 text-xs"><ExternalLink size={14} />Site</a>}
                  {lead.status !== "contacted" && <button onClick={() => updateStatus(lead, "contacted")} className="snap-button py-1.5 text-xs"><Check size={14} />Contacté</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
