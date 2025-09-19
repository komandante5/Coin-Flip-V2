import { ReactNode, memo } from "react";

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

function SectionTitleComponent({ children, className = "" }: SectionTitleProps) {
  return (
    <div className={`text-fluid-lg lg:text-fluid-xl font-semibold tracking-wide uppercase text-neutral-200 text-center ${className}`}>
      {children}
    </div>
  );
}

// Memoize SectionTitle since text content rarely changes
export const SectionTitle = memo(SectionTitleComponent);
