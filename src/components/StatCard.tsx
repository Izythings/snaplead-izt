import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  delta?: string;
}) {
  return (
    <article className="snap-panel group p-5 transition-colors hover:border-ember/30 hover:shadow-[var(--shadow-elegant)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="snap-label">{label}</div>
          <div className="mt-3 font-display text-2xl font-semibold tabular-nums md:text-3xl">{value}</div>
          {delta && <div className="mt-2 text-xs font-semibold text-success">{delta}</div>}
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-ember">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
