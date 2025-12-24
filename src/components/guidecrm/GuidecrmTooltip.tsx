/**
 * GUIDECRM - Tooltip Component
 *
 * Displays tooltips with arrows pointing to specific UI elements
 * during the onboarding process.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useGuidecrm } from './GuidecrmContext';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function GuidecrmTooltip() {
  const {
    loading,
    isOnboardingComplete,
    currentStep,
    showGuide,
    highlightedTarget,
    setHighlightedTarget,
  } = useGuidecrm();

  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetDescription, setTargetDescription] = useState<string>('');
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find and position tooltip relative to target
  useEffect(() => {
    if (!highlightedTarget || !showGuide || loading || isOnboardingComplete) {
      setPosition(null);
      setTargetElement(null);
      return;
    }

    // Find element with data-onboarding attribute
    const element = document.querySelector(`[data-onboarding="${highlightedTarget}"]`) as HTMLElement;

    if (!element) {
      setPosition(null);
      setTargetElement(null);
      return;
    }

    setTargetElement(element);

    // Find the target configuration
    const target = currentStep?.targets.find(t => t.selector === highlightedTarget);
    if (target) {
      setTargetDescription(target.description);
    }

    // Calculate position
    const calculatePosition = () => {
      const rect = element.getBoundingClientRect();
      const tooltipWidth = 280;
      const tooltipHeight = 80;
      const offset = 12;
      const arrowSize = 8;

      let top = 0;
      let left = 0;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'left';

      const preferredPosition = target?.position || 'right';

      switch (preferredPosition) {
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + offset;
          arrowPosition = 'left';
          // Check if fits on screen
          if (left + tooltipWidth > window.innerWidth - 20) {
            left = rect.left - tooltipWidth - offset;
            arrowPosition = 'right';
          }
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - offset;
          arrowPosition = 'right';
          if (left < 20) {
            left = rect.right + offset;
            arrowPosition = 'left';
          }
          break;
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'top';
          if (top + tooltipHeight > window.innerHeight - 20) {
            top = rect.top - tooltipHeight - offset;
            arrowPosition = 'bottom';
          }
          break;
        case 'top':
          top = rect.top - tooltipHeight - offset;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'bottom';
          if (top < 20) {
            top = rect.bottom + offset;
            arrowPosition = 'top';
          }
          break;
      }

      // Ensure tooltip stays on screen
      left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));
      top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));

      setPosition({ top, left, arrowPosition });
    };

    calculatePosition();

    // Recalculate on scroll/resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [highlightedTarget, showGuide, loading, isOnboardingComplete, currentStep]);

  // Add highlight ring to target element
  useEffect(() => {
    if (!targetElement) return;

    // Add highlight classes
    targetElement.classList.add('guidecrm-highlight');

    return () => {
      targetElement.classList.remove('guidecrm-highlight');
    };
  }, [targetElement]);

  if (!position || !targetDescription) {
    return null;
  }

  const ArrowIcon = {
    top: ArrowUp,
    bottom: ArrowDown,
    left: ArrowLeft,
    right: ArrowRight,
  }[position.arrowPosition];

  return (
    <>
      {/* Backdrop with hole for highlighted element */}
      <div
        className="fixed inset-0 z-[100] pointer-events-none"
        style={{
          background: 'transparent',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-[101] w-[280px] p-4 rounded-xl shadow-2xl',
          'bg-primary text-primary-foreground',
          'animate-in fade-in zoom-in-95 duration-300',
          'pointer-events-auto'
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Arrow */}
        <div
          className={cn(
            'absolute w-3 h-3 bg-primary rotate-45',
            position.arrowPosition === 'left' && '-left-1.5 top-1/2 -translate-y-1/2',
            position.arrowPosition === 'right' && '-right-1.5 top-1/2 -translate-y-1/2',
            position.arrowPosition === 'top' && '-top-1.5 left-1/2 -translate-x-1/2',
            position.arrowPosition === 'bottom' && '-bottom-1.5 left-1/2 -translate-x-1/2'
          )}
        />

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <ArrowIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{targetDescription}</p>
            <button
              onClick={() => setHighlightedTarget(null)}
              className="text-xs opacity-80 hover:opacity-100 mt-2 underline"
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// =========================================
// GLOBAL STYLES (add to your CSS)
// =========================================

// CSS to add in index.css or global styles:
/*
.guidecrm-highlight {
  position: relative;
  z-index: 50;
  outline: 3px solid hsl(var(--primary));
  outline-offset: 4px;
  border-radius: 8px;
  animation: guidecrm-pulse 2s ease-in-out infinite;
}

@keyframes guidecrm-pulse {
  0%, 100% {
    outline-offset: 4px;
    outline-color: hsl(var(--primary));
  }
  50% {
    outline-offset: 8px;
    outline-color: hsl(var(--primary) / 0.5);
  }
}
*/
