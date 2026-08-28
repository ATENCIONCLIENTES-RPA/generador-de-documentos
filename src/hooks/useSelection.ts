import { useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';

/**
 * Helpers around dataStore Set<string> selection.
 * Wraps toggleRow, togglePage, clearSelection with derived helpers.
 */
export function useSelection() {
  const selectedRows = useDataStore((s) => s.selectedRows);
  const toggleRow = useDataStore((s) => s.toggleRow);
  const togglePage = useDataStore((s) => s.togglePage);
  const clearSelection = useDataStore((s) => s.clearSelection);

  const isSelected = useCallback((id: string) => selectedRows.has(id), [selectedRows]);

  const toggleRowSafe = useCallback(
    (id: string) => {
      if (!id) {
        console.error('[useSelection] toggleRow called with empty id');
        return;
      }
      toggleRow(id);
    },
    [toggleRow],
  );

  return {
    selectedRows,
    selectedCount: selectedRows.size,
    hasSelection: selectedRows.size > 0,
    isSelected,
    toggleRow: toggleRowSafe,
    togglePage,
    clearSelection,
  };
}

export default useSelection;
