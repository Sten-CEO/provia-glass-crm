import { useState, useCallback, useMemo } from "react";

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(items.map((item) => item.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [items]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    selectedItems,
  };
}
