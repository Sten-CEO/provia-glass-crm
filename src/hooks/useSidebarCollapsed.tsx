import { useState, useEffect } from "react";

export function useSidebarCollapsed() {
  // Persisted string state: 'expanded' | 'collapsed' (fallback from legacy boolean)
  const [state, setState] = useState<"expanded" | "collapsed">(() => {
    const saved = localStorage.getItem("sidebarState");
    if (saved === "expanded" || saved === "collapsed") return saved;
    const legacy = localStorage.getItem("pv_sidebar_collapsed");
    if (legacy) {
      const collapsed = JSON.parse(legacy) as boolean;
      const mapped = collapsed ? "collapsed" : "expanded";
      localStorage.setItem("sidebarState", mapped);
      return mapped;
    }
    return "expanded";
  });

  useEffect(() => {
    localStorage.setItem("sidebarState", state);
  }, [state]);

  const isCollapsed = state === "collapsed";
  const toggleCollapsed = () => setState((prev) => (prev === "collapsed" ? "expanded" : "collapsed"));

  return { isCollapsed, toggleCollapsed };
}
