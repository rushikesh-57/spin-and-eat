import { useState, useCallback, useRef, useEffect } from 'react';
import type { FoodItem } from '../types';

const FULL_SPINS = 6;
const SPIN_DURATION_MS = 4000;

/** In canvas, 0 is right (3 o'clock); top (12 o'clock) is -PI/2. */
const TOP_ANGLE = -Math.PI / 2;

/**
 * Which slice is under the pointer after the wheel has rotated by `rotation` (radians).
 * Slice 0 is from 0 to sliceAngle, slice 1 from sliceAngle to 2*sliceAngle, etc.
 */
function getWinnerIndex(rotation: number, sliceCount: number): number {
  const sliceAngle = (2 * Math.PI) / sliceCount;
  const normalized =
    ((TOP_ANGLE - (rotation % (2 * Math.PI))) % (2 * Math.PI) + 2 * Math.PI) %
    (2 * Math.PI);
  const index = Math.floor(normalized / sliceAngle);
  return Math.min(index, sliceCount - 1);
}

export function useWheelSpin(items: FoodItem[]) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const rafRef = useRef<number>(0);
  const itemsLengthRef = useRef(items.length);

  // When filtered items change, reset wheel so segments and pointer align
  useEffect(() => {
    if (items.length !== itemsLengthRef.current) {
      itemsLengthRef.current = items.length;
      if (!isSpinning) {
        setRotation(0);
        setSelectedItem(null);
      }
    }
  }, [items.length, isSpinning]);

  const spin = useCallback(
    (onComplete?: (item: FoodItem) => void) => {
      if (items.length === 0 || isSpinning) return null;

      setIsSpinning(true);
      setSelectedItem(null);

      const spinTime = SPIN_DURATION_MS;
      const start = performance.now();
      // Fair randomness: multiple full spins + random final position
      const totalRotation =
        Math.random() * 2 * Math.PI + FULL_SPINS * 2 * Math.PI;

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / spinTime, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setRotation(totalRotation * easeOut);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsSpinning(false);
          const index = getWinnerIndex(totalRotation, items.length);
          const item = items[index];
          setSelectedItem(item);
          onComplete?.(item);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
      return null;
    },
    [items, isSpinning]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { rotation, isSpinning, selectedItem, spin };
}
