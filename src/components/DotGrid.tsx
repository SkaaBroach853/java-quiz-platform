import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import './DotGrid.css';

type DotGridProps = {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  shockRadius?: number;
  shockStrength?: number;
  resistance?: number;
  returnDuration?: number;
  className?: string;
  style?: CSSProperties;
};

type Dot = {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  vx: number;
  vy: number;
};

const hexToRgb = (hex: string) => {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return { r: 255, g: 255, b: 255 };

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
};

const DotGrid = ({
  dotSize = 3,
  gap = 15,
  baseColor = '#2F293A',
  activeColor = '#5227FF',
  proximity = 110,
  shockRadius = 250,
  shockStrength = 7,
  resistance = 750,
  returnDuration = 2.1,
  className = '',
  style,
}: DotGridProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pointerRef = useRef({ x: -9999, y: -9999 });
  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const cell = dotSize + gap;
    const cols = Math.max(1, Math.floor((width + gap) / cell));
    const rows = Math.max(1, Math.floor((height + gap) / cell));
    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;
    const startX = (width - gridW) / 2 + dotSize / 2;
    const startY = (height - gridH) / 2 + dotSize / 2;

    const dots: Dot[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        dots.push({
          cx: startX + col * cell,
          cy: startY + row * cell,
          xOffset: 0,
          yOffset: 0,
          vx: 0,
          vy: 0,
        });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    buildGrid();
    const wrap = wrapperRef.current;
    if (!wrap) return;

    const observer = new ResizeObserver(buildGrid);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [buildGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dx = dot.cx - x;
        const dy = dot.cy - y;
        const distance = Math.hypot(dx, dy);
        if (distance > shockRadius || distance === 0) continue;

        const falloff = 1 - distance / shockRadius;
        dot.vx += (dx / distance) * shockStrength * falloff;
        dot.vy += (dy / distance) * shockStrength * falloff;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('click', onClick);
    };
  }, [shockRadius, shockStrength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const proximitySq = proximity * proximity;
    const spring = Math.max(0.02, Math.min(0.25, 1 / (returnDuration * 30)));
    const damping = Math.max(0.78, Math.min(0.98, resistance / 850));

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const { x: px, y: py } = pointerRef.current;

      for (const dot of dotsRef.current) {
        dot.vx += -dot.xOffset * spring;
        dot.vy += -dot.yOffset * spring;
        dot.vx *= damping;
        dot.vy *= damping;
        dot.xOffset += dot.vx;
        dot.yOffset += dot.vy;

        const x = dot.cx + dot.xOffset;
        const y = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const distSq = dx * dx + dy * dy;

        let color = baseRgb;
        if (distSq <= proximitySq) {
          const t = 1 - Math.sqrt(distSq) / proximity;
          color = {
            r: Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t),
            g: Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t),
            b: Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t),
          };
        }

        ctx.beginPath();
        ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [activeRgb, baseRgb, dotSize, proximity, resistance, returnDuration]);

  return (
    <section className={`dot-grid ${className}`} style={style}>
      <div ref={wrapperRef} className="dot-grid__wrap">
        <canvas ref={canvasRef} className="dot-grid__canvas" />
      </div>
    </section>
  );
};

export default DotGrid;
