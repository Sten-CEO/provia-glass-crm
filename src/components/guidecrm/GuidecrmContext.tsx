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
import { toast } from 'sonner';

// Create context with default values
const GuidecrmContext = createContext<OnboardingContextValue | null>(null);

// Debug flag - set to true to see console logs
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[GuideCRM]', ...args);

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
  const [dismissed, setDismissed] = useState(false); // User manually dismissed
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  // =========================================
  // FETCH PROGRESS
  // =========================================

  const fetchProgress = useCallback(async () => {
    try {
      log('Fetching progress...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log('No user found');
        setLoading(false);
        return;
      }
      setUserId(user.id);
      log('User ID:', user.id);

      // Get user's company
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userRole?.company_id) {
        log('No company found for user');
        setLoading(false);
        return;
      }
      setCompanyId(userRole.company_id);
      log('Company ID:', userRole.company_id);

      // Fetch or create onboarding progress
      // Use 'as any' to bypass TypeScript since table may not be in types yet
      let { data: progressData, error: fetchError } = await (supabase
        .from('onboarding_progress' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', userRole.company_id)
        .maybeSingle() as any);

      if (fetchError) {
        // Check if table doesn't exist (error code 42P01 or message contains "does not exist")
        if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist') || fetchError.message?.includes('relation')) {
          log('Table onboarding_progress does not exist!');
          console.error('[GuideCRM] ⚠️ La table "onboarding_progress" n\'existe pas dans Supabase.');
          console.error('[GuideCRM] Veuillez exécuter la migration SQL dans votre dashboard Supabase > SQL Editor');
          setTableExists(false);
          setError('Table onboarding_progress non trouvée. Exécutez la migration SQL.');
          setLoading(false);
          return;
        }

        // PGRST116 means no rows found - that's OK
        if (fetchError.code !== 'PGRST116') {
          console.error('[GuideCRM] Error fetching progress:', fetchError);
          setError('Erreur lors du chargement de la progression');
          setLoading(false);
          return;
        }
      }

      log('Progress data:', progressData);

      // Create progress record if it doesn't exist
      if (!progressData) {
        log('Creating new progress record...');
        const { data: newProgress, error: insertError } = await (supabase
          .from('onboarding_progress' as any)
          .insert({
            user_id: user.id,
            company_id: userRole.company_id,
          })
          .select()
          .single() as any);

        if (insertError) {
          console.error('[GuideCRM] Error creating progress:', insertError);
          setError('Erreur lors de l\'initialisation');
          setLoading(false);
          return;
        }

        log('New progress created:', newProgress);
        progressData = newProgress;
      }

      setProgress(progressData as OnboardingProgress);
      setTableExists(true);
      setError(null);
    } catch (err) {
      console.error('[GuideCRM] Unexpected error:', err);
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
    if (!userId || !companyId) {
      log('Cannot mark step complete: missing userId or companyId');
      return;
    }

    if (!tableExists) {
      log('Cannot mark step complete: table does not exist');
      return;
    }

    log('Marking step complete:', stepKey, subKey);

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

    log('Updates to apply:', updates);

    const { error: updateError } = await (supabase
      .from('onboarding_progress' as any)
      .update(updates)
      .eq('user_id', userId)
      .eq('company_id', companyId) as any);

    if (updateError) {
      console.error('[GuideCRM] Error updating progress:', updateError);
      return;
    }

    log('Step marked complete, refreshing...');

    // Refresh progress
    await fetchProgress();

    // Show success feedback
    toast.success(`Étape "${stepKey}" complétée !`, { duration: 2000 });
  }, [userId, companyId, tableExists, fetchProgress]);

  // =========================================
  // EVENT LISTENERS
  // =========================================

  useEffect(() => {
    const unsubscribe = subscribeToOnboardingEvents((event) => {
      log('Event received:', event.type, event.payload);

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
    setDismissed(true);
    // Store dismiss per user to avoid affecting other accounts
    if (userId) {
      localStorage.setItem(`guidecrm_dismissed_${userId}`, 'true');
    }
  }, [userId]);

  const resetOnboarding = useCallback(async () => {
    if (!userId || !companyId) return;

    await (supabase
      .from('onboarding_progress' as any)
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
      .eq('company_id', companyId) as any);

    // Remove per-user localStorage items
    if (userId) {
      localStorage.removeItem(`guidecrm_dismissed_${userId}`);
      localStorage.removeItem(`guidecrm_celebration_${userId}`);
    }
    // Also clean up old global keys
    localStorage.removeItem('guidecrm_dismissed');
    localStorage.removeItem('guidecrm_celebration_shown');
    setDismissed(false);
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

  // Computed showGuide - synchronous calculation to avoid race conditions
  const showGuide = useMemo(() => {
    // Don't show while loading
    if (loading) {
      log('showGuide: false (loading)');
      return false;
    }
    // Don't show if no userId yet
    if (!userId) {
      log('showGuide: false (no userId)');
      return false;
    }
    // Don't show if onboarding is complete
    if (isOnboardingComplete) {
      log('showGuide: false (onboarding complete)');
      return false;
    }
    // Don't show if user dismissed in this session
    if (dismissed) {
      log('showGuide: false (dismissed this session)');
      return false;
    }
    // Check localStorage for persistent dismiss
    const dismissedInStorage = localStorage.getItem(`guidecrm_dismissed_${userId}`);
    if (dismissedInStorage === 'true') {
      log('showGuide: false (dismissed in localStorage)');
      return false;
    }
    // Clean up old global key if exists
    const oldGlobalKey = localStorage.getItem('guidecrm_dismissed');
    if (oldGlobalKey) {
      localStorage.removeItem('guidecrm_dismissed');
    }
    log('showGuide: true ✅');
    return true;
  }, [loading, userId, isOnboardingComplete, dismissed]);

  // setShowGuide for compatibility (uses setDismissed internally)
  const setShowGuide = useCallback((value: boolean) => {
    if (!value) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, []);

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
