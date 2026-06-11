export type TemplateVariables = Record<string, string | number | null | undefined>;

export const renderTemplate = (template: string, variables: TemplateVariables) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => String(variables[key] ?? ""));
