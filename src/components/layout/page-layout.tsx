import { ReactNode } from 'react';
import { AmbientBackground } from './ambient-background';
import { Navigation } from './navigation';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen w-full bg-[#0c0f10] text-white flex flex-col ${className}`}>
      <AmbientBackground />
      <Navigation />
      
      {/* Content wrapper - responsive container */}
      <div className="flex flex-col flex-1 pt-[var(--nav-height)]">
        {children}
        
        <footer className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-4 text-fluid-xs text-neutral-500 mt-auto" style={{ maxWidth: 'min(95vw, var(--container-3xl))' }}>
          <div className="text-center">
            <span className="opacity-70">Coin Flip V2 • Powered by Abstract Network & VRF • On-chain Gambling</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
