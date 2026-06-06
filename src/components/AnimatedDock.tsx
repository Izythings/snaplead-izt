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
      className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-sidebar-border bg-sidebar/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
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
              : `relative flex min-h-11 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-foreground before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:bg-ember" : "text-muted hover:text-foreground"
                }`
          }
        >
          {item.featured ? (
            <span className="absolute -top-4 grid h-14 w-14 place-items-center rounded-full bg-ember text-[oklch(var(--ember-foreground))] shadow-[var(--shadow-ember)]">
              <Plus size={24} aria-hidden="true" />
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
