import { ReactNode } from "react";

interface PillProps {
  active?: boolean;
  children: ReactNode;
  className?: string;
}

export function Pill({ active, children, className = "" }: PillProps) {
  return (
    <div
      className={`px-fluid-3 py-fluid-2 rounded-full text-fluid-sm transition-all duration-200 border items-center inline-flex gap-fluid-2 select-none ${
        active
          ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-300"
          : "bg-white/[0.02] border-white/10 text-neutral-300 hover:bg-white/[0.04]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
