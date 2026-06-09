import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";

export type DockItemData = {
  to: string;
  label: string;
  icon: ReactNode;
  featured?: boolean;
};

export function AnimatedDock({ items }: { className?: string; items: DockItemData[] }) {
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 grid h-14 grid-cols-5 rounded-xl border border-sidebar-border bg-sidebar/95 px-1 shadow-[var(--shadow-elegant)] backdrop-blur-xl [transform:translateZ(0)] md:hidden"
      aria-label="Navigation principale"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.label}
          className={({ isActive }) =>
            item.featured
              ? "relative flex min-h-11 items-center justify-center"
              : `relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors ${
                  isActive ? "text-foreground before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:bg-ember" : "text-muted hover:text-foreground"
                }`
          }
        >
          {item.featured ? (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ember text-[oklch(var(--ember-foreground))] shadow-[var(--shadow-ember)]">
              <Plus size={22} aria-hidden="true" />
            </span>
          ) : (
            <>
              {item.icon}
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
