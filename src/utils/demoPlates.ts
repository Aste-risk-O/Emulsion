export type DemoPlateId =
  | 'ioai-1'
  | 'ioai-2'
  | 'ioai-3'
  | 'ioai-4'
  | 'morning-2'
  | 'sat-1'
  | 'sat-2';

const plateCache = new Map<string, string>();

function addGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.06): void {
  const step = 4;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const lum = v > 0 ? 255 : 0;
      ctx.fillStyle = `rgba(${lum},${lum},${lum},${Math.abs(v) * alpha})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

export function renderDemoPlateDataUrl(plateId: DemoPlateId): string {
  const cached = plateCache.get(plateId);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  const w = 640;
  const h = 480;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (plateId === 'sat-2') {
    // Crisp Cobalt Blue & White 1510 SAT Score Report Screenshot
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0F2357');
    bg.addColorStop(0.32, '#1D4ED8');
    bg.addColorStop(0.321, '#F5F7FA');
    bg.addColorStop(1, '#EBF0F7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Top bar inside screenshot
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('SAT Score Report  ·  August 2026', 44, 52);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '400 13px monospace';
    ctx.fillText('TOTAL SCORE', 44, 108);

    // White elevated score card
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15, 35, 87, 0.16)';
    ctx.shadowBlur = 24;
    ctx.fillRect(40, 128, w - 80, 290);
    ctx.shadowBlur = 0;

    // Cobalt accent stripe
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(40, 128, w - 80, 6);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 84px system-ui, sans-serif';
    ctx.fillText('1510', 76, 232);

    ctx.fillStyle = '#475569';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText('/ 1600', 274, 230);

    ctx.fillStyle = '#1D4ED8';
    ctx.font = '600 14px monospace';
    ctx.fillText('99TH PERCENTILE  ·  VERIFIED', 76, 266);

    // Section breakdown
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(76, 296);
    ctx.lineTo(w - 76, 296);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText('Reading and Writing', 76, 336);
    ctx.fillText('Math', 340, 336);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 38px system-ui, sans-serif';
    ctx.fillText('730', 76, 382);
    ctx.fillText('780', 340, 382);

    addGrain(ctx, w, h, 0.025);
  } else if (plateId === 'sat-1') {
    // Midnight Astana streetlamp bokeh & wet asphalt reflections
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#070911');
    bg.addColorStop(0.58, '#0D1426');
    bg.addColorStop(1, '#1A130D');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const lights = [
      { x: 140, y: 120, r: 64, c: 'rgba(245, 166, 66, 0.72)' },
      { x: 310, y: 95, r: 48, c: 'rgba(255, 204, 112, 0.68)' },
      { x: 490, y: 145, r: 78, c: 'rgba(224, 145, 50, 0.65)' },
      { x: 220, y: 240, r: 36, c: 'rgba(59, 130, 246, 0.45)' },
      { x: 420, y: 230, r: 42, c: 'rgba(37, 99, 235, 0.42)' },
    ];
    for (const l of lights) {
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
      g.addColorStop(0, l.c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wet street reflections
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(59,130,246,0.16)' : 'rgba(245,166,66,0.18)';
      const rx = 80 + ((i * 53) % 480);
      const ry = 310 + ((i * 29) % 140);
      ctx.fillRect(rx, ry, 28 + (i % 4) * 14, 4);
    }
    addGrain(ctx, w, h, 0.08);
  } else if (plateId.startsWith('ioai-')) {
    const idx = Number(plateId.split('-')[1]) || 1;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    if (idx === 1) {
      // Crowded cyan-lit Olympiad auditorium
      bg.addColorStop(0, '#0B1A26');
      bg.addColorStop(0.55, '#133142');
      bg.addColorStop(1, '#1B2834');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      // Stage screen glow
      const glow = ctx.createRadialGradient(320, 140, 20, 320, 140, 240);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
      glow.addColorStop(1, 'rgba(11, 26, 38, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.fillRect(160, 75, 320, 130);
      ctx.fillStyle = '#0F172A';
      ctx.font = '600 26px monospace';
      ctx.fillText('IOAI 2026', 248, 145);
      // Crowd silhouettes
      ctx.fillStyle = '#070E14';
      for (let i = 0; i < 22; i++) {
        ctx.beginPath();
        ctx.arc(24 + i * 30, 360 + (i % 3) * 18, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(8 + i * 30, 378 + (i % 3) * 18, 32, 110);
      }
    } else if (idx === 2) {
      // Volunteer badge & schedule paper on desk
      bg.addColorStop(0, '#1D2935');
      bg.addColorStop(1, '#2D3A46');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      // Lanyard ribbon
      ctx.strokeStyle = '#0EA5E9';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(260, 0);
      ctx.lineTo(315, 160);
      ctx.lineTo(375, 0);
      ctx.stroke();
      // Pass card
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(215, 155, 210, 260);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(215, 155, 210, 54);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 18px monospace';
      ctx.fillText('VOLUNTEER STAFF', 238, 189);
      ctx.fillStyle = '#1E293B';
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillText('HALL B / ROUND 1', 238, 260);
    } else if (idx === 3) {
      // Motion blur corridor lights
      bg.addColorStop(0, '#111820');
      bg.addColorStop(1, '#24313D');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(125, 211, 252, 0.28)' : 'rgba(244, 114, 94, 0.22)';
        ctx.fillRect(30 + i * 44, 90 + (i % 4) * 55, 110, 12);
      }
    } else {
      // Warm doorway exit toward dusk
      bg.addColorStop(0, '#16202A');
      bg.addColorStop(1, '#2B2523');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const door = ctx.createLinearGradient(220, 60, 420, 420);
      door.addColorStop(0, '#F59E7A');
      door.addColorStop(0.6, '#E07A5F');
      door.addColorStop(1, '#3D405B');
      ctx.fillStyle = door;
      ctx.fillRect(215, 60, 210, 360);
    }
    addGrain(ctx, w, h, 0.085);
  } else {
    // morning-2: coral-orange & twilight-blue architectural reflection
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1E2F4D');
    sky.addColorStop(0.45, '#E07A5F');
    sky.addColorStop(0.7, '#F6AD8F');
    sky.addColorStop(1, '#1B202C');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Architectural concrete silhouette
    ctx.fillStyle = '#181C26';
    ctx.fillRect(0, 290, 210, 190);
    ctx.fillRect(430, 250, 210, 230);
    // Warm lit balcony windows
    ctx.fillStyle = 'rgba(255, 200, 140, 0.72)';
    ctx.fillRect(64, 330, 32, 42);
    ctx.fillRect(496, 296, 36, 48);
    addGrain(ctx, w, h, 0.06);
  }

  const url = canvas.toDataURL('image/jpeg', 0.88);
  plateCache.set(plateId, url);
  return url;
}

export function createSampleUploadFile(variant: 'dusk' | 'midnight' | 'clouds'): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 480, 360);

    if (variant === 'dusk') {
      grad.addColorStop(0, '#2B3A55');
      grad.addColorStop(0.55, '#CE7777');
      grad.addColorStop(1, '#F2E5E5');
    } else if (variant === 'midnight') {
      grad.addColorStop(0, '#090D16');
      grad.addColorStop(0.6, '#1E3A8A');
      grad.addColorStop(1, '#D97706');
    } else {
      grad.addColorStop(0, '#A5C9E5');
      grad.addColorStop(0.6, '#E8EEF2');
      grad.addColorStop(1, '#6B8A68');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 360);
    addGrain(ctx, 480, 360, 0.06);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob ?? new Blob()], `sample-${variant}.jpg`, { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.9
    );
  });
}
