import {
  COLD_EMAIL_J0_CSV_KEY,
  DEFAULT_J0_CSV_TEMPLATE,
  EMPTY_SALES_IDENTITY,
  type EmailTemplateInput,
  type SalesIdentityInput,
} from "../../domain/email/settings";
import type { DataGateway } from "../ports/dataGateway";

type ColdEmailSettingsGateway = Pick<
  DataGateway,
  "getSalesIdentity" | "saveSalesIdentity" | "getEmailTemplate" | "saveEmailTemplate"
>;

export const createColdEmailSettingsActions = (gateway: ColdEmailSettingsGateway) => ({
  load: async () => {
    const [identity, template] = await Promise.all([
      gateway.getSalesIdentity(),
      gateway.getEmailTemplate(COLD_EMAIL_J0_CSV_KEY),
    ]);
    return {
      identity: identity ?? EMPTY_SALES_IDENTITY,
      template: template ?? DEFAULT_J0_CSV_TEMPLATE,
    };
  },
  saveIdentity: (identity: SalesIdentityInput) => gateway.saveSalesIdentity(identity),
  saveTemplate: (template: Pick<EmailTemplateInput, "subject" | "body">) =>
    gateway.saveEmailTemplate({
      key: COLD_EMAIL_J0_CSV_KEY,
      subject: template.subject,
      body: template.body,
      is_active: true,
    }),
});
