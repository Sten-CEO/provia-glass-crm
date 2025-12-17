/**
 * GUIDECRM - Main Component
 *
 * This is the main component that renders all onboarding UI elements.
 * Import this component and wrap it with GuidecrmProvider in your app.
 *
 * Usage:
 * ```tsx
 * import { GuidecrmProvider, Guidecrm } from '@/components/guidecrm';
 *
 * function App() {
 *   return (
 *     <GuidecrmProvider>
 *       <YourApp />
 *       <Guidecrm />
 *     </GuidecrmProvider>
 *   );
 * }
 * ```
 */

import React, { useEffect, useState } from 'react';
import { useGuidecrmSafe } from './GuidecrmContext';
import { GuidecrmProgressBar } from './GuidecrmProgressBar';
import { GuidecrmTooltip } from './GuidecrmTooltip';
import { GuidecrmCompletion, GuidecrmCompletionFallback } from './GuidecrmCompletion';

// Check if canvas-confetti is available
let hasConfetti = true;
try {
  require('canvas-confetti');
} catch {
  hasConfetti = false;
}

interface GuidecrmProps {
  /**
   * Whether to show the floating progress bar at the bottom
   * @default true
   */
  showProgressBar?: boolean;

  /**
   * Whether to show tooltip highlights on elements
   * @default true
   */
  showTooltips?: boolean;

  /**
   * Whether to show the completion celebration animation
   * @default true
   */
  showCompletion?: boolean;
}

export function Guidecrm({
  showProgressBar = true,
  showTooltips = true,
  showCompletion = true,
}: GuidecrmProps) {
  const context = useGuidecrmSafe();

  // Don't render if context is not available
  if (!context) {
    return null;
  }

  const { loading, isOnboardingComplete } = context;

  // Don't render while loading
  if (loading) {
    return null;
  }

  return (
    <>
      {/* Progress Bar */}
      {showProgressBar && <GuidecrmProgressBar />}

      {/* Tooltips */}
      {showTooltips && <GuidecrmTooltip />}

      {/* Completion Animation */}
      {showCompletion && (
        hasConfetti ? <GuidecrmCompletion /> : <GuidecrmCompletionFallback />
      )}

      {/* Global styles */}
      <GuidecrmStyles />
    </>
  );
}

// =========================================
// GLOBAL STYLES INJECTION
// =========================================

function GuidecrmStyles() {
  useEffect(() => {
    // Check if styles already exist
    if (document.getElementById('guidecrm-styles')) {
      return;
    }

    // Inject global styles
    const styleSheet = document.createElement('style');
    styleSheet.id = 'guidecrm-styles';
    styleSheet.textContent = `
      /* GUIDECRM - Highlight animation for target elements */
      .guidecrm-highlight {
        position: relative;
        z-index: 50 !important;
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 4px !important;
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

      /* GUIDECRM - Tooltip entrance animation */
      .guidecrm-tooltip-enter {
        animation: guidecrm-tooltip-in 0.3s ease-out forwards;
      }

      @keyframes guidecrm-tooltip-in {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      /* GUIDECRM - Confetti canvas (if using fallback) */
      .guidecrm-confetti {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      const existingStyle = document.getElementById('guidecrm-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
}
