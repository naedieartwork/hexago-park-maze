import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type WeatherKind = 'leaves' | 'fireflies';

type LeafSeed = {
  id: number;
  leftPct: number;
  size: number;
  swayX: number;
  duration: number;
  delay: number;
  startRotate: number;
  color: string;
  opacity: number;
};

type FireflySeed = {
  id: number;
  leftPct: number;
  topPct: number;
  size: number;
  driftX: number;
  driftY: number;
  duration: number;
  pulseDuration: number;
  delay: number;
  color: string;
};

type CloudSeed = {
  id: number;
  topPct: number;
  width: number;
  opacity: number;
  duration: number;
  delay: number;
  bobY: number;
  staticLeftPct: number;
};

const CLOUD_SEEDS: CloudSeed[] = [
  { id: 1, topPct: 4, width: 196, opacity: 0.72, duration: 48, delay: -12, bobY: 6, staticLeftPct: 10 },
  { id: 2, topPct: 13, width: 142, opacity: 0.56, duration: 38, delay: -27, bobY: -5, staticLeftPct: 68 },
  { id: 3, topPct: 23, width: 224, opacity: 0.46, duration: 58, delay: -41, bobY: 7, staticLeftPct: 38 },
  { id: 4, topPct: 8, width: 162, opacity: 0.64, duration: 44, delay: -4, bobY: -6, staticLeftPct: 82 },
];

const LEAF_SEEDS: LeafSeed[] = [
  { id: 1, leftPct: 7, size: 18, swayX: 24, duration: 9.5, delay: -2.1, startRotate: 15, color: '#34D399', opacity: 0.72 },
  { id: 2, leftPct: 16, size: 15, swayX: -20, duration: 11.2, delay: -6.4, startRotate: 80, color: '#F59E0B', opacity: 0.65 },
  { id: 3, leftPct: 26, size: 19, swayX: 28, duration: 10.4, delay: -4.2, startRotate: 140, color: '#10B981', opacity: 0.68 },
  { id: 4, leftPct: 36, size: 15, swayX: -18, duration: 8.8, delay: -1.5, startRotate: 220, color: '#FBBF24', opacity: 0.7 },
  { id: 5, leftPct: 47, size: 18, swayX: 22, duration: 11.8, delay: -8.3, startRotate: 45, color: '#6EE7B7', opacity: 0.64 },
  { id: 6, leftPct: 58, size: 16, swayX: -26, duration: 9.8, delay: -3.7, startRotate: 190, color: '#D97706', opacity: 0.6 },
  { id: 7, leftPct: 68, size: 20, swayX: 22, duration: 11.4, delay: -7.1, startRotate: 300, color: '#34D399', opacity: 0.72 },
  { id: 8, leftPct: 77, size: 15, swayX: -22, duration: 9.2, delay: -0.9, startRotate: 110, color: '#F59E0B', opacity: 0.66 },
  { id: 9, leftPct: 86, size: 18, swayX: 24, duration: 10.9, delay: -5.5, startRotate: 25, color: '#10B981', opacity: 0.68 },
  { id: 10, leftPct: 94, size: 15, swayX: -20, duration: 9.4, delay: -2.8, startRotate: 250, color: '#FBBF24', opacity: 0.7 },
];

const FIREFLY_SEEDS: FireflySeed[] = [
  { id: 1, leftPct: 8, topPct: 16, size: 16, driftX: 24, driftY: -18, duration: 5.2, pulseDuration: 2.6, delay: 0.1, color: '#FDE047' },
  { id: 2, leftPct: 18, topPct: 36, size: 18, driftX: -20, driftY: 22, duration: 6.1, pulseDuration: 3.1, delay: 0.8, color: '#BEF264' },
  { id: 3, leftPct: 11, topPct: 68, size: 15, driftX: 18, driftY: -22, duration: 4.9, pulseDuration: 2.3, delay: 0.4, color: '#FDE047' },
  { id: 4, leftPct: 26, topPct: 82, size: 17, driftX: -20, driftY: -16, duration: 5.8, pulseDuration: 2.9, delay: 1.2, color: '#FEF08A' },
  { id: 5, leftPct: 40, topPct: 14, size: 16, driftX: 22, driftY: 18, duration: 5.6, pulseDuration: 2.7, delay: 0.5, color: '#BEF264' },
  { id: 6, leftPct: 60, topPct: 12, size: 17, driftX: 20, driftY: 20, duration: 6.2, pulseDuration: 3.2, delay: 0.3, color: '#FEF08A' },
  { id: 7, leftPct: 76, topPct: 24, size: 18, driftX: -24, driftY: -18, duration: 5.4, pulseDuration: 2.8, delay: 1.1, color: '#BEF264' },
  { id: 8, leftPct: 89, topPct: 42, size: 16, driftX: -18, driftY: 22, duration: 5.9, pulseDuration: 2.5, delay: 0.7, color: '#FDE047' },
  { id: 9, leftPct: 91, topPct: 70, size: 17, driftX: -20, driftY: -20, duration: 5.1, pulseDuration: 3.0, delay: 1.4, color: '#FEF08A' },
  { id: 10, leftPct: 72, topPct: 82, size: 16, driftX: -18, driftY: 16, duration: 6.0, pulseDuration: 3.1, delay: 0.4, color: '#FEF08A' },
];

type ForestWeatherOverlayProps = {
  weather: WeatherKind;
  shouldReduceMotion: boolean;
};

export function ForestWeatherOverlay({
  weather,
  shouldReduceMotion,
}: ForestWeatherOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Lapisan Nuansa Langit Malam/Senja Lembut saat Mode Kunang-kunang */}
      <AnimatePresence>
        {weather === 'fireflies' && (
          <motion.div
            key="night-canopy-tint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-emerald-950/35 to-teal-950/40"
          />
        )}
      </AnimatePresence>

      {/* Efek Cuaca 1: Hujan Daun Gugur Perlahan */}
      <AnimatePresence mode="wait">
        {weather === 'leaves' ? (
          <motion.div
            key="weather-leaves"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {/* Awan Hutan Lembut Melintas Perlahan saat Cuaca Tidak Malam */}
            {CLOUD_SEEDS.map((cloud) =>
              shouldReduceMotion ? (
                <div
                  key={`cloud-${cloud.id}`}
                  style={{
                    top: `${cloud.topPct}%`,
                    left: `${cloud.staticLeftPct}%`,
                    width: cloud.width,
                    opacity: cloud.opacity * 0.85,
                  }}
                  className="absolute drop-shadow-[0_6px_12px_rgba(14,116,144,0.08)]"
                >
                  <svg
                    viewBox="0 0 180 84"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto"
                  >
                    <path
                      d="M34 68H146C160.359 68 172 56.3594 172 42C172 28.606 161.874 17.5758 148.862 16.1538C144.365 6.6098 134.651 0 123.4 0C114.664 0 106.855 3.9883 101.688 10.2449C96.364 5.1342 89.139 2 81.18 2C65.064 2 52 15.0643 52 31.18C52 32.0242 52.036 32.8602 52.106 33.6865C49.687 32.6009 47.005 32 44.18 32C33.035 32 24 41.0349 24 52.18C24 60.9163 28.477 68 34 68Z"
                      fill="#FFFFFF"
                      fillOpacity="0.92"
                    />
                    <path
                      d="M34 68H146C157.5 68 167.2 60.5 170.6 50.1C165.4 55.8 157.8 59.4 149.4 59.4H39.5C32.4 59.4 26.5 55.2 24.4 49.4C24.1 50.3 24 51.2 24 52.18C24 60.9163 28.477 68 34 68Z"
                      fill="#E0F2FE"
                      fillOpacity="0.72"
                    />
                  </svg>
                </div>
              ) : (
                <div
                  key={`cloud-${cloud.id}`}
                  style={
                    {
                      top: `${cloud.topPct}%`,
                      width: cloud.width,
                      animationDuration: `${cloud.duration}s`,
                      animationDelay: `${cloud.delay}s`,
                      '--cloud-opacity': cloud.opacity,
                      '--cloud-bob': `${cloud.bobY}px`,
                    } as React.CSSProperties
                  }
                  className="absolute gpu-cloud-drift"
                >
                  <svg
                    viewBox="0 0 180 84"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-auto"
                  >
                    <path
                      d="M34 68H146C160.359 68 172 56.3594 172 42C172 28.606 161.874 17.5758 148.862 16.1538C144.365 6.6098 134.651 0 123.4 0C114.664 0 106.855 3.9883 101.688 10.2449C96.364 5.1342 89.139 2 81.18 2C65.064 2 52 15.0643 52 31.18C52 32.0242 52.036 32.8602 52.106 33.6865C49.687 32.6009 47.005 32 44.18 32C33.035 32 24 41.0349 24 52.18C24 60.9163 28.477 68 34 68Z"
                      fill="#FFFFFF"
                      fillOpacity="0.92"
                    />
                    <path
                      d="M34 68H146C157.5 68 167.2 60.5 170.6 50.1C165.4 55.8 157.8 59.4 149.4 59.4H39.5C32.4 59.4 26.5 55.2 24.4 49.4C24.1 50.3 24 51.2 24 52.18C24 60.9163 28.477 68 34 68Z"
                      fill="#E0F2FE"
                      fillOpacity="0.72"
                    />
                  </svg>
                </div>
              )
            )}

            {LEAF_SEEDS.map((leaf) =>
              shouldReduceMotion ? (
                <div
                  key={leaf.id}
                  style={{
                    left: `${leaf.leftPct}%`,
                    top: `${12 + ((leaf.id * 13) % 72)}%`,
                    opacity: leaf.opacity * 0.7,
                  }}
                  className="absolute"
                >
                  <svg
                    width={leaf.size}
                    height={leaf.size}
                    viewBox="0 0 24 24"
                    fill={leaf.color}
                  >
                    <path d="M19 4C12 4 6 8.5 5 16C9.5 17 15.5 14 19 4ZM5 16C4.5 18 4.5 19.5 4.5 19.5" />
                  </svg>
                </div>
              ) : (
                <div
                  key={leaf.id}
                  style={
                    {
                      left: `${leaf.leftPct}%`,
                      animationDuration: `${leaf.duration}s`,
                      animationDelay: `${leaf.delay}s`,
                      '--sway-x': `${leaf.swayX}px`,
                      '--peak-opacity': leaf.opacity,
                    } as React.CSSProperties
                  }
                  className="absolute gpu-leaf-particle"
                >
                  <svg
                    width={leaf.size}
                    height={leaf.size}
                    viewBox="0 0 24 24"
                    fill={leaf.color}
                  >
                    <path d="M19 4C12 4 6 8.5 5 16C9.5 17 15.5 14 19 4Z" />
                  </svg>
                </div>
              )
            )}
          </motion.div>
        ) : (
          /* Efek Cuaca 2: Kunang-Kunang Malam Hutan */
          <motion.div
            key="weather-fireflies"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            {FIREFLY_SEEDS.map((fly) =>
              shouldReduceMotion ? (
                <div
                  key={fly.id}
                  style={{
                    left: `${fly.leftPct}%`,
                    top: `${fly.topPct}%`,
                    width: fly.size,
                    height: fly.size,
                    background: `radial-gradient(circle, ${fly.color} 0%, ${fly.color}aa 38%, rgba(253,224,71,0) 75%)`,
                    opacity: 0.78,
                  }}
                  className="absolute rounded-full"
                />
              ) : (
                <div
                  key={fly.id}
                  style={
                    {
                      left: `${fly.leftPct}%`,
                      top: `${fly.topPct}%`,
                      width: fly.size,
                      height: fly.size,
                      background: `radial-gradient(circle, ${fly.color} 0%, ${fly.color}bb 38%, rgba(253,224,71,0) 75%)`,
                      animationDuration: `${fly.duration}s`,
                      animationDelay: `${fly.delay}s`,
                      '--fly-x': `${fly.driftX}px`,
                      '--fly-y': `${fly.driftY}px`,
                    } as React.CSSProperties
                  }
                  className="absolute rounded-full gpu-firefly-particle"
                />
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
