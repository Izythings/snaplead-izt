import { Copy } from "lucide-react";

export default function ScriptDisplay({ title, content }: { title: string; content?: string | null }) {
  const text = content || "Aucun contenu généré.";
  return (
    <section className="snap-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ background: "var(--c-panelAlt)", borderColor: "var(--c-line)" }}>
        <h3 className="font-semibold">{title}</h3>
        <button
          onClick={() => navigator.clipboard.writeText(text)}
          className="snap-button-secondary bg-white px-2.5 py-1.5 text-xs"
        >
          <Copy size={15} />
          Copier
        </button>
      </div>
      <pre className="mono whitespace-pre-wrap p-4 text-sm leading-6 text-ink">{text}</pre>
    </section>
  );
}
