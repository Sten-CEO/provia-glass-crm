import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DisplayView {
  name: string;
  columns: string[];
}

export interface DisplaySettings {
  visibleColumns: string[];
  customViews: DisplayView[];
  activeView: string;
}

export function useDisplaySettings(page: string, defaultColumns: string[]) {
  const [settings, setSettings] = useState<DisplaySettings>({
    visibleColumns: defaultColumns,
    customViews: [],
    activeView: "default",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [page]);

  const loadSettings = async () => {
    try {
      const userId = "current-user"; // TODO: Get real user ID from auth
      
      const { data, error } = await supabase
        .from("user_display_settings")
        .select("*")
        .eq("page", page)
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading display settings:", error);
      }

      if (data) {
        setSettings({
          visibleColumns: (data.visible_columns as any) || defaultColumns,
          customViews: (data.custom_views as any) || [],
          activeView: data.active_view || "default",
        });
      }
    } catch (error) {
      console.error("Error loading display settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<DisplaySettings>) => {
    try {
      const userId = "current-user"; // TODO: Get real user ID from auth
      const updatedSettings = { ...settings, ...newSettings };

      const payload = {
        user_id: userId,
        page,
        visible_columns: updatedSettings.visibleColumns as any,
        custom_views: updatedSettings.customViews as any,
        active_view: updatedSettings.activeView,
      };

      const { error } = await supabase
        .from("user_display_settings")
        .upsert(payload, {
          onConflict: "user_id,page"
        });

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success("Préférences enregistrées");
    } catch (error) {
      console.error("Error saving display settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const toggleColumn = (column: string) => {
    const newColumns = settings.visibleColumns.includes(column)
      ? settings.visibleColumns.filter((c) => c !== column)
      : [...settings.visibleColumns, column];
    
    saveSettings({ visibleColumns: newColumns });
  };

  const saveView = (name: string, columns: string[]) => {
    const newViews = [...settings.customViews.filter((v) => v.name !== name), { name, columns }];
    saveSettings({ customViews: newViews });
  };

  const deleteView = (name: string) => {
    const newViews = settings.customViews.filter((v) => v.name !== name);
    saveSettings({ customViews: newViews });
  };

  const applyView = (viewName: string) => {
    if (viewName === "default") {
      saveSettings({ visibleColumns: defaultColumns, activeView: "default" });
    } else {
      const view = settings.customViews.find((v) => v.name === viewName);
      if (view) {
        saveSettings({ visibleColumns: view.columns, activeView: viewName });
      }
    }
  };

  return {
    settings,
    loading,
    toggleColumn,
    saveView,
    deleteView,
    applyView,
  };
}
