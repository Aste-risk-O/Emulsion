import React, { useEffect, useRef } from 'react';
import type { VisualDirective } from '../types/memory';
import { audioEngine } from '../engine/audioEngine';

interface EmulsionCanvasProps {
  visual: VisualDirective;
  accentHex: string;
  highlightHex: string;
  activePhotoSrc?: string;
  phase: 'paper' | 'blooming' | 'developed';
  isCalmFrame?: boolean;
  isMusicPlaying?: boolean;
  beatStepRef: React.MutableRefObject<number>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  isBokeh: boolean;
}

export const EmulsionCanvas: React.FC<EmulsionCanvasProps> = ({
  visual,
  accentHex,
  highlightHex,
  activePhotoSrc,
  phase,
  isCalmFrame = false,
  isMusicPlaying = false,
  beatStepRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasPhotoBleedRef = useRef(false);

  const propsRef = useRef({
    visual,
    accentHex,
    highlightHex,
    phase,
    isCalmFrame,
    isMusicPlaying,
  });
  propsRef.current = {
    visual,
    accentHex,
    highlightHex,
    phase,
    isCalmFrame,
    isMusicPlaying,
  };

  // Pre-downsample active photo into a tiny 8x6 offscreen canvas for smooth painterly atmospheric photo bleed
  useEffect(() => {
    if (!activePhotoSrc) {
      hasPhotoBleedRef.current = false;
      return;
    }
    const img = new Image();
    if (!activePhotoSrc.startsWith('data:') && !activePhotoSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const off = photoCanvasRef.current ?? document.createElement('canvas');
      off.width = 8;
      off.height = 6;
      const octx = off.getContext('2d');
      if (octx) {
        octx.clearRect(0, 0, 8, 6);
        octx.drawImage(img, 0, 0, 8, 6);
        photoCanvasRef.current = off;
        hasPhotoBleedRef.current = true;
      }
    };
    img.src = activePhotoSrc;
  }, [activePhotoSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const bufferScale = 0.5;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * bufferScale));
      canvas.height = Math.max(1, Math.floor(height * bufferScale));
      ctx.setTransform(bufferScale, 0, 0, bufferScale, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 44;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
      x: ((i * 97) % 100) * 0.01 * width,
      y: ((i * 61) % 100) * 0.01 * height,
      vx: ((i % 5) - 2) * 0.16,
      vy: -0.09 - (i % 4) * 0.07,
      radius: i % 6 === 0 ? 14 + (i % 4) * 8 : 1.1 + (i % 4) * 0.75,
      alpha: i % 6 === 0 ? 0.08 + (i % 3) * 0.04 : 0.18 + (i % 5) * 0.07,
      phase: i * 0.7,
      isBokeh: i % 6 === 0,
    }));

    let rafId = 0;
    let timerId = 0;
    let tick = 0;
    let lastBeatSeen = 0;
    let beatEnergy = 0;
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;

      const {
        visual: v,
        accentHex: acc,
        highlightHex: hi,
        phase: p,
        isCalmFrame: calm,
        isMusicPlaying: playing,
      } = propsRef.current;

      const currentBeat = beatStepRef.current;
      if (currentBeat !== lastBeatSeen) {
        lastBeatSeen = currentBeat;
        beatEnergy = 1;
      } else {
        beatEnergy *= 0.86;
      }

      tick += 0.04;
      ctx.clearRect(0, 0, width, height);

      // 0. Bilinear Real-Photo Atmospheric Bleed (sampled from active Polaroid)
      if (p !== 'paper' && hasPhotoBleedRef.current && photoCanvasRef.current) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.globalAlpha = v.inkPolarity === 'dark' ? 0.24 : 0.36;
        ctx.drawImage(photoCanvasRef.current, -width * 0.08, -height * 0.08, width * 1.16, height * 1.16);
        ctx.restore();
      }

      // 1. Anamorphic Light Leaks & Optical Halation Orbs
      if (p !== 'paper') {
        const leakBoost = playing ? beatEnergy * 0.1 : 0;
        const orbAlpha = (p === 'blooming' ? 0.24 : 0.3 * v.halationStrength) + leakBoost;
        const orbX = width * (0.24 + Math.sin(tick * 0.22) * 0.08);
        const orbY = height * (0.3 + Math.cos(tick * 0.16) * 0.06);
        const rad = Math.max(width, height) * 0.48;
        const grad = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, rad);
        grad.addColorStop(
          0,
          `${acc}${Math.min(255, Math.round(orbAlpha * 255))
            .toString(16)
            .padStart(2, '0')}`
        );
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const burnX = width * (0.82 + Math.cos(tick * 0.19) * 0.05);
        const burnY = height * (0.72 + Math.sin(tick * 0.21) * 0.05);
        const burnGrad = ctx.createRadialGradient(burnX, burnY, 8, burnX, burnY, rad * 0.68);
        burnGrad.addColorStop(
          0,
          `${hi}${Math.min(255, Math.round((0.16 + leakBoost) * 255))
            .toString(16)
            .padStart(2, '0')}`
        );
        burnGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = burnGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Crepuscular Sky Rays (Architectural Halation & Sunlit Paper Air)
      if (
        p !== 'paper' &&
        (v.ruleId === 'architectural-halation' || v.ruleId === 'sunlit-paper-air')
      ) {
        ctx.save();
        ctx.translate(width * 0.15, -40);
        ctx.rotate(0.32 + Math.sin(tick * 0.15) * 0.03);
        for (let r = 0; r < 3; r++) {
          const rayGrad = ctx.createLinearGradient(0, 0, 0, height * 1.1);
          rayGrad.addColorStop(0, `${hi}26`);
          rayGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rayGrad;
          ctx.fillRect(r * (width * 0.24), 0, 95 + r * 28, height * 1.15);
        }
        ctx.restore();
      }

      // 3. Kinetic Film-Gate Scratches (Paradox chaos frames only; vanish on calm frame)
      if (p !== 'paper' && v.ruleId === 'paradox-step-print' && !calm) {
        if (Math.sin(tick * 11) > 0.35) {
          ctx.strokeStyle = `${hi}2A`;
          ctx.lineWidth = 1.5;
          const sx = (Math.sin(tick * 37) + 1) * 0.5 * width;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx + 1, height);
          ctx.stroke();
        }
      }

      // 4. Emulsion Dust, Motes & Optical Bokeh Rings
      const speedMult = calm ? 0.32 : v.particleStyle === 'sparks' ? 1.5 : 0.85;
      for (const pt of particles) {
        if (!prefersReducedMotion) {
          pt.x += pt.vx * speedMult + Math.sin(tick + pt.phase) * 0.18;
          pt.y += pt.vy * speedMult;
          if (pt.y < -30) pt.y = height + 30;
          if (pt.x < -30) pt.x = width + 30;
          if (pt.x > width + 30) pt.x = -30;
        }

        const flicker = 0.65 + 0.35 * Math.sin(tick * 1.6 + pt.phase);

        if (pt.isBokeh) {
          if (p === 'paper') continue;
          const r = pt.radius * (1 + beatEnergy * 0.22);
          ctx.fillStyle = acc;
          ctx.globalAlpha = pt.alpha * flicker * (calm ? 0.75 : 0.52);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = hi;
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = pt.alpha * flicker * 0.35;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          if (v.particleStyle === 'sparks' || v.particleStyle === 'embers') {
            ctx.fillStyle = acc;
            ctx.globalAlpha = pt.alpha * flicker * (p === 'paper' ? 0.35 : 0.85);
          } else if (v.particleStyle === 'clouds') {
            ctx.fillStyle = hi;
            ctx.globalAlpha = pt.alpha * 0.55 * flicker;
          } else {
            ctx.fillStyle = v.inkPolarity === 'dark' ? '#3B362E' : '#F4F1EA';
            ctx.globalAlpha = pt.alpha * flicker * 0.65;
          }
          ctx.fill();
        }
      }

      // 5. Audio-Reactive Horizon Filament
      if (playing && p !== 'paper') {
        const bands = audioEngine.getSpectrumBands(24);
        const barWidth = 2.5;
        const gap = 8;
        const totalW = bands.length * (barWidth + gap);
        const startX = (width - totalW) * 0.5;
        const baseY = height - 86;

        ctx.fillStyle = v.inkPolarity === 'dark' ? '#161513' : acc;
        for (let i = 0; i < bands.length; i++) {
          const val = Math.max(bands[i], beatEnergy * 0.35 * Math.sin(i * 0.7 + tick * 2));
          const h = 3 + Math.abs(val) * 26;
          ctx.globalAlpha = 0.28 + Math.abs(val) * 0.48;
          ctx.fillRect(startX + i * (barWidth + gap), baseY - h, barWidth, h);
        }
      }

      ctx.globalAlpha = 1;

      if (!prefersReducedMotion && !cancelled) {
        timerId = window.setTimeout(() => {
          if (!cancelled) {
            rafId = window.requestAnimationFrame(draw);
          }
        }, 56);
      }
    };

    draw();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [beatStepRef]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="emulsion-canvas"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 h-full w-full"
    />
  );
};
