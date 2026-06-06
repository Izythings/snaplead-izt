import type { WebhookTrigger } from "../../domain/shared/types";
import type { DataGateway } from "../ports/dataGateway";

export type WebhookForm = {
  name: string;
  url: string;
  headers: string;
  trigger_on: WebhookTrigger;
  field_mapping: string;
};

export const parseWebhookForm = (form: WebhookForm) => ({
  name: form.name,
  url: form.url,
  headers: JSON.parse(form.headers || "{}") as Record<string, string>,
  trigger_on: form.trigger_on,
  field_mapping: JSON.parse(form.field_mapping || "{}") as Record<string, string>,
});

export const createWebhookSettingsActions = (gateway: Pick<DataGateway, "createWebhookConfig" | "deleteWebhookConfig" | "testWebhookConfig">) => ({
  create: (form: WebhookForm) => gateway.createWebhookConfig(parseWebhookForm(form)),
  remove: (id: string) => gateway.deleteWebhookConfig(id),
  test: (id: string) => gateway.testWebhookConfig(id),
});
