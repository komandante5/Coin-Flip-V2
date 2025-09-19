import { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

export function SectionTitle({ children, className = "" }: SectionTitleProps) {
  return (
    <div className={`text-fluid-lg lg:text-fluid-xl font-semibold tracking-wide uppercase text-neutral-200 text-center ${className}`}>
      {children}
    </div>
  );
}
