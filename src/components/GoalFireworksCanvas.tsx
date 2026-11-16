import React, { useEffect, useRef } from 'react';

export interface GoalFireworkBurst {
  tick: number;
  x: number;
  y: number;
}

interface GoalFireworksCanvasProps {
  active: boolean;
  burst: GoalFireworkBurst | null;
  reduceMotion?: boolean | null;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  drag: number;
  kind: 'spark' | 'star' | 'comet';
  twinklePhase: number;
  trail: Array<{ x: number; y: number }>;
  maxTrail: number;
  rotation: number;
  rotationSpeed: number;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

interface SecondaryRocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetTime: number;
  elapsed: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
}

const FIREWORK_PALETTES = [
  ['#FBBF24', '#FDE047', '#FEF08A', '#F59E0B'], // Emas Hangat
  ['#34D399', '#6EE7B7', '#A7F3D0', '#10B981'], // Hijau Zamrud Hutan
  ['#38BDF8', '#7DD3FC', '#BAE6FD', '#0EA5E9'], // Biru Langit Cerah
  ['#FB7185', '#FDA4AF', '#FECDD3', '#F43F5E'], // Merah Muda Meriah
  ['#C084FC', '#E9D5FF', '#FDE68A', '#A855F7'], // Lavender Ajaib
];

const drawMiniStar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  rotation: number
) => {
  const innerRadius = outerRadius * 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / 4;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const GoalFireworksCanvas: React.FC<GoalFireworksCanvasProps> = ({
  active,
  burst,
  reduceMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const ringsRef = useRef<ShockwaveRing[]>([]);
  const rocketsRef = useRef<SecondaryRocket[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clearScheduledTimeouts = () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
    };

    const stopAndClear = () => {
      clearScheduledTimeouts();
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      particlesRef.current = [];
      ringsRef.current = [];
      rocketsRef.current = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (!active || !burst || reduceMotion) {
      stopAndClear();
      return;
    }

    const syncCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (
        canvas.width !== Math.floor(width * dpr) ||
        canvas.height !== Math.floor(height * dpr)
      ) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const spawnRadialBurst = (
      ox: number,
      oy: number,
      count: number,
      speedMin: number,
      speedMax: number,
      paletteIndex: number,
      ringRadius = 110
    ) => {
      const palette =
        FIREWORK_PALETTES[paletteIndex % FIREWORK_PALETTES.length];

      ringsRef.current.push({
        x: ox,
        y: oy,
        radius: 6,
        maxRadius: ringRadius,
        alpha: 0.9,
        color: palette[0],
        lineWidth: 3.2,
      });

      for (let i = 0; i < count; i++) {
        const baseAngle = (Math.PI * 2 * i) / count;
        const angleJitter = (Math.random() - 0.5) * 0.24;
        const angle = baseAngle + angleJitter;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        const color = palette[i % palette.length];
        const kindRoll = Math.random();
        const kind: FireworkParticle['kind'] =
          kindRoll > 0.72 ? 'star' : kindRoll > 0.35 ? 'comet' : 'spark';

        particlesRef.current.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: kind === 'star' ? 4.2 + Math.random() * 2.2 : 2.3 + Math.random() * 2,
          color,
          alpha: 1,
          decay: 0.65 + Math.random() * 0.45,
          gravity: 190 + Math.random() * 70,
          drag: 0.968,
          kind,
          twinklePhase: Math.random() * Math.PI * 2,
          trail: [],
          maxTrail: kind === 'comet' ? 4 : 2,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 5,
        });
      }
    };

    const launchOutwardRocket = (
      ox: number,
      oy: number,
      angleDeg: number,
      speed: number,
      flightSeconds: number,
      paletteIndex: number
    ) => {
      const rad = (angleDeg * Math.PI) / 180;
      const palette =
        FIREWORK_PALETTES[paletteIndex % FIREWORK_PALETTES.length];
      rocketsRef.current.push({
        x: ox,
        y: oy,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        targetTime: flightSeconds,
        elapsed: 0,
        color: palette[0],
        trail: [],
      });
    };

    // Gelombang 1: Ledakan kembang api utama langsung dari titik tujuan (3) ke segala arah luar
    spawnRadialBurst(burst.x, burst.y, 28, 150, 390, 0, 128);
    spawnRadialBurst(burst.x, burst.y, 16, 90, 230, 1, 86);

    // Gelombang 2: Roket kecil meluncur keluar dari titik tujuan (3) lalu mekar di udara
    const t1 = window.setTimeout(() => {
      launchOutwardRocket(burst.x, burst.y, -128, 360, 0.34, 2);
      launchOutwardRocket(burst.x, burst.y, -52, 360, 0.34, 3);
    }, 110);

    const t2 = window.setTimeout(() => {
      launchOutwardRocket(burst.x, burst.y, -90, 420, 0.38, 4);
      launchOutwardRocket(burst.x, burst.y, -155, 310, 0.32, 0);
      launchOutwardRocket(burst.x, burst.y, -25, 310, 0.32, 1);
    }, 300);

    const t3 = window.setTimeout(() => {
      spawnRadialBurst(burst.x, burst.y, 22, 140, 330, 2, 105);
    }, 520);

    timeoutIdsRef.current.push(t1, t2, t3);

    let lastTime = performance.now();
    let rocketPaletteCursor = 2;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      // 1. Update & gambar gelombang cincin cahaya dari titik tujuan
      const nextRings: ShockwaveRing[] = [];
      for (const ring of ringsRef.current) {
        ring.radius += (ring.maxRadius - ring.radius) * Math.min(1, dt * 8.5);
        ring.alpha -= dt * 1.9;
        if (ring.alpha > 0.02) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ring.alpha);
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = ring.lineWidth * Math.max(0.3, ring.alpha);
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          nextRings.push(ring);
        }
      }
      ringsRef.current = nextRings;

      // 2. Update & gambar roket sekunder yang meluncur keluar dari titik tujuan (3)
      const nextRockets: SecondaryRocket[] = [];
      for (const rocket of rocketsRef.current) {
        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 5) rocket.trail.shift();

        rocket.x += rocket.vx * dt;
        rocket.y += rocket.vy * dt;
        rocket.vy += 120 * dt;
        rocket.elapsed += dt;

        // Gambar jejak ekor roket
        if (rocket.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = rocket.color;
          ctx.lineCap = 'round';
          for (let i = 1; i < rocket.trail.length; i++) {
            const p0 = rocket.trail[i - 1];
            const p1 = rocket.trail[i];
            const ratio = i / rocket.trail.length;
            ctx.globalAlpha = ratio * 0.85;
            ctx.lineWidth = ratio * 3.5;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Kepala roket bercahaya (halo ringan tanpa shadowBlur agar mulus di mobile GPU)
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = rocket.color;
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (rocket.elapsed >= rocket.targetTime) {
          const clampedX = Math.max(48, Math.min(width - 48, rocket.x));
          const clampedY = Math.max(48, Math.min(height - 48, rocket.y));
          spawnRadialBurst(
            clampedX,
            clampedY,
            20,
            110,
            290,
            rocketPaletteCursor++,
            94
          );
        } else {
          nextRockets.push(rocket);
        }
      }
      rocketsRef.current = nextRockets;

      // 3. Update & gambar partikel kembang api
      const nextParticles: FireworkParticle[] = [];
      const frameScale = dt * 60;
      for (const p of particlesRef.current) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrail) p.trail.shift();

        const dragFactor = Math.pow(p.drag, frameScale);
        p.vx *= dragFactor;
        p.vy = p.vy * dragFactor + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;
        p.twinklePhase += dt * 14;
        p.alpha -= p.decay * dt;

        if (p.alpha > 0.02) {
          const twinkle =
            p.alpha < 0.55
              ? 0.72 + 0.28 * Math.sin(p.twinklePhase)
              : 1;
          const renderAlpha = Math.max(0, Math.min(1, p.alpha * twinkle));

          // Jejak komet halus
          if (p.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = p.color;
            ctx.lineCap = 'round';
            for (let i = 1; i < p.trail.length; i++) {
              const prevPt = p.trail[i - 1];
              const currPt = p.trail[i];
              const ratio = i / p.trail.length;
              ctx.globalAlpha = renderAlpha * ratio * 0.6;
              ctx.lineWidth = Math.max(1, p.radius * ratio * 0.9);
              ctx.beginPath();
              ctx.moveTo(prevPt.x, prevPt.y);
              ctx.lineTo(currPt.x, currPt.y);
              ctx.stroke();
            }
            ctx.restore();
          }

          ctx.save();
          ctx.fillStyle = p.color;

          if (p.kind === 'star') {
            ctx.globalAlpha = renderAlpha * 0.25;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 1.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = renderAlpha;
            drawMiniStar(ctx, p.x, p.y, p.radius * 1.25, p.rotation);
          } else {
            ctx.globalAlpha = renderAlpha * 0.24;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 1.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = renderAlpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          nextParticles.push(p);
        }
      }
      particlesRef.current = nextParticles;

      const hasPendingWork =
        particlesRef.current.length > 0 ||
        ringsRef.current.length > 0 ||
        rocketsRef.current.length > 0 ||
        now - startPerf < 950;

      if (hasPendingWork) {
        rafIdRef.current = window.requestAnimationFrame(renderFrame);
      } else {
        rafIdRef.current = null;
        ctx.clearRect(0, 0, width, height);
      }
    };

    const startPerf = performance.now();
    rafIdRef.current = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      stopAndClear();
    };
  }, [active, burst, reduceMotion]);

  if (!active || reduceMotion) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] w-full h-full"
    />
  );
};
