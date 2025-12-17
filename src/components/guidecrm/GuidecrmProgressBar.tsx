/**
 * GUIDECRM - Progress Bar Component
 *
 * Displays a floating progress bar at the bottom of the screen
 * showing onboarding completion percentage and current step.
 */

import React from 'react';
import { useGuidecrm } from './GuidecrmContext';
import { ONBOARDING_STEPS } from './guidecrmTypes';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, X, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GuidecrmProgressBar() {
  const {
    progress,
    loading,
    isOnboardingComplete,
    currentStep,
    currentStepIndex,
    progressPercentage,
    completedSteps,
    totalSteps,
    goToNextStep,
    dismissOnboarding,
    showGuide,
    setShowGuide,
  } = useGuidecrm();

  // Don't show if loading, complete, or hidden
  if (loading || isOnboardingComplete || !showGuide) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'w-full max-w-2xl px-4'
      )}
    >
      <div
        className={cn(
          'glass-card border border-primary/20 rounded-2xl p-4 shadow-2xl',
          'animate-in slide-in-from-bottom-4 duration-500'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Guide de démarrage</h4>
              <p className="text-xs text-muted-foreground">
                {completedSteps}/{totalSteps} étapes complétées
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">{progressPercentage}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={dismissOnboarding}
              title="Masquer le guide"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercentage} className="h-2 mb-3" />

        {/* Steps indicators */}
        <div className="flex gap-1 mb-3">
          {ONBOARDING_STEPS.map((step, index) => {
            const isComplete = progress ? step.checkComplete(progress) : false;
            const isCurrent = currentStep?.key === step.key;

            return (
              <div
                key={step.key}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all duration-300',
                  isComplete
                    ? 'bg-primary'
                    : isCurrent
                    ? 'bg-primary/50 animate-pulse'
                    : 'bg-muted'
                )}
                title={`${step.number}. ${step.title}`}
              />
            );
          })}
        </div>

        {/* Current step info & action */}
        {currentStep && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-primary">
                  Étape {currentStep.number}
                </span>
              </div>
              <p className="text-sm font-medium truncate">{currentStep.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentStep.description}
              </p>
            </div>
            <Button
              onClick={goToNextStep}
              className="shrink-0 gap-2"
              size="sm"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================
// COMPACT VERSION (for sidebar)
// =========================================

export function GuidecrmProgressCompact() {
  const {
    loading,
    isOnboardingComplete,
    progressPercentage,
    completedSteps,
    totalSteps,
    showGuide,
    setShowGuide,
  } = useGuidecrm();

  if (loading || isOnboardingComplete) {
    return null;
  }

  return (
    <button
      onClick={() => setShowGuide(!showGuide)}
      className={cn(
        'w-full p-3 rounded-xl transition-all',
        'bg-primary/10 hover:bg-primary/20',
        'border border-primary/20',
        'text-left'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-primary">Guide</span>
        <span className="text-xs font-bold">{progressPercentage}%</span>
      </div>
      <Progress value={progressPercentage} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground mt-1">
        {completedSteps}/{totalSteps} étapes
      </p>
    </button>
  );
}
