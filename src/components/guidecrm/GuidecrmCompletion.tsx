/**
 * GUIDECRM - Completion Animation Component
 *
 * Displays a celebratory animation when the user completes
 * all onboarding steps. Shows "Bienvenue sur Provia BASE" message.
 */

import React, { useEffect, useState } from 'react';
import { useGuidecrm } from './GuidecrmContext';
import { cn } from '@/lib/utils';
import { Sparkles, CheckCircle2, PartyPopper, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export function GuidecrmCompletion() {
  const { isOnboardingComplete, progress, progressPercentage } = useGuidecrm();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownBefore, setHasShownBefore] = useState(false);

  // Get userId from progress
  const userId = progress?.user_id;

  // Check if we should show the celebration (per user)
  useEffect(() => {
    if (!userId) return;

    const celebrationKey = `guidecrm_celebration_${userId}`;
    const alreadyShown = localStorage.getItem(celebrationKey);

    if (isOnboardingComplete && !alreadyShown && !hasShownBefore) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowCelebration(true);
        setHasShownBefore(true);
        localStorage.setItem(celebrationKey, 'true');

        // Trigger confetti
        triggerConfetti();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOnboardingComplete, hasShownBefore, userId]);

  const triggerConfetti = () => {
    // Multiple bursts of confetti
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleClose = () => {
    setShowCelebration(false);
  };

  if (!showCelebration) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500"
        onClick={handleClose}
      />

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg mx-4 p-8 rounded-3xl',
          'bg-gradient-to-br from-primary/20 via-background to-secondary/20',
          'border border-primary/30 shadow-2xl',
          'animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-500'
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={cn(
              'relative h-24 w-24 rounded-full',
              'bg-gradient-to-br from-primary to-primary/60',
              'flex items-center justify-center',
              'animate-bounce'
            )}
          >
            <PartyPopper className="h-12 w-12 text-primary-foreground" />
            {/* Sparkles around */}
            <Sparkles
              className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse"
            />
            <Sparkles
              className="absolute -bottom-2 -left-2 h-5 w-5 text-yellow-400 animate-pulse delay-100"
            />
            <Sparkles
              className="absolute top-1/2 -left-4 h-4 w-4 text-yellow-400 animate-pulse delay-200"
            />
          </div>
        </div>

        {/* Title */}
        <h2
          className={cn(
            'text-3xl font-bold text-center mb-2',
            'bg-gradient-to-r from-primary via-foreground to-primary',
            'bg-clip-text text-transparent'
          )}
        >
          Bienvenue sur Provia BASE !
        </h2>

        {/* Subtitle */}
        <p className="text-center text-muted-foreground mb-6">
          Félicitations ! Vous avez terminé la configuration de votre CRM.
          Vous êtes maintenant prêt à gérer votre activité efficacement.
        </p>

        {/* Completion badge */}
        <div
          className={cn(
            'flex items-center justify-center gap-3 p-4 rounded-xl',
            'bg-primary/10 border border-primary/20 mb-6'
          )}
        >
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold">Configuration complète</p>
            <p className="text-sm text-muted-foreground">
              7/7 étapes terminées • 100%
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button onClick={handleClose} className="w-full" size="lg">
          Commencer à utiliser Provia BASE
        </Button>
      </div>
    </div>
  );
}

// =========================================
// Simple fallback if confetti package not available
// =========================================

// Add this to package.json dependencies if not present:
// "canvas-confetti": "^1.9.2"

// Or use this inline CSS confetti effect as fallback
export function GuidecrmCompletionFallback() {
  const { isOnboardingComplete } = useGuidecrm();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const alreadyShown = localStorage.getItem('guidecrm_celebration_shown');

    if (isOnboardingComplete && !alreadyShown) {
      setShowCelebration(true);
      localStorage.setItem('guidecrm_celebration_shown', 'true');
    }
  }, [isOnboardingComplete]);

  if (!showCelebration) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowCelebration(false)}
      />

      <div className="relative z-10 w-full max-w-lg mx-4 p-8 rounded-3xl bg-background border shadow-2xl text-center">
        <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Bienvenue sur Provia BASE !</h2>
        <p className="text-muted-foreground mb-6">
          Vous avez terminé la configuration. Bon travail !
        </p>
        <Button onClick={() => setShowCelebration(false)}>
          Commencer
        </Button>
      </div>
    </div>
  );
}
