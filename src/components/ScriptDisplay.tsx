import { Copy, Send } from "lucide-react";

const buildMailto = (content: string, to?: string | null) => {
  const lines = content.split("\n");
  const subjectLineIndex = lines.findIndex((line) => /^objet\s*[:—-]/i.test(line.trim()));
  const rawSubject = subjectLineIndex >= 0 ? lines[subjectLineIndex].replace(/^objet\s*[:—-]\s*/i, "").trim() : "";
  const body = subjectLineIndex >= 0
    ? lines.filter((_, index) => index !== subjectLineIndex).join("\n").trim()
    : content;
  const params = new URLSearchParams();
  if (rawSubject) params.set("subject", rawSubject);
  params.set("body", body);
  return `mailto:${to ?? ""}?${params.toString()}`;
};

export default function ScriptDisplay({
  title,
  content,
  emailTo,
  enableEmail = false,
}: {
  title: string;
  content?: string | null;
  emailTo?: string | null;
  enableEmail?: boolean;
}) {
  const text = content || "Aucun contenu généré.";
  return (
    <section className="snap-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted-surface px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex flex-wrap justify-end gap-2">
          {enableEmail && (
            <a href={buildMailto(text, emailTo)} className="snap-button bg-brick border-brick px-2.5 py-1.5 text-xs">
              <Send size={15} />
              Envoyer email
            </a>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(text)}
            className="snap-button-secondary px-2.5 py-1.5 text-xs"
          >
            <Copy size={15} />
            Copier
          </button>
        </div>
      </div>
      <pre className="mono whitespace-pre-wrap p-4 text-sm leading-6 text-ink">{text}</pre>
    </section>
  );
}
