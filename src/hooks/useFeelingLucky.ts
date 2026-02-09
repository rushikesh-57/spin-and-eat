import { useState, useEffect, useCallback } from 'react';
import { loadFeelingLucky, saveFeelingLucky } from '../utils/storage';

export function useFeelingLucky() {
  const [enabled, setEnabled] = useState(() => loadFeelingLucky());

  useEffect(() => {
    saveFeelingLucky(enabled);
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return { feelingLuckyEnabled: enabled, setFeelingLucky: setEnabled, toggleFeelingLucky: toggle };
}
