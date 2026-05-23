import { useEffect, useState } from "react";
import { useToast } from "../components/StatusToast";
import { supabase } from "../lib/supabase";
import type { WebhookConfig, WebhookLog, WebhookTrigger } from "../lib/types";

const emptyConfig = {
  name: "Make",
  url: "",
  headers: "{}",
  trigger_on: "manual" as WebhookTrigger,
  field_mapping: "{}",
};

export default function SettingsPage() {
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [form, setForm] = useState(emptyConfig);
  const [error, setError] = useState("");
  const toast = useToast();

  const load = async () => {
    const [{ data: configData }, { data: logData }] = await Promise.all([
      supabase.from("webhook_configs").select("*").order("created_at", { ascending: false }),
      supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setConfigs((configData ?? []) as WebhookConfig[]);
    setLogs((logData ?? []) as WebhookLog[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    try {
      const payload = {
        name: form.name,
        url: form.url,
        headers: JSON.parse(form.headers || "{}"),
        trigger_on: form.trigger_on,
        field_mapping: JSON.parse(form.field_mapping || "{}"),
        user_id: userData.user?.id,
      };
      const { error: insertError } = await supabase.from("webhook_configs").insert(payload);
      if (insertError) {
        setError(insertError.message);
        toast.error("Ajout webhook échoué", insertError.message);
      }
      else {
        setForm(emptyConfig);
        toast.success("Webhook ajouté");
        await load();
      }
    } catch {
      setError("JSON invalide dans headers ou field mapping.");
      toast.error("Webhook invalide", "JSON invalide dans headers ou field mapping");
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("webhook_configs").delete().eq("id", id);
    if (error) toast.error("Suppression webhook échouée", error.message);
    else toast.success("Webhook supprimé");
    await load();
  };

  const test = async (configId: string) => {
    const { data, error } = await supabase.functions.invoke("webhook-push", { body: { config_id: configId, test: true, trigger: "manual" } });
    if (error) toast.error("Test webhook échoué", error.message);
    else if (data?.results?.some((result: { success: boolean }) => !result.success)) toast.error("Test webhook KO", "Le webhook a répondu en erreur");
    else toast.success("Test webhook OK");
    await load();
  };

  return (
    <div className="pb-20">
      <header className="mb-6">
        <div className="text-sm font-medium text-brick">CRM</div>
        <h1 className="text-3xl font-semibold">Webhooks</h1>
      </header>
      <form onSubmit={save} className="surface mb-6 grid gap-3 rounded p-4 lg:grid-cols-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border border-ink/15 px-3 py-2" placeholder="Nom" />
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required className="rounded border border-ink/15 px-3 py-2" placeholder="URL webhook" />
        <select value={form.trigger_on} onChange={(e) => setForm({ ...form, trigger_on: e.target.value as WebhookTrigger })} className="rounded border border-ink/15 px-3 py-2">
          <option value="manual">manual</option>
          <option value="on_enriched">on_enriched</option>
          <option value="on_actionable">on_actionable</option>
          <option value="on_contacted">on_contacted</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm({ ...form, url: "https://hooks.zapier.com/hooks/catch/..." })} className="rounded border border-ink/15 px-3 py-2 text-sm">Zapier</button>
          <button type="button" onClick={() => setForm({ ...form, url: "https://hook.eu1.make.com/..." })} className="rounded border border-ink/15 px-3 py-2 text-sm">Make</button>
          <button type="button" onClick={() => setForm({ ...form, url: "https://n8n.example.com/webhook/..." })} className="rounded border border-ink/15 px-3 py-2 text-sm">n8n</button>
        </div>
        <textarea value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} className="mono min-h-24 rounded border border-ink/15 p-3 text-sm" />
        <textarea value={form.field_mapping} onChange={(e) => setForm({ ...form, field_mapping: e.target.value })} className="mono min-h-24 rounded border border-ink/15 p-3 text-sm" />
        <button className="rounded bg-brick px-4 py-2 font-medium text-white lg:col-span-2">Ajouter</button>
        {error && <p className="text-sm text-red-700 lg:col-span-2">{error}</p>}
      </form>

      <section className="mb-6 grid gap-3 lg:grid-cols-2">
        {configs.map((config) => (
          <article key={config.id} className="surface rounded p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{config.name}</h3>
                <p className="mt-1 break-all text-sm text-muted">{config.url}</p>
              </div>
              <span className="rounded bg-paper px-2 py-1 text-xs">{config.trigger_on}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => test(config.id)} className="rounded bg-ink px-3 py-1.5 text-sm text-paper">Test</button>
              <button onClick={() => remove(config.id)} className="rounded border border-ink/15 px-3 py-1.5 text-sm">Supprimer</button>
            </div>
          </article>
        ))}
      </section>

      <section className="surface rounded p-4">
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
