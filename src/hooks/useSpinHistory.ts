import { useState, useEffect, useCallback } from 'react';
import type { SpinHistoryEntry } from '../types';
import { loadSpinHistory, saveSpinHistory } from '../utils/storage';

const MAX_HISTORY = 5;

export function useSpinHistory() {
  const [history, setHistory] = useState<SpinHistoryEntry[]>(() => loadSpinHistory());

  useEffect(() => {
    saveSpinHistory(history);
  }, [history]);

  const addToHistory = useCallback((entry: SpinHistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addToHistory, clearHistory };
}
