import { useEffect, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { useToast } from "../components/StatusToast";
import { createWebhookSettingsActions, type WebhookForm } from "../application/services/webhookSettings";
import type { AccountAccess, WebhookConfig, WebhookLog, WebhookTrigger } from "../domain/shared/types";
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
  const [accountAccess, setAccountAccess] = useState<AccountAccess | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
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
    void supabaseDataGateway.fetchAccountAccess()
      .then(setAccountAccess)
      .catch((error) => toast.error("Chargement des accès échoué", error instanceof Error ? error.message : String(error)));
  }, []);

  const reloadAccountAccess = async () => {
    setAccountAccess(await supabaseDataGateway.fetchAccountAccess());
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteLoading(true);
    try {
      const result = await supabaseDataGateway.inviteAccountMember(inviteEmail);
      setInviteEmail("");
      toast.success(
        result.status === "pending"
          ? "Invitation enregistrée. La personne doit créer son compte avec cette adresse email."
          : "Accès partagé. Ce compte a maintenant accès à toutes les données.",
      );
      await reloadAccountAccess();
    } catch (error) {
      toast.error("Invitation impossible", error instanceof Error ? error.message : String(error));
    } finally {
      setInviteLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      await supabaseDataGateway.removeAccountMember(userId);
      toast.success("Accès révoqué");
      await reloadAccountAccess();
    } catch (error) {
      toast.error("Révocation impossible", error instanceof Error ? error.message : String(error));
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      await supabaseDataGateway.revokeAccountInvite(inviteId);
      toast.success("Invitation annulée");
      await reloadAccountAccess();
    } catch (error) {
      toast.error("Annulation impossible", error instanceof Error ? error.message : String(error));
    }
  };

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
        <div className="snap-label text-ember">Réglages</div>
        <h1 className="mt-2 text-xl md:text-[30px]">Compte partagé et intégrations</h1>
        <p className="snap-copy mt-2 text-sm md:text-base">Gérez les personnes qui accèdent à Scovi et les connexions avec vos outils commerciaux.</p>
      </header>

      <section className="snap-panel mb-6 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-ember">
            <Users size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Accès au compte</h2>
            <p className="mt-1 text-sm text-muted">Tous les membres voient et modifient les mêmes captures, leads, plans et webhooks.</p>
          </div>
        </div>

        {accountAccess?.current_user_role === "owner" && (
          <form onSubmit={invite} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Email de la personne à inviter"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              type="email"
              required
              className="snap-input min-w-0 flex-1 px-3 py-2"
              placeholder="proche@exemple.fr"
            />
            <button disabled={inviteLoading} className="snap-button inline-flex items-center justify-center gap-2 disabled:opacity-60">
              <UserPlus size={17} aria-hidden="true" />
              {inviteLoading ? "Invitation…" : "Donner l'accès"}
            </button>
          </form>
        )}

        <div className="mt-5 space-y-2">
          {accountAccess?.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{member.email}</div>
                <div className="text-xs text-muted">{member.role === "owner" ? "Propriétaire" : "Accès complet"}</div>
              </div>
              {accountAccess.current_user_role === "owner" && member.role !== "owner" && (
                <button onClick={() => removeMember(member.user_id)} className="snap-button-secondary shrink-0 py-1.5 text-xs">
                  Révoquer
                </button>
              )}
            </div>
          ))}
          {accountAccess?.invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{invite.email}</div>
                <div className="text-xs text-muted">En attente de création du compte</div>
              </div>
              {accountAccess.current_user_role === "owner" && (
                <button onClick={() => revokeInvite(invite.id)} className="snap-button-secondary shrink-0 py-1.5 text-xs">
                  Annuler
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <h2 className="mb-3 text-lg font-semibold">Intégrations et webhooks</h2>
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
