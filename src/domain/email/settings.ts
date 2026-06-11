export const COLD_EMAIL_J0_CSV_KEY = "cold_email_j0_csv" as const;

export type SalesIdentity = {
  user_id: string;
  display_name: string;
  phone: string;
  calendly_url: string;
  signature_html: string;
  updated_at: string;
};

export type SalesIdentityInput = Pick<SalesIdentity, "display_name" | "phone" | "calendly_url" | "signature_html">;

export type EmailTemplateKey = typeof COLD_EMAIL_J0_CSV_KEY;

export type EmailTemplate = {
  user_id: string;
  key: EmailTemplateKey;
  subject: string;
  body: string;
  is_active: boolean;
  updated_at: string;
};

export type EmailTemplateInput = Pick<EmailTemplate, "key" | "subject" | "body" | "is_active">;

export const EMPTY_SALES_IDENTITY: SalesIdentityInput = {
  display_name: "",
  phone: "",
  calendly_url: "",
  signature_html: "",
};

export const DEFAULT_J0_CSV_TEMPLATE: EmailTemplateInput = {
  key: COLD_EMAIL_J0_CSV_KEY,
  subject: "Outil clim/froid — quelques mois gratuits pour le tester",
  body: `Bonjour M. {{ nom }},

J'ai été commercial pendant 2 ans chez le revendeur d'Organilog
aux Antilles. J'ai vu de près ce qui plaît aux artisans clim/froid
dans ce genre d'outil, et ce qui les agace : le prix par utilisateur
qui grimpe et les fluides facturés à part.

J'ai construit un outil similaire, mais bien moins cher, avec la
gestion des fluides incluse. Il est fonctionnel, vous pouvez faire
de vraies interventions, de vrais devis et de vraies factures. Je
cherche encore quelques professionnels pour le tester gratuitement
quelques mois ; ce que je veux c'est savoir ce qui vous plaît et
vous déplaît dedans pour l'améliorer, avec vous et pour vous.

Si ça vous intrigue, répondez-moi simplement "ok" et je vous
appelle dans la semaine. Vous pouvez aussi caler directement un
créneau : {{ calendly_url }}

{{ signature }}`,
  is_active: true,
};
