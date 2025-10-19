'use client';

import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBalanceProps {
  value: string;
  symbol?: string;
  className?: string;
}

/**
 * Slot Machine Style Balance Counter
 * 
 * Creates a fast-flipping animation where each digit animates independently
 * like a slot machine or odometer. Perfect for crypto/web3 balance displays.
 */
function AnimatedBalanceComponent({ value, symbol = 'ETH', className }: AnimatedBalanceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (value === displayValue) return;

    // Find which digits changed
    const oldChars = displayValue.split('');
    const newChars = value.split('');
    const maxLength = Math.max(oldChars.length, newChars.length);
    
    // Pad with spaces for comparison
    while (oldChars.length < maxLength) oldChars.unshift(' ');
    while (newChars.length < maxLength) newChars.unshift(' ');
    
    const changedIndices = new Set<number>();
    oldChars.forEach((char, i) => {
      if (char !== newChars[i]) {
        changedIndices.add(i);
      }
    });

    if (changedIndices.size === 0) {
      setDisplayValue(value);
      return;
    }

    // Trigger animation on changed digits
    setAnimatingIndices(changedIndices);

    // Update the value after a short delay (fast animation)
    const timeout = setTimeout(() => {
      setDisplayValue(value);
      setAnimatingIndices(new Set());
    }, 400); // Fast 400ms animation

    return () => clearTimeout(timeout);
  }, [value, displayValue]);

  // Split into individual characters for animation
  const chars = displayValue.split('');

  return (
    <div className={cn("inline-flex items-center gap-0.5 font-mono", className)}>
      <div className="flex text-emerald-300 text-[11px] md:text-xs font-medium">
        {chars.map((char, index) => (
          <div
            key={`${index}-${char}`}
            className={cn(
              "inline-block relative transition-all duration-100",
              animatingIndices.has(index) && "animate-digit-flip"
            )}
            style={{
              minWidth: char === '.' ? '0.3em' : '0.6em',
              textAlign: 'center',
            }}
          >
            {char}
          </div>
        ))}
      </div>
      {symbol && (
        <span className="ml-0.5 text-[10px] md:text-[11px] font-medium text-emerald-400/70">
          {symbol}
        </span>
      )}
      
      <style jsx>{`
        @keyframes digit-flip {
          0% {
            transform: rotateX(0deg) scale(1);
            opacity: 1;
          }
          25% {
            transform: rotateX(90deg) scale(0.8);
            opacity: 0.3;
          }
          50% {
            transform: rotateX(90deg) scale(0.8);
            opacity: 0.3;
          }
          75% {
            transform: rotateX(0deg) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: rotateX(0deg) scale(1);
            opacity: 1;
          }
        }
        
        .animate-digit-flip {
          animation: digit-flip 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}

export const AnimatedBalance = memo(AnimatedBalanceComponent);
