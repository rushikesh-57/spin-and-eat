import { useEffect, useRef, useState } from 'react';
import type { FoodItem } from '../../types';
import { getWheelColor } from '../../utils/wheelColors';
import styles from './FoodWheel.module.css';

const MAX_SIZE = 320;
const MIN_SIZE = 220;

interface FoodWheelProps {
  items: FoodItem[];
  rotation: number;
  'aria-label'?: string;
}

export function FoodWheel({ items, rotation, 'aria-label': ariaLabel }: FoodWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(MAX_SIZE);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateSize = () => {
      const available = Math.floor(wrapper.clientWidth);
      if (!available) return;
      const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, available));
      setSize((prev) => (prev === next ? prev : next));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const radius = size / 2;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);
    ctx.translate(radius, radius);
    ctx.rotate(rotation);
    ctx.translate(-radius, -radius);

    const sliceAngle = (2 * Math.PI) / items.length;

    items.forEach((item, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 2, startAngle, endAngle);
      ctx.fillStyle = getWheelColor(index);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(item.name, radius - 12, 4);
      ctx.restore();
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [items, rotation, size]);

  if (items.length === 0) {
    return (
      <div className={styles.empty} role="status" aria-live="polite">
        <p>Add food items or select categories to spin the wheel.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.pointer} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={styles.wheel}
        role="img"
        aria-label={ariaLabel ?? `Wheel with ${items.length} food options`}
      />
    </div>
  );
}
