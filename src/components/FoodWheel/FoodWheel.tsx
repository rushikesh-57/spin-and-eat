import { useEffect, useRef } from 'react';
import type { FoodItem } from '../../types';
import { getWheelColor } from '../../utils/wheelColors';
import styles from './FoodWheel.module.css';

const SIZE = 320;
const RADIUS = SIZE / 2;

interface FoodWheelProps {
  items: FoodItem[];
  rotation: number;
  'aria-label'?: string;
}

export function FoodWheel({ items, rotation, 'aria-label': ariaLabel }: FoodWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.translate(RADIUS, RADIUS);
    ctx.rotate(rotation);
    ctx.translate(-RADIUS, -RADIUS);

    const sliceAngle = (2 * Math.PI) / items.length;

    items.forEach((item, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(RADIUS, RADIUS);
      ctx.arc(RADIUS, RADIUS, RADIUS - 2, startAngle, endAngle);
      ctx.fillStyle = getWheelColor(index);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(RADIUS, RADIUS);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(item.name, RADIUS - 12, 4);
      ctx.restore();
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [items, rotation]);

  if (items.length === 0) {
    return (
      <div className={styles.empty} role="status" aria-live="polite">
        <p>Add food items or select categories to spin the wheel.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.pointer} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className={styles.wheel}
        role="img"
        aria-label={ariaLabel ?? `Wheel with ${items.length} food options`}
      />
    </div>
  );
}
