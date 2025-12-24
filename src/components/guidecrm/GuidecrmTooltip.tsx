/**
 * GUIDECRM - Tooltip Component
 *
 * Displays tooltips with arrows pointing to specific UI elements
 * during the onboarding process.
 */

import React, { useEffect, useState } from 'react';
import { useGuidecrm } from './GuidecrmContext';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, MousePointer2 } from 'lucide-react';

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

  // Find target and scroll to it
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

    // Find the target configuration
    const target = currentStep?.targets.find(t => t.selector === highlightedTarget);
    if (target) {
      setTargetDescription(target.description);
    }

    // Scroll element into view if not visible
    const rect = element.getBoundingClientRect();
    const isInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );

    if (!isInViewport) {
      // Find the scrollable parent (sidebar)
      const scrollableParent = element.closest('.overflow-y-auto') || element.closest('[style*="overflow"]');
      if (scrollableParent) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Small delay to let scroll complete
    const scrollDelay = isInViewport ? 0 : 400;

    const timer = setTimeout(() => {
      setTargetElement(element);
    }, scrollDelay);

    return () => clearTimeout(timer);
  }, [highlightedTarget, showGuide, loading, isOnboardingComplete, currentStep]);

  // Calculate position after target is set
  useEffect(() => {
    if (!targetElement) {
      setPosition(null);
      return;
    }

    const target = currentStep?.targets.find(t => t.selector === highlightedTarget);
    const preferredPosition = target?.position || 'right';

    const calculatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 260;
      const tooltipHeight = 90;
      const offset = 16;

      // Progress bar is at bottom, keep tooltip above it (at least 180px from bottom)
      const minDistanceFromBottom = 180;
      const maxTop = window.innerHeight - minDistanceFromBottom;

      let top = 0;
      let left = 0;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'left';

      switch (preferredPosition) {
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + offset;
          arrowPosition = 'left';
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
          break;
        case 'top':
          top = rect.top - tooltipHeight - offset;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'bottom';
          break;
      }

      // Ensure tooltip stays on screen horizontally
      left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));

      // Ensure tooltip doesn't overlap with progress bar (keep above it)
      top = Math.max(20, Math.min(top, maxTop));

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
  }, [targetElement, currentStep, highlightedTarget]);

  // Add highlight ring to target element
  useEffect(() => {
    if (!targetElement) return;

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
      {/* Tooltip */}
      <div
        className={cn(
          'fixed z-[60] w-[260px] p-3 rounded-xl shadow-2xl',
          'bg-primary text-primary-foreground',
          'animate-in fade-in zoom-in-95 duration-300',
          'pointer-events-auto border-2 border-primary-foreground/20'
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Arrow pointing to element */}
        <div
          className={cn(
            'absolute w-3 h-3 bg-primary rotate-45 border-primary-foreground/20',
            position.arrowPosition === 'left' && '-left-1.5 top-1/2 -translate-y-1/2 border-l-2 border-b-2',
            position.arrowPosition === 'right' && '-right-1.5 top-1/2 -translate-y-1/2 border-r-2 border-t-2',
            position.arrowPosition === 'top' && '-top-1.5 left-1/2 -translate-x-1/2 border-l-2 border-t-2',
            position.arrowPosition === 'bottom' && '-bottom-1.5 left-1/2 -translate-x-1/2 border-r-2 border-b-2'
          )}
        />

        {/* Content */}
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5 p-1.5 bg-primary-foreground/20 rounded-lg">
            <MousePointer2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{targetDescription}</p>
            <button
              onClick={() => setHighlightedTarget(null)}
              className="text-xs opacity-70 hover:opacity-100 mt-1.5 underline"
            >
              OK, compris
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
