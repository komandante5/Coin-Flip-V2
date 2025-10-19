import { ReactNode, memo } from 'react';
import { AmbientBackground } from './ambient-background';
import { Navigation } from './navigation';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

function PageLayoutComponent({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen w-full bg-[#0c0f10] text-white flex flex-col ${className}`}>
      <AmbientBackground />
      <Navigation />
      
      {/* Content wrapper - responsive container */}
      <div className="flex flex-col flex-1 pt-[var(--nav-height)]">
        {children}
        
        <footer className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-4 text-fluid-xs text-neutral-500 mt-auto" style={{ maxWidth: 'min(95vw, var(--container-3xl))' }}>
          <div className="text-center">
            <span className="opacity-70">
              Fully On-chain Gaming • Powered by{' '}
              <a 
                href="https://proofofplay.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 transition-colors duration-200 underline decoration-emerald-400/30 hover:decoration-emerald-300/50"
              >
                Proof of Play
              </a>
              {' '}& Abstract Network
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Memoize PageLayout to prevent unnecessary re-renders
export const PageLayout = memo(PageLayoutComponent);
