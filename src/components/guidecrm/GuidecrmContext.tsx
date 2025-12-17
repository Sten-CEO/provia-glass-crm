/**
 * GUIDECRM - Onboarding Context Provider
 *
 * This context provides onboarding state and actions to all components.
 * Wrap your app with <GuidecrmProvider> to enable the onboarding system.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  OnboardingProgress,
  OnboardingContextValue,
  OnboardingStep,
  OnboardingStepKey,
  ONBOARDING_STEPS,
  calculateProgressPercentage,
  getCurrentStep,
  getCompletedStepsCount,
} from './guidecrmTypes';
import { subscribeToOnboardingEvents } from './guidecrmEvents';

// Create context with default values
const GuidecrmContext = createContext<OnboardingContextValue | null>(null);

// =========================================
// PROVIDER COMPONENT
// =========================================

interface GuidecrmProviderProps {
  children: React.ReactNode;
}

export function GuidecrmProvider({ children }: GuidecrmProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // =========================================
  // FETCH PROGRESS
  // =========================================

  const fetchProgress = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Get user's company
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole?.company_id) {
        setLoading(false);
        return;
      }
      setCompanyId(userRole.company_id);

      // Fetch or create onboarding progress
      let { data: progressData, error: fetchError } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', userRole.company_id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching onboarding progress:', fetchError);
        setError('Erreur lors du chargement de la progression');
        setLoading(false);
        return;
      }

      // Create progress record if it doesn't exist
      if (!progressData) {
        const { data: newProgress, error: insertError } = await supabase
          .from('onboarding_progress')
          .insert({
            user_id: user.id,
            company_id: userRole.company_id,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating onboarding progress:', insertError);
          setError('Erreur lors de l\'initialisation');
          setLoading(false);
          return;
        }

        progressData = newProgress;
      }

      setProgress(progressData as OnboardingProgress);
      setError(null);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // =========================================
  // MARK STEP COMPLETE
  // =========================================

  const markStepComplete = useCallback(async (
    stepKey: OnboardingStepKey,
    subKey?: 'template_quote' | 'template_invoice'
  ) => {
    if (!userId || !companyId || !progress) return;

    const updates: Partial<OnboardingProgress> = {};

    switch (stepKey) {
      case 'company':
        updates.company_done = true;
        break;
      case 'templates':
        if (subKey === 'template_quote') {
          updates.template_quote_done = true;
        } else if (subKey === 'template_invoice') {
          updates.template_invoice_done = true;
        }
        break;
      case 'client':
        updates.client_done = true;
        break;
      case 'quote':
        updates.quote_done = true;
        break;
      case 'invoice':
        updates.invoice_done = true;
        break;
      case 'member':
        updates.member_done = true;
        break;
      case 'inventory':
        updates.inventory_done = true;
        break;
    }

    const { error: updateError } = await supabase
      .from('onboarding_progress')
      .update(updates)
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (updateError) {
      console.error('Error updating onboarding progress:', updateError);
      return;
    }

    // Refresh progress
    await fetchProgress();
  }, [userId, companyId, progress, fetchProgress]);

  // =========================================
  // EVENT LISTENERS
  // =========================================

  useEffect(() => {
    const unsubscribe = subscribeToOnboardingEvents((event) => {
      switch (event.type) {
        case 'guidecrm:company_saved':
          markStepComplete('company');
          break;
        case 'guidecrm:template_created':
          const templateType = event.payload?.templateType;
          if (templateType === 'QUOTE') {
            markStepComplete('templates', 'template_quote');
          } else if (templateType === 'INVOICE') {
            markStepComplete('templates', 'template_invoice');
          }
          break;
        case 'guidecrm:client_created':
          markStepComplete('client');
          break;
        case 'guidecrm:quote_created':
          markStepComplete('quote');
          break;
        case 'guidecrm:invoice_created':
          markStepComplete('invoice');
          break;
        case 'guidecrm:member_invited':
          markStepComplete('member');
          break;
        case 'guidecrm:inventory_created':
          markStepComplete('inventory');
          break;
      }
    });

    return unsubscribe;
  }, [markStepComplete]);

  // =========================================
  // NAVIGATION HELPERS
  // =========================================

  const goToStep = useCallback((step: OnboardingStep) => {
    navigate(step.route);
    // Highlight first target after navigation
    setTimeout(() => {
      if (step.targets.length > 0) {
        setHighlightedTarget(step.targets[0].selector);
      }
    }, 300);
  }, [navigate]);

  const goToNextStep = useCallback(() => {
    const nextStep = getCurrentStep(progress);
    if (nextStep) {
      goToStep(nextStep);
    }
  }, [progress, goToStep]);

  const dismissOnboarding = useCallback(() => {
    setShowGuide(false);
    localStorage.setItem('guidecrm_dismissed', 'true');
  }, []);

  const resetOnboarding = useCallback(async () => {
    if (!userId || !companyId) return;

    await supabase
      .from('onboarding_progress')
      .update({
        company_done: false,
        template_quote_done: false,
        template_invoice_done: false,
        client_done: false,
        quote_done: false,
        invoice_done: false,
        member_done: false,
        inventory_done: false,
        completed_at: null,
      })
      .eq('user_id', userId)
      .eq('company_id', companyId);

    localStorage.removeItem('guidecrm_dismissed');
    setShowGuide(true);
    await fetchProgress();
  }, [userId, companyId, fetchProgress]);

  // =========================================
  // COMPUTED VALUES
  // =========================================

  const isOnboardingComplete = useMemo(() => {
    return progress?.completed_at !== null && progress?.completed_at !== undefined;
  }, [progress]);

  const currentStep = useMemo(() => {
    return getCurrentStep(progress);
  }, [progress]);

  const currentStepIndex = useMemo(() => {
    if (!currentStep) return ONBOARDING_STEPS.length;
    return ONBOARDING_STEPS.findIndex(s => s.key === currentStep.key);
  }, [currentStep]);

  const progressPercentage = useMemo(() => {
    return calculateProgressPercentage(progress);
  }, [progress]);

  const completedSteps = useMemo(() => {
    return getCompletedStepsCount(progress);
  }, [progress]);

  // Check if dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('guidecrm_dismissed');
    if (dismissed === 'true' && !isOnboardingComplete) {
      setShowGuide(false);
    }
    if (isOnboardingComplete) {
      setShowGuide(false);
    }
  }, [isOnboardingComplete]);

  // =========================================
  // CONTEXT VALUE
  // =========================================

  const value: OnboardingContextValue = {
    progress,
    loading,
    error,
    isOnboardingComplete,
    currentStep,
    currentStepIndex,
    progressPercentage,
    completedSteps,
    totalSteps: ONBOARDING_STEPS.length,
    markStepComplete,
    goToStep,
    goToNextStep,
    dismissOnboarding,
    resetOnboarding,
    refreshProgress: fetchProgress,
    showGuide,
    setShowGuide,
    highlightedTarget,
    setHighlightedTarget,
  };

  return (
    <GuidecrmContext.Provider value={value}>
      {children}
    </GuidecrmContext.Provider>
  );
}

// =========================================
// HOOK
// =========================================

export function useGuidecrm(): OnboardingContextValue {
  const context = useContext(GuidecrmContext);
  if (!context) {
    throw new Error('useGuidecrm must be used within a GuidecrmProvider');
  }
  return context;
}

// Also export a hook that doesn't throw if context is missing
export function useGuidecrmSafe(): OnboardingContextValue | null {
  return useContext(GuidecrmContext);
}
