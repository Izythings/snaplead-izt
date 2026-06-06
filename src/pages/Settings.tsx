import { useEffect, useState } from "react";
import { useToast } from "../components/StatusToast";
import { createWebhookSettingsActions, type WebhookForm } from "../application/services/webhookSettings";
import type { WebhookConfig, WebhookLog, WebhookTrigger } from "../domain/shared/types";
import { supabaseDataGateway } from "../infrastructure/supabase/repository";

const emptyConfig = {
  name: "Make",
  url: "",
  headers: "{}",
  trigger_on: "manual" as WebhookTrigger,
  field_mapping: "{}",
};

const webhookActions = createWebhookSettingsActions(supabaseDataGateway);

export default function SettingsPage() {
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [form, setForm] = useState<WebhookForm>(emptyConfig);
  const [error, setError] = useState("");
  const toast = useToast();

  const load = async () => {
    try {
      const data = await supabaseDataGateway.fetchWebhookSettings();
      setConfigs(data.configs);
      setLogs(data.logs);
    } catch (error) {
      toast.error("Chargement webhooks échoué", error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await webhookActions.create(form);
      setForm(emptyConfig);
      toast.success("Webhook ajouté");
      await load();
    } catch (error) {
      const message = error instanceof SyntaxError ? "JSON invalide dans headers ou field mapping." : error instanceof Error ? error.message : String(error);
      setError(message);
      toast.error(error instanceof SyntaxError ? "Webhook invalide" : "Ajout webhook échoué", message);
    }
  };

  const remove = async (id: string) => {
    try {
      await webhookActions.remove(id);
      toast.success("Webhook supprimé");
    } catch (error) {
      toast.error("Suppression webhook échouée", error instanceof Error ? error.message : String(error));
    }
    await load();
  };

  const test = async (configId: string) => {
    try {
      const data = await webhookActions.test(configId) as { results?: Array<{ success: boolean }> };
      if (data?.results?.some((result: { success: boolean }) => !result.success)) toast.error("Test webhook KO", "Le webhook a répondu en erreur");
      else toast.success("Test webhook OK");
    } catch (error) {
      toast.error("Test webhook échoué", error instanceof Error ? error.message : String(error));
    }
    await load();
  };

  return (
    <div>
      <header className="mb-6 border-b border-border pb-6">
        <div className="snap-label text-ember">Réglages CRM</div>
        <h1 className="mt-2 text-xl md:text-[30px]">Intégrations et webhooks</h1>
        <p className="snap-copy mt-2 text-sm md:text-base">Connectez Scovi à vos outils commerciaux sans modifier le flux terrain.</p>
      </header>
      <form onSubmit={save} className="snap-panel mb-6 grid gap-3 p-4 lg:grid-cols-2">
        <input aria-label="Nom de l'intégration" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="snap-input px-3 py-2" placeholder="Nom" />
        <input aria-label="URL du webhook" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required className="snap-input px-3 py-2" placeholder="URL webhook" />
        <select aria-label="Déclencheur du webhook" value={form.trigger_on} onChange={(e) => setForm({ ...form, trigger_on: e.target.value as WebhookTrigger })} className="snap-input px-3 py-2">
          <option value="manual">manual</option>
          <option value="on_enriched">on_enriched</option>
          <option value="on_actionable">on_actionable</option>
          <option value="on_contacted">on_contacted</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm({ ...form, url: "https://hooks.zapier.com/hooks/catch/..." })} className="snap-button-secondary">Zapier</button>
          <button type="button" onClick={() => setForm({ ...form, url: "https://hook.eu1.make.com/..." })} className="snap-button-secondary">Make</button>
          <button type="button" onClick={() => setForm({ ...form, url: "https://n8n.example.com/webhook/..." })} className="snap-button-secondary">n8n</button>
        </div>
        <textarea aria-label="En-têtes JSON" value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} className="snap-input mono min-h-24 p-3 text-sm" />
        <textarea aria-label="Correspondance des champs JSON" value={form.field_mapping} onChange={(e) => setForm({ ...form, field_mapping: e.target.value })} className="snap-input mono min-h-24 p-3 text-sm" />
        <button className="snap-button lg:col-span-2">Ajouter</button>
        {error && <p className="text-sm text-destructive lg:col-span-2" role="alert">{error}</p>}
      </form>

      <section className="mb-6 grid gap-3 lg:grid-cols-2">
        {configs.map((config) => (
          <article key={config.id} className="snap-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{config.name}</h3>
                <p className="mt-1 break-all text-sm text-muted">{config.url}</p>
              </div>
              <span className="rounded bg-secondary px-2 py-1 text-xs">{config.trigger_on}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => test(config.id)} className="snap-button py-1.5 text-sm">Test</button>
              <button onClick={() => remove(config.id)} className="snap-button-secondary py-1.5 text-sm">Supprimer</button>
            </div>
          </article>
        ))}
      </section>

      <section className="snap-panel p-4">
        <h2 className="mb-3 font-semibold">Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted"><tr><th>Date</th><th>Status</th><th>Succès</th><th>Réponse</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-ink/10">
                  <td className="py-2">{new Date(log.created_at).toLocaleString("fr-FR")}</td>
                  <td>{log.response_status || "-"}</td>
                  <td>{log.success ? "oui" : "non"}</td>
                  <td className="max-w-md truncate">{log.response_body || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
