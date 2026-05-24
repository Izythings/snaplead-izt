import * as React from "react";
import { NavLink } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...args: Array<string | false | null | undefined>) => twMerge(clsx(args));

export type DockItemData = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

export function AnimatedDock({ className, items }: { className?: string; items: DockItemData[] }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      onMouseMove={(event) => mouseX.set(event.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 items-end gap-2 rounded-2xl border bg-white/90 px-3 pb-3 shadow-lg backdrop-blur",
        className,
      )}
      style={{ borderColor: "var(--c-line)" }}
      aria-label="Navigation mobile"
    >
      {items.map((item) => (
        <DockItem key={item.to} mouseX={mouseX}>
          <NavLink
            to={item.to}
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                "flex h-full w-full grow items-center justify-center rounded-full text-paper transition",
                isActive ? "bg-brick text-white" : "bg-ink text-paper",
              )
            }
          >
            {item.icon}
          </NavLink>
        </DockItem>
      ))}
    </motion.nav>
  );
}

function DockItem({ mouseX, children }: { mouseX: MotionValue<number>; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (value) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-120, 0, 120], [40, 64, 40]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 14,
  });

  const iconScale = useTransform(width, [40, 64], [1, 1.25]);
  const iconSpring = useSpring(iconScale, {
    mass: 0.1,
    stiffness: 150,
    damping: 14,
  });

  return (
    <motion.div ref={ref} style={{ width }} className="aspect-square w-10 shrink-0 rounded-full">
      <motion.div style={{ scale: iconSpring }} className="flex h-full w-full items-center justify-center">
        {children}
      </motion.div>
    </motion.div>
  );
}
