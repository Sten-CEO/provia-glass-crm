/**
 * GUIDECRM - Checklist Panel Component
 *
 * Displays a collapsible panel with all onboarding steps
 * and their completion status.
 */

import React, { useState } from 'react';
import { useGuidecrm } from './GuidecrmContext';
import { ONBOARDING_STEPS, OnboardingStep } from './guidecrmTypes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Check,
  Circle,
  ChevronRight,
  ChevronDown,
  Building2,
  FileText,
  Users,
  FileSpreadsheet,
  Receipt,
  UserPlus,
  Package,
  Sparkles,
} from 'lucide-react';

// Step icons mapping
const STEP_ICONS: Record<string, React.ElementType> = {
  company: Building2,
  templates: FileText,
  client: Users,
  quote: FileSpreadsheet,
  invoice: Receipt,
  member: UserPlus,
  inventory: Package,
};

interface GuidecrmChecklistProps {
  collapsed?: boolean;
}

export function GuidecrmChecklist({ collapsed = false }: GuidecrmChecklistProps) {
  const {
    progress,
    loading,
    isOnboardingComplete,
    currentStep,
    progressPercentage,
    completedSteps,
    totalSteps,
    goToStep,
    showGuide,
  } = useGuidecrm();

  const [isExpanded, setIsExpanded] = useState(true);

  if (loading || isOnboardingComplete || !showGuide) {
    return null;
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full p-2 rounded-lg transition-all',
          'bg-primary/10 hover:bg-primary/20',
          'flex items-center justify-center gap-2'
        )}
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium">{progressPercentage}%</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'glass-card border border-primary/20 rounded-xl overflow-hidden',
        'animate-in slide-in-from-left duration-300'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full p-4 flex items-center justify-between',
          'hover:bg-muted/50 transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-sm">Guide de démarrage</h4>
            <p className="text-xs text-muted-foreground">
              {completedSteps}/{totalSteps} • {progressPercentage}%
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Steps list */}
      {isExpanded && (
        <div className="p-2 border-t border-border/50">
          {ONBOARDING_STEPS.map((step) => (
            <StepItem
              key={step.key}
              step={step}
              isComplete={progress ? step.checkComplete(progress) : false}
              isCurrent={currentStep?.key === step.key}
              onClick={() => goToStep(step)}
              progress={progress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================
// STEP ITEM COMPONENT
// =========================================

interface StepItemProps {
  step: OnboardingStep;
  isComplete: boolean;
  isCurrent: boolean;
  onClick: () => void;
  progress: any;
}

function StepItem({ step, isComplete, isCurrent, onClick, progress }: StepItemProps) {
  const Icon = STEP_ICONS[step.key] || Circle;

  // Special handling for templates step (shows sub-progress)
  const isTemplatesStep = step.key === 'templates';
  const templateQuoteDone = progress?.template_quote_done || false;
  const templateInvoiceDone = progress?.template_invoice_done || false;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg flex items-start gap-3 text-left transition-all',
        'hover:bg-muted/50',
        isCurrent && 'bg-primary/10 border border-primary/30',
        isComplete && 'opacity-70'
      )}
    >
      {/* Status icon */}
      <div
        className={cn(
          'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0',
          isComplete
            ? 'bg-primary text-primary-foreground'
            : isCurrent
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isComplete ? (
          <Check className="h-3 w-3" />
        ) : (
          <span className="text-xs font-bold">{step.number}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span
            className={cn(
              'text-sm font-medium truncate',
              isComplete && 'line-through text-muted-foreground'
            )}
          >
            {step.title}
          </span>
        </div>

        {/* Templates sub-progress */}
        {isTemplatesStep && !isComplete && (
          <div className="mt-1 flex gap-2 text-xs">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full',
                templateQuoteDone
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {templateQuoteDone ? '✓' : '○'} Devis
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full',
                templateInvoiceDone
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {templateInvoiceDone ? '✓' : '○'} Facture
            </span>
          </div>
        )}

        {/* Current step indicator */}
        {isCurrent && !isComplete && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {step.description}
          </p>
        )}
      </div>

      {/* Arrow for current step */}
      {isCurrent && !isComplete && (
        <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      )}
    </button>
  );
}
