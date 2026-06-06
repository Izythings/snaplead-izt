import type { Lead, LeadWithCapture } from "../../domain/shared/types";
import type { DataGateway } from "../ports/dataGateway";

export const createLeadActions = (gateway: Pick<DataGateway, "updateLead" | "markLeadPushed" | "invokeWebhookPush" | "invokeSearchConfreres">) => ({
  updateLead: (leadId: string, payload: Partial<Lead>) => gateway.updateLead(leadId, payload),

  pushLead: async (leadId: string) => {
    await gateway.invokeWebhookPush({ lead_id: leadId, trigger: "manual" });
    await gateway.markLeadPushed(leadId);
  },

  searchConfreres: (leadId: string) => gateway.invokeSearchConfreres(leadId),

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
