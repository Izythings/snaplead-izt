import { useEffect, useMemo, useState } from "react";
import { Eye, Save, X } from "lucide-react";
import { createColdEmailSettingsActions } from "../application/services/coldEmailSettings";
import { useToast } from "../components/StatusToast";
import { renderTemplate } from "../domain/email/render";
import {
  DEFAULT_J0_CSV_TEMPLATE,
  EMPTY_SALES_IDENTITY,
  type EmailTemplateInput,
  type SalesIdentityInput,
} from "../domain/email/settings";
import { getEmailTimeWindow } from "../domain/email/timeWindow";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

const actions = createColdEmailSettingsActions(supabaseDataGateway);

const sampleLead = {
  nom: "Bonsignore",
  entreprise: "Frigo Antilles",
  ville: "Fort-de-France",
};

type PreviewProps = {
  identity: SalesIdentityInput;
  template: Pick<EmailTemplateInput, "subject" | "body">;
  onClose: () => void;
};

function PreviewModal({ identity, template, onClose }: PreviewProps) {
  const timeWindow = getEmailTimeWindow();
  const variables = {
    ...sampleLead,
    fenetre_temps: timeWindow,
    calendly_url: identity.calendly_url,
    signature: identity.signature_html,
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <section
        className="snap-panel max-h-[86vh] w-full max-w-2xl overflow-auto p-5 shadow-[var(--shadow-elegant)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cold-email-preview-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="snap-label text-ember">Lead exemple</div>
            <h2 id="cold-email-preview-title" className="mt-1 text-lg">Aperçu du cold email J0</h2>
            <p className="mt-1 text-sm text-muted">Bonsignore · Frigo Antilles · Fort-de-France · {timeWindow}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted hover:bg-accent" aria-label="Fermer l'aperçu">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 rounded-md border border-border bg-secondary/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Objet</div>
          <div className="mt-1 font-semibold">{renderTemplate(template.subject, variables)}</div>
        </div>
        <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-input p-4 font-mono text-sm leading-6">
          {renderTemplate(template.body, variables)}
        </div>
      </section>
    </div>
  );
}

export default function ColdEmailSettingsPage() {
  const [identity, setIdentity] = useState<SalesIdentityInput>(EMPTY_SALES_IDENTITY);
  const [template, setTemplate] = useState(DEFAULT_J0_CSV_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void actions.load()
      .then((settings) => {
        setIdentity(settings.identity);
        setTemplate(settings.template);
      })
      .catch((error) => toast.error("Chargement de la configuration cold email échoué", error))
      .finally(() => setLoading(false));
  }, []);

  const variablesLabel = useMemo(
    () => "Variables disponibles : {{ nom }}, {{ entreprise }}, {{ ville }}, {{ fenetre_temps }}",
    [],
  );

  const saveIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingIdentity(true);
    try {
      const saved = await actions.saveIdentity(identity);
      setIdentity(saved);
      toast.success("Identité vendeur enregistrée");
    } catch (error) {
      toast.error("Enregistrement de l'identité vendeur échoué", error);
    } finally {
      setSavingIdentity(false);
    }
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingTemplate(true);
    try {
      const saved = await actions.saveTemplate(template);
      setTemplate(saved);
      toast.success("Template cold email J0 enregistré");
    } catch (error) {
      toast.error("Enregistrement du template cold email échoué", error);
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) {
    return <div className="snap-panel p-6 text-muted" role="status">Chargement de la configuration cold email</div>;
  }

  return (
    <div>
      <header className="mb-6 border-b border-border pb-6">
        <div className="snap-label text-ember">Réglages</div>
        <h1 className="mt-2 text-xl md:text-[30px]">Cold email</h1>
        <p className="snap-copy mt-2 text-sm md:text-base">Configurez l'identité vendeur et le message J0 utilisé pour les imports CSV.</p>
      </header>

      <form onSubmit={saveIdentity} className="snap-panel mb-6 p-4 md:p-5">
        <div>
          <h2 className="text-lg">Identité vendeur</h2>
          <p className="mt-1 text-sm text-muted">Cette identité est utilisée dans les emails CSV et dans la génération des messages issus des captures photo.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Nom
            <input value={identity.display_name} onChange={(event) => setIdentity({ ...identity, display_name: event.target.value })} className="snap-input px-3 py-2" name="display_name" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Téléphone
            <input value={identity.phone} onChange={(event) => setIdentity({ ...identity, phone: event.target.value })} className="snap-input px-3 py-2" name="phone" type="tel" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Lien Calendly
            <input value={identity.calendly_url} onChange={(event) => setIdentity({ ...identity, calendly_url: event.target.value })} className="snap-input px-3 py-2" name="calendly_url" type="url" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            Signature HTML
            <textarea value={identity.signature_html} onChange={(event) => setIdentity({ ...identity, signature_html: event.target.value })} className="snap-input min-h-36 p-3" name="signature_html" rows={6} />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button disabled={savingIdentity} className="snap-button disabled:opacity-60">
            <Save size={16} />
            {savingIdentity ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>

      <form onSubmit={saveTemplate} className="snap-panel p-4 md:p-5">
        <div>
          <h2 className="text-lg">Template cold email J0 (CSV)</h2>
          <p className="mt-1 text-sm text-muted">Ce message est rendu lors d'un import CSV lorsque la ligne ne fournit pas déjà son propre email de prospection.</p>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Objet
            <input value={template.subject} onChange={(event) => setTemplate({ ...template, subject: event.target.value })} className="snap-input px-3 py-2" name="subject" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Corps
            <textarea value={template.body} onChange={(event) => setTemplate({ ...template, body: event.target.value })} className="snap-input min-h-[22rem] p-3 font-mono text-sm leading-6" name="body" rows={14} required />
          </label>
          <p className="font-mono text-xs text-muted">{variablesLabel}</p>
        </div>
        <div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button type="button" onClick={() => setPreviewOpen(true)} className="snap-button-secondary">
            <Eye size={16} />
            Aperçu
          </button>
          <button disabled={savingTemplate} className="snap-button disabled:opacity-60">
            <Save size={16} />
            {savingTemplate ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>

      {previewOpen && <PreviewModal identity={identity} template={template} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
