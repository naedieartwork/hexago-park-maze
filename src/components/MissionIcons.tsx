import React from 'react';

export type CollectibleKind =
  | 'apple'
  | 'carrot'
  | 'fish'
  | 'honey'
  | 'berry'
  | 'mushroom'
  | 'crown'
  | 'banana'
  | 'leaf'
  | 'grass';

export type DestinationKind =
  | 'forest'
  | 'burrow'
  | 'cathouse'
  | 'cave'
  | 'treeden'
  | 'leafnest'
  | 'priderock'
  | 'oasis'
  | 'acacia'
  | 'savanna';

export type ObstacleKind =
  | 'bush'
  | 'fence'
  | 'puddle'
  | 'fallenlog'
  | 'rock'
  | 'twigs'
  | 'cactus'
  | 'bamboo'
  | 'stump'
  | 'stream';

type CollectibleIconProps = {
  kind: CollectibleKind;
  className?: string;
};

export const CollectibleIcon: React.FC<CollectibleIconProps> = ({
  kind,
  className = 'w-full h-full',
}) => {
  switch (kind) {
    case 'apple':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M32 18C32 12 35 8 39 7"
            stroke="#78350F"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M33 15C39 9 47 10 49 15C44 19 37 19 33 15Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2"
          />
          <path
            d="M32 19C24 16 14 21 14 33C14 46 23 56 30 56C32 56 32 54.5 32 54.5C32 54.5 32 56 34 56C41 56 50 46 50 33C50 21 40 16 32 19Z"
            fill="#FB7185"
            stroke="#9F1239"
            strokeWidth="2.4"
          />
          <ellipse cx="23" cy="29" rx="3.2" ry="5.5" transform="rotate(-18 23 29)" fill="#FFE4E6" opacity="0.75" />
          {/* Wajah kawaii mungil */}
          <circle cx="26.5" cy="36" r="2.2" fill="#4A2E1B" />
          <circle cx="25.8" cy="35.3" r="0.8" fill="#FFFFFF" />
          <circle cx="37.5" cy="36" r="2.2" fill="#4A2E1B" />
          <circle cx="36.8" cy="35.3" r="0.8" fill="#FFFFFF" />
          <ellipse cx="23.5" cy="39" rx="2.4" ry="1.4" fill="#FDA4AF" />
          <ellipse cx="40.5" cy="39" rx="2.4" ry="1.4" fill="#FDA4AF" />
          <path d="M29.5 39Q32 42 34.5 39" stroke="#4A2E1B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'carrot':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M38 14C42 7 49 7 49 12C45 15 41 16 38 14Z"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="2"
          />
          <path
            d="M42 20C49 14 56 17 53 23C49 25 44 24 42 20Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2"
          />
          <path
            d="M37 17C43 16 49 22 46 28L23 52C19 56 13 52 15 47L32 21C33.5 18.5 35 17.5 37 17Z"
            fill="#FB923C"
            stroke="#C2410C"
            strokeWidth="2.4"
          />
          <path d="M31 28L36 33" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M25 36L30 41" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="26" cy="31" rx="2.5" ry="5" transform="rotate(35 26 31)" fill="#FED7AA" opacity="0.75" />
        </svg>
      );

    case 'fish':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M47 32L57 22V42L47 32Z"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M27 18L34 11L37 19"
            fill="#7DD3FC"
            stroke="#0284C7"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <ellipse
            cx="30"
            cy="32"
            rx="19"
            ry="13"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="2.4"
          />
          <path d="M27 21C24 27 24 37 27 43" stroke="#BAE6FD" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="19" cy="29" r="3" fill="#FFFFFF" />
          <circle cx="18.5" cy="29" r="1.5" fill="#0F172A" />
          <ellipse cx="34" cy="26" rx="5" ry="2.2" fill="#E0F2FE" opacity="0.75" />
        </svg>
      );

    case 'honey':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <rect
            x="16"
            y="22"
            width="32"
            height="32"
            rx="12"
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="2.4"
          />
          <rect
            x="20"
            y="14"
            width="24"
            height="9"
            rx="4.5"
            fill="#FDE68A"
            stroke="#B45309"
            strokeWidth="2.2"
          />
          <path
            d="M20 24C24 28 28 29 31 24C34 29 39 30 44 25"
            fill="#FDE047"
            stroke="#D97706"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="32" cy="40" r="6" fill="#FEF3C7" opacity="0.85" />
          <path d="M32 36L35 40L32 44L29 40L32 36Z" fill="#D97706" />
        </svg>
      );

    case 'berry':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M26 17C29 10 35 10 38 17"
            stroke="#15803D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M22 18C27 13 37 13 42 18C37 22 27 22 22 18Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2"
          />
          <circle cx="25" cy="34" r="11" fill="#8B5CF6" stroke="#5B21B6" strokeWidth="2.2" />
          <circle cx="39" cy="34" r="11" fill="#A855F7" stroke="#6B21A8" strokeWidth="2.2" />
          <circle cx="32" cy="44" r="11" fill="#7C3AED" stroke="#5B21B6" strokeWidth="2.2" />
          <circle cx="22" cy="30" r="2.5" fill="#DDD6FE" opacity="0.8" />
          <circle cx="37" cy="30" r="2.5" fill="#EDE9FE" opacity="0.8" />
          <circle cx="29" cy="41" r="2.5" fill="#DDD6FE" opacity="0.8" />
        </svg>
      );

    case 'mushroom':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <rect
            x="24"
            y="34"
            width="16"
            height="20"
            rx="7"
            fill="#FEF3C7"
            stroke="#B45309"
            strokeWidth="2.4"
          />
          <path
            d="M12 36C12 22 21 13 32 13C43 13 52 22 52 36C52 38.5 49.5 40 46 40H18C14.5 40 12 38.5 12 36Z"
            fill="#FB7185"
            stroke="#BE123C"
            strokeWidth="2.4"
          />
          <circle cx="24" cy="25" r="4" fill="#FFF1F2" />
          <circle cx="39" cy="23" r="3.2" fill="#FFF1F2" />
          <circle cx="33" cy="31" r="2.8" fill="#FFF1F2" />
          {/* Wajah kawaii mungil di batang jamur */}
          <circle cx="28.5" cy="45" r="1.6" fill="#5C3A21" />
          <circle cx="35.5" cy="45" r="1.6" fill="#5C3A21" />
          <ellipse cx="26.5" cy="47.5" rx="1.8" ry="1.1" fill="#FDA4AF" />
          <ellipse cx="37.5" cy="47.5" rx="1.8" ry="1.1" fill="#FDA4AF" />
          <path d="M30.5 47.5Q32 49.5 33.5 47.5" stroke="#5C3A21" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'crown':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 46L10 22L23 32L32 16L41 32L54 22L52 46H12Z"
            fill="#FACC15"
            stroke="#B45309"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect
            x="12"
            y="45"
            width="40"
            height="8"
            rx="3.5"
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="2.4"
          />
          <circle cx="10" cy="20" r="3.5" fill="#FDE047" stroke="#B45309" strokeWidth="1.8" />
          <circle cx="32" cy="14" r="4" fill="#FB7185" stroke="#B45309" strokeWidth="1.8" />
          <circle cx="54" cy="20" r="3.5" fill="#FDE047" stroke="#B45309" strokeWidth="1.8" />
          <circle cx="32" cy="37" r="3" fill="#38BDF8" />
        </svg>
      );

    case 'banana':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M46 13C49 16 50 22 47 31C42 44 27 53 15 50C12 49 11 45 14 43C23 41 34 34 38 22C39.5 18 41 13 43 12C44.5 11.5 45.5 12 46 13Z"
            fill="#FDE047"
            stroke="#CA8A04"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M43 12L46 9"
            stroke="#78350F"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M22 45C31 43 39 36 42 26"
            stroke="#FEF9C3"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'leaf':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M15 48C15 26 29 13 51 13C51 35 38 49 15 48Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 52C22 42 32 32 43 21"
            stroke="#166534"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path d="M26 38L26 29" stroke="#166534" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M34 30L42 30" stroke="#166534" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'grass':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
          <path
            d="M17 50C15 36 12 27 10 22C16 25 21 33 23 50H17Z"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M27 50C27 33 29 20 33 13C36 22 37 35 36 50H27Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M40 50C42 36 46 27 53 20C50 29 48 39 46 50H40Z"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <ellipse cx="31.5" cy="51" rx="18" ry="4" fill="#86EFAC" stroke="#15803D" strokeWidth="2" />
        </svg>
      );
  }
};

type DestinationIconProps = {
  kind: DestinationKind;
  alt: string;
  className?: string;
};

export const DestinationIcon: React.FC<DestinationIconProps> = ({
  kind,
  alt,
  className = 'w-full h-full',
}) => {
  if (kind === 'forest') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
        {/* Rumput pastel dasar hutan */}
        <ellipse cx="40" cy="69" rx="30" ry="6" fill="#86EFAC" stroke="#15803D" strokeWidth="2" />
        {/* Pohon Cemara Belakang Kiri & Kanan */}
        <rect x="19" y="54" width="7" height="14" rx="3" fill="#B45309" stroke="#5C3A21" strokeWidth="2" />
        <path
          d="M22.5 18L8 40H15L6 57H39L30 40H37L22.5 18Z"
          fill="#6EE7B7"
          stroke="#15803D"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <rect x="54" y="54" width="7" height="14" rx="3" fill="#B45309" stroke="#5C3A21" strokeWidth="2" />
        <path
          d="M57.5 18L43 40H50L41 57H74L65 40H72L57.5 18Z"
          fill="#6EE7B7"
          stroke="#15803D"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        {/* Pohon Cemara Tengah Utama Kawaii */}
        <rect x="36" y="55" width="8" height="14" rx="3.5" fill="#C26D2D" stroke="#5C3A21" strokeWidth="2.2" />
        <path
          d="M40 10L23 32H31L18 48H28L16 61H64L52 48H62L49 32H57L40 10Z"
          fill="#4ADE80"
          stroke="#15803D"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Bintang kuning mungil di pucuk pohon */}
        <circle cx="40" cy="10" r="3.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.6" />
        {/* Wajah Kawaii Menggemaskan pada Pohon Cemara */}
        <circle cx="34.5" cy="41" r="2.2" fill="#14532D" />
        <circle cx="33.8" cy="40.3" r="0.8" fill="#FFFFFF" />
        <circle cx="45.5" cy="41" r="2.2" fill="#14532D" />
        <circle cx="44.8" cy="40.3" r="0.8" fill="#FFFFFF" />
        <ellipse cx="31" cy="44" rx="2.4" ry="1.4" fill="#FDA4AF" />
        <ellipse cx="49" cy="44" rx="2.4" ry="1.4" fill="#FDA4AF" />
        <path d="M37.5 44Q40 46.8 42.5 44" stroke="#14532D" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        {/* Bunga mini di bawah hutan */}
        <circle cx="17" cy="67" r="2.5" fill="#FB7185" />
        <circle cx="63" cy="67" r="2.5" fill="#FDE047" />
      </svg>
    );
  }

  switch (kind) {
    case 'burrow':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          {/* Gundukan tanah lembut */}
          <path
            d="M8 64C12 36 25 22 40 22C55 22 68 36 72 64C72 68 68 70 64 70H16C12 70 8 68 8 64Z"
            fill="#D97706"
            stroke="#92400E"
            strokeWidth="2.8"
          />
          <path
            d="M14 64C17 42 27 30 40 30C53 30 63 42 66 64H14Z"
            fill="#F59E0B"
            opacity="0.35"
          />
          {/* Pintu lubang persembunyian */}
          <path
            d="M25 69V50C25 41 31.5 35 40 35C48.5 35 55 41 55 50V69H25Z"
            fill="#451A03"
            stroke="#78350F"
            strokeWidth="2.5"
          />
          {/* Rumput & bunga kecil di atas lubang */}
          <path
            d="M29 24C28 17 31 13 33 11C34 16 35 20 35 23"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M42 23C43 17 46 14 49 12C48 17 47 21 46 24"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="61" r="3" fill="#4ADE80" />
          <circle cx="62" cy="61" r="3" fill="#4ADE80" />
        </svg>
      );

    case 'cathouse':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          {/* Telinga kucing di atap rumah */}
          <path d="M18 33L22 14L34 25Z" fill="#FB7185" stroke="#BE123C" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M62 33L58 14L46 25Z" fill="#FB7185" stroke="#BE123C" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Badan rumah kayu pastel */}
          <rect x="16" y="32" width="48" height="36" rx="10" fill="#FFE4E6" stroke="#E11D48" strokeWidth="2.5" />
          {/* Atap lengkung */}
          <path d="M12 36C22 20 58 20 68 36" stroke="#FB7185" strokeWidth="6" strokeLinecap="round" />
          {/* Pintu bantal hangat */}
          <path
            d="M28 68V49C28 42.5 33.4 37 40 37C46.6 37 52 42.5 52 49V68H28Z"
            fill="#9F1239"
          />
          <ellipse cx="40" cy="65" rx="10" ry="3.5" fill="#FDE047" />
        </svg>
      );

    case 'cave':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          <path
            d="M10 66C10 42 20 18 40 16C60 18 70 42 70 66C70 69 67 70 64 70H16C13 70 10 69 10 66Z"
            fill="#94A3B8"
            stroke="#475569"
            strokeWidth="2.8"
          />
          <path
            d="M18 38L28 24L39 30L52 22L61 38"
            stroke="#CBD5E1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 70V48C24 38 31 32 40 32C49 32 56 38 56 48V70H24Z"
            fill="#1E293B"
            stroke="#475569"
            strokeWidth="2.4"
          />
          <circle cx="17" cy="62" r="5" fill="#4ADE80" stroke="#15803D" strokeWidth="2" />
          <circle cx="63" cy="62" r="5" fill="#4ADE80" stroke="#15803D" strokeWidth="2" />
        </svg>
      );

    case 'treeden':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          {/* Batang pohon hangat */}
          <path
            d="M22 70L25 32H55L58 70H22Z"
            fill="#B45309"
            stroke="#78350F"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {/* Kanopi daun rindang */}
          <circle cx="25" cy="28" r="13" fill="#22C55E" stroke="#15803D" strokeWidth="2.2" />
          <circle cx="55" cy="28" r="13" fill="#22C55E" stroke="#15803D" strokeWidth="2.2" />
          <circle cx="40" cy="21" r="16" fill="#4ADE80" stroke="#15803D" strokeWidth="2.4" />
          {/* Lubang sarang di batang pohon */}
          <ellipse cx="40" cy="54" rx="10" ry="12" fill="#451A03" stroke="#78350F" strokeWidth="2.2" />
          <circle cx="38" cy="52" r="2.2" fill="#FDE047" />
        </svg>
      );

    case 'leafnest':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          <ellipse cx="40" cy="52" rx="28" ry="15" fill="#D97706" stroke="#92400E" strokeWidth="2.6" />
          <ellipse cx="40" cy="48" rx="22" ry="10" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <ellipse cx="40" cy="47" rx="15" ry="6" fill="#78350F" />
          <path
            d="M15 44C15 32 24 23 36 25C32 35 25 43 15 44Z"
            fill="#FB923C"
            stroke="#C2410C"
            strokeWidth="2"
          />
          <path
            d="M65 44C65 32 56 23 44 25C48 35 55 43 65 44Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="2"
          />
          <path
            d="M32 39C35 28 45 24 52 31C46 37 39 40 32 39Z"
            fill="#FACC15"
            stroke="#B45309"
            strokeWidth="2"
          />
        </svg>
      );

    case 'priderock':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          <circle cx="58" cy="20" r="9" fill="#FDE047" />
          <path
            d="M10 68L18 40H42L52 24L68 30L56 54L68 68H10Z"
            fill="#D97706"
            stroke="#92400E"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M18 40H42L52 24L66 29L48 44H16L18 40Z"
            fill="#FBBF24"
            opacity="0.7"
          />
          <path d="M22 68L26 52H42L46 68" fill="#B45309" />
        </svg>
      );

    case 'oasis':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          <ellipse cx="40" cy="56" rx="28" ry="13" fill="#FDE68A" stroke="#D97706" strokeWidth="2.2" />
          <ellipse cx="40" cy="56" rx="22" ry="9" fill="#38BDF8" stroke="#0284C7" strokeWidth="2.2" />
          <path d="M29 55C34 52 44 52 49 55" stroke="#BAE6FD" strokeWidth="2.2" strokeLinecap="round" />
          {/* Pohon palem di tepi danau */}
          <path d="M56 50C57 38 55 28 50 22" stroke="#92400E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M50 22C42 18 35 20 32 25C39 24 45 24 50 22Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.8" />
          <path d="M50 22C56 15 64 17 67 23C60 22 55 23 50 22Z" fill="#4ADE80" stroke="#15803D" strokeWidth="1.8" />
          <path d="M50 22C58 24 64 30 62 36C57 31 54 26 50 22Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.8" />
        </svg>
      );

    case 'acacia':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          <path
            d="M36 70V42M44 70V42M40 42L24 30M40 42L56 30"
            stroke="#92400E"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse cx="40" cy="24" rx="28" ry="11" fill="#22C55E" stroke="#15803D" strokeWidth="2.4" />
          <ellipse cx="26" cy="27" rx="14" ry="7" fill="#4ADE80" />
          <ellipse cx="54" cy="27" rx="14" ry="7" fill="#4ADE80" />
          <ellipse cx="40" cy="70" rx="18" ry="4" fill="#86EFAC" />
        </svg>
      );

    case 'savanna':
      return (
        <svg viewBox="0 0 80 80" fill="none" className={className} role="img" aria-label={alt}>
          <circle cx="40" cy="30" r="14" fill="#FDE047" stroke="#F59E0B" strokeWidth="2" />
          <path
            d="M8 58C20 44 36 44 48 54C56 46 66 47 72 58V68H8V58Z"
            fill="#84CC16"
            stroke="#4D7C0F"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M20 62C20 53 23 47 26 43C27 50 28 56 28 62"
            stroke="#15803D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M52 62C53 53 56 47 60 43C59 50 58 56 58 62"
            stroke="#15803D"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

type ObstacleIconProps = {
  kind: ObstacleKind;
  alt: string;
  className?: string;
};

export const ObstacleIcon: React.FC<ObstacleIconProps> = ({
  kind,
  alt,
  className = 'w-full h-full',
}) => {
  if (kind === 'bush') {
    return (
      <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
        {/* Batang kayu mungil */}
        <rect x="27" y="46" width="10" height="9" rx="4" fill="#B45309" stroke="#5C3A21" strokeWidth="2" />
        {/* Gumpalan semak 2D Kawaii */}
        <circle cx="20" cy="36" r="13" fill="#4ADE80" stroke="#15803D" strokeWidth="2.4" />
        <circle cx="44" cy="36" r="13" fill="#4ADE80" stroke="#15803D" strokeWidth="2.4" />
        <circle cx="32" cy="26" r="16" fill="#6EE7B7" stroke="#15803D" strokeWidth="2.4" />
        {/* Tutup garis sambung lembut di tengah */}
        <circle cx="32" cy="34" r="14" fill="#4ADE80" />
        <ellipse cx="26" cy="20" rx="5.5" ry="2.6" transform="rotate(-15 26 20)" fill="#D1FAE5" opacity="0.85" />
        {/* Bunga-bunga daisy kawaii di semak */}
        <circle cx="43" cy="27" r="4" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
        <circle cx="43" cy="27" r="1.5" fill="#F97316" />
        <circle cx="20" cy="39" r="3.6" fill="#FBCFE8" stroke="#DB2777" strokeWidth="1.5" />
        <circle cx="20" cy="39" r="1.4" fill="#FDE047" />
        {/* Wajah tersenyum lucu di semak */}
        <circle cx="28" cy="34" r="1.8" fill="#14532D" />
        <circle cx="36" cy="34" r="1.8" fill="#14532D" />
        <ellipse cx="25.5" cy="36.5" rx="2" ry="1.2" fill="#FDA4AF" />
        <ellipse cx="38.5" cy="36.5" rx="2" ry="1.2" fill="#FDA4AF" />
        <path d="M30 36.5Q32 39 34 36.5" stroke="#14532D" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  switch (kind) {
    case 'fence':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          {/* Palang horizontal */}
          <rect x="6" y="24" width="52" height="7" rx="3" fill="#D97706" stroke="#78350F" strokeWidth="2" />
          <rect x="6" y="40" width="52" height="7" rx="3" fill="#D97706" stroke="#78350F" strokeWidth="2" />
          {/* Tiga tiang pagar kayu bulat */}
          <path d="M12 52V20L18 12L24 20V52H12Z" fill="#F59E0B" stroke="#78350F" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M26 52V18L32 10L38 18V52H26Z" fill="#FBBF24" stroke="#78350F" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M40 52V20L46 12L52 20V52H40Z" fill="#F59E0B" stroke="#78350F" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Rumput kecil di dasar pagar */}
          <ellipse cx="32" cy="53" rx="22" ry="3.5" fill="#4ADE80" stroke="#15803D" strokeWidth="1.8" />
        </svg>
      );

    case 'puddle':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <path
            d="M12 37C10 29 19 23 30 24C39 20 53 25 53 35C55 44 45 50 32 49C19 50 13 44 12 37Z"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <ellipse cx="30" cy="36" rx="13" ry="6.5" fill="#7DD3FC" opacity="0.85" />
          <path d="M23 35C27 33 34 33 38 35" stroke="#E0F2FE" strokeWidth="2.4" strokeLinecap="round" />
          {/* Percikan air kecil di atas */}
          <path d="M24 19C24 16 26 14 26 14C26 14 28 16 28 19C28 20.5 27 21.5 26 21.5C25 21.5 24 20.5 24 19Z" fill="#7DD3FC" stroke="#0284C7" strokeWidth="1.6" />
          <path d="M40 17C40 14.5 41.5 13 41.5 13C41.5 13 43 14.5 43 17C43 18.2 42.3 19 41.5 19C40.7 19 40 18.2 40 17Z" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.5" />
        </svg>
      );

    case 'fallenlog':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <ellipse cx="32" cy="48" rx="22" ry="5" fill="#86EFAC" opacity="0.7" />
          <rect
            x="10"
            y="24"
            width="42"
            height="22"
            rx="10"
            fill="#B45309"
            stroke="#78350F"
            strokeWidth="2.4"
          />
          <path d="M18 30H34" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 39H29" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" />
          {/* Penampang lingkaran batang kayu */}
          <ellipse cx="47" cy="35" rx="7" ry="10.5" fill="#FDE68A" stroke="#78350F" strokeWidth="2.2" />
          <ellipse cx="47" cy="35" rx="3.2" ry="5.2" fill="none" stroke="#B45309" strokeWidth="1.8" />
          {/* Tunas daun mungil */}
          <path d="M27 24C27 18 31 14 35 15C34 20 31 23 27 24Z" fill="#4ADE80" stroke="#15803D" strokeWidth="1.8" />
        </svg>
      );

    case 'rock':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <path
            d="M11 48C10 34 18 18 33 17C46 16 54 30 53 47C53 50 50 52 47 52H17C13 52 11 50 11 48Z"
            fill="#94A3B8"
            stroke="#475569"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M18 38C18 28 24 22 33 21C40 21 44 26 46 33"
            stroke="#CBD5E1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="22" cy="48" rx="9" ry="4" fill="#4ADE80" stroke="#15803D" strokeWidth="1.8" />
          <ellipse cx="44" cy="49" rx="7" ry="3.5" fill="#22C55E" stroke="#15803D" strokeWidth="1.8" />
        </svg>
      );

    case 'twigs':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <path d="M12 44L52 24" stroke="#78350F" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M14 26L50 45" stroke="#92400E" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M18 49L46 19" stroke="#B45309" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M16 36H48" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
          {/* Daun kecil menempel di ranting */}
          <path d="M44 21C47 16 53 16 54 21C50 24 46 23 44 21Z" fill="#4ADE80" stroke="#15803D" strokeWidth="1.6" />
          <path d="M14 28C11 23 14 18 19 20C19 24 17 27 14 28Z" fill="#84CC16" stroke="#3F6212" strokeWidth="1.6" />
        </svg>
      );

    case 'cactus':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <ellipse cx="32" cy="53" rx="16" ry="4" fill="#FDE68A" stroke="#D97706" strokeWidth="1.8" />
          {/* Lengan kiri & kanan kaktus */}
          <path
            d="M26 36H19C16.2 36 14 33.8 14 31V24C14 21.8 15.8 20 18 20C20.2 20 22 21.8 22 24V29H26"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M38 33H45C47.8 33 50 30.8 50 28V22C50 19.8 48.2 18 46 18C43.8 18 42 19.8 42 22V26H38"
            fill="#22C55E"
            stroke="#15803D"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Batang utama kaktus */}
          <rect x="25" y="14" width="14" height="39" rx="7" fill="#4ADE80" stroke="#15803D" strokeWidth="2.4" />
          <path d="M32 19V25M32 42V48" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
          {/* Wajah kawaii kaktus */}
          <circle cx="29.5" cy="31" r="1.5" fill="#14532D" />
          <circle cx="34.5" cy="31" r="1.5" fill="#14532D" />
          <ellipse cx="27.8" cy="33.5" rx="1.6" ry="1" fill="#FDA4AF" />
          <ellipse cx="36.2" cy="33.5" rx="1.6" ry="1" fill="#FDA4AF" />
          <path d="M30.5 34Q32 35.8 33.5 34" stroke="#14532D" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          {/* Bunga kecil lucu di puncak kaktus */}
          <circle cx="32" cy="12" r="4" fill="#FB7185" stroke="#BE123C" strokeWidth="1.6" />
          <circle cx="32" cy="12" r="1.5" fill="#FDE047" />
        </svg>
      );

    case 'bamboo':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <ellipse cx="32" cy="53" rx="18" ry="4" fill="#86EFAC" stroke="#15803D" strokeWidth="1.8" />
          {/* Tiga batang bambu */}
          <rect x="16" y="16" width="8" height="36" rx="3" fill="#4ADE80" stroke="#15803D" strokeWidth="2.2" />
          <rect x="28" y="11" width="9" height="42" rx="3" fill="#22C55E" stroke="#15803D" strokeWidth="2.2" />
          <rect x="41" y="18" width="8" height="34" rx="3" fill="#4ADE80" stroke="#15803D" strokeWidth="2.2" />
          {/* Ruas bambu */}
          <path d="M16 28H24M16 40H24M28 24H37M28 37H37M41 30H49M41 42H49" stroke="#166534" strokeWidth="2.2" />
          {/* Daun bambu */}
          <path d="M28 16C22 12 16 14 14 19C20 20 25 19 28 16Z" fill="#86EFAC" stroke="#15803D" strokeWidth="1.6" />
          <path d="M37 15C43 11 49 12 51 17C45 18 40 18 37 15Z" fill="#86EFAC" stroke="#15803D" strokeWidth="1.6" />
        </svg>
      );

    case 'stump':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <ellipse cx="32" cy="52" rx="20" ry="5" fill="#86EFAC" stroke="#15803D" strokeWidth="1.8" />
          {/* Akar & badan tunggul pohon */}
          <path
            d="M14 50L20 24H44L50 50C45 52 39 51 32 51C25 51 19 52 14 50Z"
            fill="#B45309"
            stroke="#78350F"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M27 34V47M37 32V46" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" />
          {/* Permukaan atas tunggul */}
          <ellipse cx="32" cy="24" rx="13" ry="6" fill="#FDE68A" stroke="#78350F" strokeWidth="2.4" />
          <ellipse cx="32" cy="24" rx="6.5" ry="2.8" fill="none" stroke="#D97706" strokeWidth="1.8" />
        </svg>
      );

    case 'stream':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label={alt}>
          <path
            d="M10 18C18 14 26 22 34 18C42 14 49 18 54 22V48C46 52 38 44 30 48C22 52 15 48 10 44V18Z"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M16 28C22 25 28 31 35 28C41 25 45 27 49 30" stroke="#E0F2FE" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M15 39C21 36 27 42 34 39C40 36 45 38 49 41" stroke="#BAE6FD" strokeWidth="2.6" strokeLinecap="round" />
          {/* Batu kecil di tepi sungai */}
          <circle cx="15" cy="17" r="4" fill="#94A3B8" stroke="#475569" strokeWidth="1.8" />
          <circle cx="49" cy="48" r="4.5" fill="#94A3B8" stroke="#475569" strokeWidth="1.8" />
        </svg>
      );
  }
};

