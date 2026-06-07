import type { Lead, LeadWithCapture } from "../../domain/shared/types";
import type { DataGateway } from "../ports/dataGateway";

export const createLeadActions = (gateway: Pick<DataGateway, "updateLead" | "markLeadPushed" | "invokeWebhookPush" | "invokeSearchConfreres" | "invokeQualifyLeads">) => ({
  updateLead: (leadId: string, payload: Partial<Lead>) => gateway.updateLead(leadId, payload),

  pushLead: async (leadId: string) => {
    await gateway.invokeWebhookPush({ lead_id: leadId, trigger: "manual" });
    await gateway.markLeadPushed(leadId);
  },

  searchConfreres: (leadId: string) => gateway.invokeSearchConfreres(leadId),
  qualifyLeads: (leadIds: string[], scope: "lead" | "contacts" | "both") => gateway.invokeQualifyLeads(leadIds, scope),

  launchCampaign: async (leadId: string) => {
    const data = await gateway.invokeWebhookPush({ lead_id: leadId, trigger: "manual", campaign: true }) as {
      results?: Array<{ success: boolean; status: number }>;
      error?: string;
    };
    if (data.error) throw new Error(data.error);
    if (!data.results?.some((result) => result.success)) {
      throw new Error(data.results?.length ? "Le webhook n8n a répondu en erreur." : "Aucun webhook manuel actif n'est configuré.");
    }
  },

  launchCampaigns: async (leads: LeadWithCapture[]) => {
    let ok = 0;
    let ko = 0;
    for (const lead of leads) {
      try {
        await gateway.invokeWebhookPush({ lead_id: lead.id, trigger: "manual", campaign: true });
        ok += 1;
      } catch {
        ko += 1;
      }
    }
    return { ok, ko };
  },

  pushActionableLeads: async (leads: LeadWithCapture[]) => {
    let ok = 0;
    let ko = 0;

    for (const lead of leads.filter((item) => item.status === "actionable")) {
      try {
        await gateway.invokeWebhookPush({ lead_id: lead.id, trigger: "manual" });
        await gateway.markLeadPushed(lead.id);
        ok += 1;
      } catch {
        ko += 1;
      }
    }

    return { ok, ko };
  },
});
