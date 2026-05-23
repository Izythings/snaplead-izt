import { Copy } from "lucide-react";

export default function ScriptDisplay({ title, content }: { title: string; content?: string | null }) {
  const text = content || "Aucun contenu généré.";
  return (
    <section className="surface rounded p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <button
          onClick={() => navigator.clipboard.writeText(text)}
          className="inline-flex items-center gap-2 rounded bg-ink px-3 py-1.5 text-sm text-paper"
        >
          <Copy size={15} />
          Copier
        </button>
      </div>
      <pre className="mono whitespace-pre-wrap rounded bg-paper p-3 text-sm leading-6 text-ink">{text}</pre>
    </section>
  );
}
