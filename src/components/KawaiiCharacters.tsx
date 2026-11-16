import React, { useEffect, useId, useRef, useState } from 'react';

export type KawaiiCharacterKey =
  | 'deer'
  | 'rabbit'
  | 'cat'
  | 'bear'
  | 'fox'
  | 'hedgehog'
  | 'lion'
  | 'elephant'
  | 'giraffe'
  | 'zebra';

export type KawaiiMood = 'happy' | 'dizzy' | 'cheer';

type KawaiiCharacterIconProps = {
  character: KawaiiCharacterKey;
  mood?: KawaiiMood;
  isMoving?: boolean;
  moveTick?: number;
  reduceMotion?: boolean | null;
  alt?: string;
  className?: string;
};

const OUTLINE = '#5C3A21';

function KawaiiFaceFeatures({
  mood = 'happy',
  leftEyeX = 32,
  rightEyeX = 50,
  eyeY = 40,
  cheekY = 44,
  noseX = 41,
  noseY = 44,
  noseColor = '#7C4A2D',
  mouthY = 47,
  includeWhiskers = false,
}: {
  mood?: KawaiiMood;
  leftEyeX?: number;
  rightEyeX?: number;
  eyeY?: number;
  cheekY?: number;
  noseX?: number;
  noseY?: number;
  noseColor?: string;
  mouthY?: number;
  includeWhiskers?: boolean;
}) {
  return (
    <g>
      {/* Rona Pipi Pastel Menggemaskan */}
      <ellipse
        cx={leftEyeX - 5}
        cy={cheekY}
        rx="4.6"
        ry="2.8"
        fill="#FDA4AF"
        opacity="0.82"
      />
      <ellipse
        cx={rightEyeX + 5}
        cy={cheekY}
        rx="4.6"
        ry="2.8"
        fill="#FDA4AF"
        opacity="0.82"
      />

      {/* Mata Kawaii Dinamis Sesuai Ekspresi */}
      {mood === 'dizzy' ? (
        <g
          stroke={OUTLINE}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Mata kiri >< */}
          <path
            d={`M${leftEyeX - 3.5} ${eyeY - 2.8} L${leftEyeX + 2.2} ${eyeY} L${
              leftEyeX - 3.5
            } ${eyeY + 2.8}`}
          />
          {/* Mata kanan >< */}
          <path
            d={`M${rightEyeX + 3.5} ${eyeY - 2.8} L${rightEyeX - 2.2} ${eyeY} L${
              rightEyeX + 3.5
            } ${eyeY + 2.8}`}
          />
        </g>
      ) : mood === 'cheer' ? (
        <g
          stroke={OUTLINE}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        >
          {/* Mata senyum melengkung ^ ^ */}
          <path
            d={`M${leftEyeX - 3.8} ${eyeY + 1} Q${leftEyeX} ${
              eyeY - 4.2
            } ${leftEyeX + 3.8} ${eyeY + 1}`}
          />
          <path
            d={`M${rightEyeX - 3.8} ${eyeY + 1} Q${rightEyeX} ${
              eyeY - 4.2
            } ${rightEyeX + 3.8} ${eyeY + 1}`}
          />
        </g>
      ) : (
        <g>
          {/* Mata bulat berkilau dengan 2 highlight */}
          <circle cx={leftEyeX} cy={eyeY} r="3.9" fill="#3B2314" />
          <circle cx={leftEyeX - 1.2} cy={eyeY - 1.3} r="1.45" fill="#FFFFFF" />
          <circle cx={leftEyeX + 1.3} cy={eyeY + 1.2} r="0.7" fill="#FFFFFF" />

          <circle cx={rightEyeX} cy={eyeY} r="3.9" fill="#3B2314" />
          <circle cx={rightEyeX - 1.2} cy={eyeY - 1.3} r="1.45" fill="#FFFFFF" />
          <circle cx={rightEyeX + 1.3} cy={eyeY + 1.2} r="0.7" fill="#FFFFFF" />
        </g>
      )}

      {/* Hidung Mungil */}
      <ellipse cx={noseX} cy={noseY} rx="2.8" ry="2" fill={noseColor} />

      {/* Mulut Kawaii */}
      {mood === 'dizzy' ? (
        <path
          d={`M${noseX - 4.5} ${mouthY + 1.8} Q${noseX - 2.2} ${
            mouthY - 0.5
          } ${noseX} ${mouthY + 1.5} Q${noseX + 2.2} ${mouthY + 3.5} ${
            noseX + 4.5
          } ${mouthY + 1.2}`}
          stroke={OUTLINE}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      ) : mood === 'cheer' ? (
        <g>
          <path
            d={`M${noseX - 4.5} ${mouthY} Q${noseX} ${mouthY + 6.5} ${
              noseX + 4.5
            } ${mouthY} Z`}
            fill="#FB7185"
            stroke={OUTLINE}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d={`M${noseX - 5} ${mouthY - 0.2} Q${noseX - 2.4} ${
              mouthY + 2
            } ${noseX} ${mouthY - 0.4} Q${noseX + 2.4} ${mouthY + 2} ${
              noseX + 5
            } ${mouthY - 0.2}`}
            stroke={OUTLINE}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : (
        <path
          d={`M${noseX - 4.4} ${mouthY} Q${noseX - 2.1} ${
            mouthY + 2.7
          } ${noseX} ${mouthY - 0.2} Q${noseX + 2.1} ${mouthY + 2.7} ${
            noseX + 4.4
          } ${mouthY}`}
          stroke={OUTLINE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}

      {/* Kumis Kucing / Kelinci Lucu */}
      {includeWhiskers && (
        <g stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
          <path d={`M${leftEyeX - 10} ${cheekY - 2} L${leftEyeX - 15} ${cheekY - 3.5}`} />
          <path d={`M${leftEyeX - 10} ${cheekY + 1} L${leftEyeX - 15.5} ${cheekY + 1.5}`} />
          <path d={`M${rightEyeX + 10} ${cheekY - 2} L${rightEyeX + 15} ${cheekY - 3.5}`} />
          <path d={`M${rightEyeX + 10} ${cheekY + 1} L${rightEyeX + 15.5} ${cheekY + 1.5}`} />
        </g>
      )}
    </g>
  );
}

function renderCharacterArtwork(
  character: KawaiiCharacterKey,
  mood: KawaiiMood
): React.ReactNode {
  switch (character) {
    case 'deer':
      return (
        <>
          {/* Ekor imut di belakang */}
          <path
            d="M19 53C13 50 11 56 15 59C17 61 21 60 22 57Z"
            fill="#FFF4E2"
            stroke={OUTLINE}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Badan Chibi Rusa */}
          <ellipse
            cx="37"
            cy="58"
            rx="16"
            ry="13"
            fill="#F5A864"
            stroke={OUTLINE}
            strokeWidth="2.6"
          />
          {/* Perut cream lembut */}
          <ellipse cx="42" cy="59" rx="8.5" ry="9" fill="#FFF4E2" />
          {/* Kaki mungil dengan kuku coklat */}
          <rect x="26" y="64" width="7" height="9" rx="3.5" fill="#F5A864" stroke={OUTLINE} strokeWidth="2.4" />
          <rect x="26" y="69" width="7" height="4" rx="2" fill="#8D5B3C" stroke={OUTLINE} strokeWidth="2" />
          <rect x="42" y="64" width="7" height="9" rx="3.5" fill="#F5A864" stroke={OUTLINE} strokeWidth="2.4" />
          <rect x="42" y="69" width="7" height="4" rx="2" fill="#8D5B3C" stroke={OUTLINE} strokeWidth="2" />
          {/* Bintik manis di punggung */}
          <circle cx="27" cy="54" r="2.2" fill="#FFF4E2" opacity="0.9" />
          <circle cx="24" cy="59" r="1.7" fill="#FFF4E2" opacity="0.85" />

          {/* Telinga Kiri & Kanan */}
          <g>
            <ellipse
              cx="20"
              cy="28"
              rx="8.5"
              ry="5.5"
              transform="rotate(-24 20 28)"
              fill="#F5A864"
              stroke={OUTLINE}
              strokeWidth="2.5"
            />
            <ellipse
              cx="20.5"
              cy="28.5"
              rx="4.8"
              ry="2.8"
              transform="rotate(-24 20.5 28.5)"
              fill="#FBCFE8"
            />
            <ellipse
              cx="60"
              cy="28"
              rx="8.5"
              ry="5.5"
              transform="rotate(24 60 28)"
              fill="#F5A864"
              stroke={OUTLINE}
              strokeWidth="2.5"
            />
            <ellipse
              cx="59.5"
              cy="28.5"
              rx="4.8"
              ry="2.8"
              transform="rotate(24 59.5 28.5)"
              fill="#FBCFE8"
            />
          </g>

          {/* Tanduk Rusa Mini Lucu */}
          <path
            d="M30 22C28 16 25 13 26 10M29 17C32 14 33 12 32 10"
            stroke="#C98758"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M30 22C28 16 25 13 26 10M29 17C32 14 33 12 32 10"
            stroke={OUTLINE}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M50 22C52 16 55 13 54 10M51 17C48 14 47 12 48 10"
            stroke="#C98758"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M50 22C52 16 55 13 54 10M51 17C48 14 47 12 48 10"
            stroke={OUTLINE}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* Kepala Bulat Kawaii */}
          <ellipse
            cx="40"
            cy="37"
            rx="20"
            ry="17.5"
            fill="#F5A864"
            stroke={OUTLINE}
            strokeWidth="2.6"
          />
          {/* Bercak Wajah Cream Berbentuk Hati */}
          <path
            d="M40 31C35 26 24 29 24 39C24 47 31 53 40 53C49 53 56 47 56 39C56 29 45 26 40 31Z"
            fill="#FFF4E2"
          />
          {/* Kilau lembut dahi */}
          <ellipse cx="34" cy="24" rx="4.5" ry="1.8" fill="#FDE6C4" opacity="0.7" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32}
            rightEyeX={49}
            eyeY={39}
            cheekY={44}
            noseX={40.5}
            noseY={43.5}
            noseColor="#8D5B3C"
            mouthY={46.5}
          />
        </>
      );

    case 'rabbit':
      return (
        <>
          {/* Ekor kapas bulat */}
          <circle cx="20" cy="60" r="5.5" fill="#FFFFFF" stroke={OUTLINE} strokeWidth="2.3" />
          {/* Telinga Panjang Kawaii */}
          <ellipse cx="30" cy="18" rx="6" ry="14" transform="rotate(-10 30 18)" fill="#FFF9F5" stroke={OUTLINE} strokeWidth="2.5" />
          <ellipse cx="30.5" cy="18.5" rx="3.2" ry="9" transform="rotate(-10 30.5 18.5)" fill="#FBCFE8" />
          <ellipse cx="50" cy="18" rx="6" ry="14" transform="rotate(10 50 18)" fill="#FFF9F5" stroke={OUTLINE} strokeWidth="2.5" />
          <ellipse cx="49.5" cy="18.5" rx="3.2" ry="9" transform="rotate(10 49.5 18.5)" fill="#FBCFE8" />

          {/* Badan Chibi Kelinci */}
          <ellipse cx="40" cy="60" rx="15" ry="12" fill="#FFF9F5" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="41" cy="61" rx="8.5" ry="7.5" fill="#FFE4EE" opacity="0.75" />
          {/* Tangan & Kaki mungil */}
          <ellipse cx="29" cy="69" rx="5.5" ry="3.5" fill="#FFF9F5" stroke={OUTLINE} strokeWidth="2.3" />
          <ellipse cx="51" cy="69" rx="5.5" ry="3.5" fill="#FFF9F5" stroke={OUTLINE} strokeWidth="2.3" />

          {/* Kepala Bulat Kelinci */}
          <ellipse cx="40" cy="41" rx="19.5" ry="16" fill="#FFF9F5" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="33" cy="29" rx="5" ry="2" fill="#FFFFFF" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32}
            rightEyeX={49}
            eyeY={41}
            cheekY={45.5}
            noseX={40.5}
            noseY={44}
            noseColor="#F472B6"
            mouthY={47}
            includeWhiskers
          />
        </>
      );

    case 'cat':
      return (
        <>
          {/* Ekor melengkung lucu */}
          <path
            d="M23 62C13 62 10 51 17 47"
            stroke="#FDBA74"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M23 62C13 62 10 51 17 47"
            stroke={OUTLINE}
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Telinga Segitiga Kucing */}
          <path d="M22 33L20 14L35 24Z" fill="#FED7AA" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M23.5 29L22.5 18.5L31.5 24.5Z" fill="#FBCFE8" />
          <path d="M58 33L60 14L45 24Z" fill="#FED7AA" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M56.5 29L57.5 18.5L48.5 24.5Z" fill="#FBCFE8" />

          {/* Badan Chibi Kucing */}
          <ellipse cx="40" cy="59" rx="15.5" ry="12.5" fill="#FFEDD5" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="41" cy="60" rx="8.5" ry="8" fill="#FFFFFF" opacity="0.85" />
          {/* Lonceng Emas Mungil di Leher */}
          <circle cx="40.5" cy="54.5" r="3.4" fill="#FACC15" stroke={OUTLINE} strokeWidth="1.9" />
          <ellipse cx="30" cy="69" rx="5" ry="3.2" fill="#FFEDD5" stroke={OUTLINE} strokeWidth="2.3" />
          <ellipse cx="50" cy="69" rx="5" ry="3.2" fill="#FFEDD5" stroke={OUTLINE} strokeWidth="2.3" />

          {/* Kepala Bulat Kucing */}
          <ellipse cx="40" cy="38" rx="20.5" ry="17" fill="#FFEDD5" stroke={OUTLINE} strokeWidth="2.6" />
          {/* Garis belang tabby lembut di dahi */}
          <path d="M40 22V27M35 23L36.5 27.5M45 23L43.5 27.5" stroke="#EA8C3A" strokeWidth="2.6" strokeLinecap="round" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32}
            rightEyeX={49}
            eyeY={39}
            cheekY={43.5}
            noseX={40.5}
            noseY={42.5}
            noseColor="#FB7185"
            mouthY={45.5}
            includeWhiskers
          />
        </>
      );

    case 'bear':
      return (
        <>
          {/* Telinga Bulat Beruang */}
          <circle cx="22" cy="24" r="8" fill="#D9925A" stroke={OUTLINE} strokeWidth="2.6" />
          <circle cx="22.5" cy="24.5" r="4.2" fill="#FFE6C7" />
          <circle cx="58" cy="24" r="8" fill="#D9925A" stroke={OUTLINE} strokeWidth="2.6" />
          <circle cx="57.5" cy="24.5" r="4.2" fill="#FFE6C7" />

          {/* Badan Bulat Beruang */}
          <ellipse cx="40" cy="59" rx="17" ry="13" fill="#D9925A" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="40.5" cy="60" rx="10" ry="8.5" fill="#FFEAD1" />
          {/* Kaki Beruang dengan telapak cream */}
          <circle cx="28" cy="68" r="5" fill="#C47B43" stroke={OUTLINE} strokeWidth="2.3" />
          <circle cx="28" cy="68" r="2.2" fill="#FFEAD1" />
          <circle cx="52" cy="68" r="5" fill="#C47B43" stroke={OUTLINE} strokeWidth="2.3" />
          <circle cx="52" cy="68" r="2.2" fill="#FFEAD1" />

          {/* Kepala Bulat Beruang */}
          <ellipse cx="40" cy="38" rx="21" ry="18" fill="#D9925A" stroke={OUTLINE} strokeWidth="2.6" />
          {/* Moncong Cream Oval */}
          <ellipse cx="40.5" cy="44" rx="9" ry="7" fill="#FFF3E0" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={31}
            rightEyeX={50}
            eyeY={37.5}
            cheekY={42.5}
            noseX={40.5}
            noseY={41.5}
            noseColor="#5C3A21"
            mouthY={44.5}
          />
        </>
      );

    case 'fox':
      return (
        <>
          {/* Ekor Lebat Rubah dengan Ujung Putih */}
          <path
            d="M23 62C11 61 8 49 16 42C21 46 25 53 25 60Z"
            fill="#FB8542"
            stroke={OUTLINE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 42.5C12.5 45.5 11.5 50 13.5 52.5C16.5 52 19 49.5 19.5 46.5Z"
            fill="#FFF7ED"
          />

          {/* Telinga Runcing Besar */}
          <path d="M21 34L19 13L35 24Z" fill="#FB8542" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M22.5 29L21 17L31 24Z" fill="#FFF3E2" />
          <path d="M59 34L61 13L45 24Z" fill="#FB8542" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M57.5 29L59 17L49 24Z" fill="#FFF3E2" />

          {/* Badan Rubah */}
          <ellipse cx="40" cy="59" rx="15" ry="12.5" fill="#FB8542" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="41" cy="59" rx="8.5" ry="8.5" fill="#FFF7ED" />
          <ellipse cx="31" cy="69" rx="4.5" ry="3.2" fill="#5C3A21" />
          <ellipse cx="49" cy="69" rx="4.5" ry="3.2" fill="#5C3A21" />

          {/* Kepala Rubah */}
          <ellipse cx="40" cy="38" rx="20.5" ry="16.5" fill="#FB8542" stroke={OUTLINE} strokeWidth="2.6" />
          {/* Bercak Pipi Putih Lebar */}
          <path
            d="M20 40C20 48 29 54 40 54C51 54 60 48 60 40C54 38 48 42 40 44C32 42 26 38 20 40Z"
            fill="#FFF7ED"
          />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32}
            rightEyeX={49}
            eyeY={38}
            cheekY={43.5}
            noseX={40.5}
            noseY={43}
            noseColor="#4A2E1B"
            mouthY={46}
          />
        </>
      );

    case 'hedgehog':
      return (
        <>
          {/* Mahkota Duri Bulat Scalloped */}
          <path
            d="M16 47C12 42 13 33 19 30C19 22 26 16 34 18C38 13 46 13 50 18C58 17 64 23 63 31C68 35 68 44 63 49C65 56 59 64 51 64H28C20 64 14 56 16 47Z"
            fill="#9C6644"
            stroke={OUTLINE}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {/* Tekstur duri lembut */}
          <path d="M27 25L30 29M41 21V26M54 26L51 30" stroke="#7F4F24" strokeWidth="2.4" strokeLinecap="round" />

          {/* Daun mungil manis di atas telinga */}
          <path
            d="M52 19C56 12 63 13 64 18C59 21 55 21 52 19Z"
            fill="#4ADE80"
            stroke="#15803D"
            strokeWidth="1.9"
          />

          {/* Telinga Bulat Mungil */}
          <circle cx="24" cy="36" r="5" fill="#FFE6C7" stroke={OUTLINE} strokeWidth="2.2" />
          <circle cx="57" cy="36" r="5" fill="#FFE6C7" stroke={OUTLINE} strokeWidth="2.2" />

          {/* Wajah & Perut Cream Chibi */}
          <ellipse cx="40.5" cy="49" rx="18" ry="16" fill="#FFF1DF" stroke={OUTLINE} strokeWidth="2.5" />

          {/* Kaki mungil */}
          <ellipse cx="30" cy="67" rx="5" ry="3.4" fill="#FDE6C4" stroke={OUTLINE} strokeWidth="2.2" />
          <ellipse cx="51" cy="67" rx="5" ry="3.4" fill="#FDE6C4" stroke={OUTLINE} strokeWidth="2.2" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32.5}
            rightEyeX={49}
            eyeY={44}
            cheekY={49}
            noseX={40.8}
            noseY={48}
            noseColor="#5C3A21"
            mouthY={51.5}
          />
        </>
      );

    case 'lion':
      return (
        <>
          {/* Ekor singa berjambul */}
          <path d="M23 61C14 61 11 53 16 49" stroke="#FBBF48" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="15" cy="48" r="4" fill="#EA8C1B" stroke={OUTLINE} strokeWidth="2" />

          {/* Badan Chibi Singa */}
          <ellipse cx="40" cy="60" rx="15" ry="12" fill="#FBBF48" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="40.5" cy="61" rx="8.5" ry="7.5" fill="#FEF3C7" />
          <ellipse cx="30" cy="69" rx="4.8" ry="3.2" fill="#FBBF48" stroke={OUTLINE} strokeWidth="2.3" />
          <ellipse cx="50" cy="69" rx="4.8" ry="3.2" fill="#FBBF48" stroke={OUTLINE} strokeWidth="2.3" />

          {/* Surai Awan Berombak Fluffy */}
          <path
            d="M40 12C45 12 49 15 51 18C56 16 61 20 60 26C65 28 66 35 62 39C65 44 62 50 56 50C54 55 47 57 43 54C39 58 32 56 29 51C23 52 18 46 21 40C16 37 16 30 21 27C19 21 24 16 30 18C32 14 36 12 40 12Z"
            fill="#F59E0B"
            stroke={OUTLINE}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />

          {/* Telinga Bulat */}
          <circle cx="24" cy="24" r="5.5" fill="#FBBF48" stroke={OUTLINE} strokeWidth="2.2" />
          <circle cx="24" cy="24" r="2.6" fill="#FEF3C7" />
          <circle cx="56" cy="24" r="5.5" fill="#FBBF48" stroke={OUTLINE} strokeWidth="2.2" />
          <circle cx="56" cy="24" r="2.6" fill="#FEF3C7" />

          {/* Wajah Singa Bulat */}
          <ellipse cx="40" cy="37" rx="16.5" ry="14.5" fill="#FDE047" stroke={OUTLINE} strokeWidth="2.4" />
          <ellipse cx="40.5" cy="42.5" rx="7.5" ry="5.8" fill="#FFFBEB" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32.5}
            rightEyeX={48.5}
            eyeY={36.5}
            cheekY={41.5}
            noseX={40.5}
            noseY={40.5}
            noseColor="#9A3412"
            mouthY={43.5}
          />
        </>
      );

    case 'elephant':
      return (
        <>
          {/* Telinga Lebar Pastel Biru & Pink */}
          <ellipse cx="19" cy="37" rx="12" ry="15" transform="rotate(-12 19 37)" fill="#93C5FD" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="19.5" cy="38" rx="7.2" ry="10" transform="rotate(-12 19.5 38)" fill="#FBCFE8" />
          <ellipse cx="61" cy="37" rx="12" ry="15" transform="rotate(12 61 37)" fill="#93C5FD" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="60.5" cy="38" rx="7.2" ry="10" transform="rotate(12 60.5 38)" fill="#FBCFE8" />

          {/* Badan Bulat Gajah */}
          <ellipse cx="40" cy="59" rx="16.5" ry="12.5" fill="#A5D8FF" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="40" cy="60" rx="9" ry="7.5" fill="#E0F2FE" />
          {/* Kaki Bulat dengan Kuku Putih */}
          <rect x="26" y="63" width="9" height="9.5" rx="4.5" fill="#A5D8FF" stroke={OUTLINE} strokeWidth="2.3" />
          <rect x="45" y="63" width="9" height="9.5" rx="4.5" fill="#A5D8FF" stroke={OUTLINE} strokeWidth="2.3" />
          <circle cx="30.5" cy="70.5" r="2" fill="#FFFFFF" />
          <circle cx="49.5" cy="70.5" r="2" fill="#FFFFFF" />

          {/* Kepala Bulat Gajah */}
          <ellipse cx="40" cy="37" rx="19" ry="17" fill="#A5D8FF" stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="34" cy="25" rx="5" ry="2" fill="#E0F2FE" />

          {/* Pipi & Mata */}
          <ellipse cx="26.5" cy="42" rx="4.4" ry="2.6" fill="#FDA4AF" opacity="0.85" />
          <ellipse cx="53.5" cy="42" rx="4.4" ry="2.6" fill="#FDA4AF" opacity="0.85" />

          {mood === 'dizzy' ? (
            <g stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
              <path d="M28 34L33 36.5L28 39" />
              <path d="M52 34L47 36.5L52 39" />
            </g>
          ) : mood === 'cheer' ? (
            <g stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M27.5 37.5Q31 33 34.5 37.5" />
              <path d="M45.5 37.5Q49 33 52.5 37.5" />
            </g>
          ) : (
            <g>
              <circle cx="31" cy="36.5" r="3.8" fill="#3B2314" />
              <circle cx="29.8" cy="35.3" r="1.4" fill="#FFFFFF" />
              <circle cx="49" cy="36.5" r="3.8" fill="#3B2314" />
              <circle cx="47.8" cy="35.3" r="1.4" fill="#FFFFFF" />
            </g>
          )}

          {/* Belalai Mungil Melengkung Ceria */}
          <path
            d="M37 40C37 49 41 53 47 50C50 48.5 50.5 44.5 48 43.5C46 42.5 44.5 45 45.5 46.5"
            stroke="#85C5F8"
            strokeWidth="7.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M36.5 40C36.5 49 41 53.5 47 50.5C50.5 48.8 51 44 48 43"
            stroke={OUTLINE}
            strokeWidth="2.3"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case 'giraffe':
      return (
        <>
          {/* Tanduk Kecil (Ossicones) Jerapah */}
          <path d="M32 21V13" stroke={OUTLINE} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="32" cy="11.5" r="3.5" fill="#D9823B" stroke={OUTLINE} strokeWidth="2.2" />
          <path d="M48 21V13" stroke={OUTLINE} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="48" cy="11.5" r="3.5" fill="#D9823B" stroke={OUTLINE} strokeWidth="2.2" />

          {/* Telinga Jerapah */}
          <ellipse cx="21" cy="27" rx="7.5" ry="4.5" transform="rotate(-18 21 27)" fill="#FDE073" stroke={OUTLINE} strokeWidth="2.4" />
          <ellipse cx="59" cy="27" rx="7.5" ry="4.5" transform="rotate(18 59 27)" fill="#FDE073" stroke={OUTLINE} strokeWidth="2.4" />

          {/* Badan & Leher Chibi Jerapah */}
          <path
            d="M27 68C27 56 31 48 33 44H47C49 48 53 56 53 68C53 71 50 72 46 72H34C30 72 27 71 27 68Z"
            fill="#FDE073"
            stroke={OUTLINE}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {/* Bintik-bintik Jerapah */}
          <circle cx="34" cy="59" r="3" fill="#D9823B" opacity="0.85" />
          <circle cx="45" cy="56" r="2.6" fill="#D9823B" opacity="0.85" />
          <circle cx="42" cy="65" r="2.8" fill="#D9823B" opacity="0.85" />

          {/* Kepala Bulat Jerapah */}
          <ellipse cx="40" cy="34" rx="18" ry="15.5" fill="#FDE073" stroke={OUTLINE} strokeWidth="2.6" />
          <circle cx="29" cy="26" r="2.4" fill="#D9823B" opacity="0.75" />
          <circle cx="51" cy="26" r="2.4" fill="#D9823B" opacity="0.75" />
          {/* Moncong Cream Hangat */}
          <ellipse cx="40" cy="42" rx="12" ry="7.5" fill="#FFF3D6" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32}
            rightEyeX={48}
            eyeY={33.5}
            cheekY={39}
            noseX={40}
            noseY={40.5}
            noseColor="#B45309"
            mouthY={43.5}
          />
        </>
      );

    case 'zebra':
      return (
        <>
          {/* Jambul Surai Zebra Bergaris */}
          <path
            d="M36 20C36 13 40 10 43 13C46 11 49 14 47 21Z"
            fill="#4A3B32"
            stroke={OUTLINE}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Telinga Zebra */}
          <ellipse cx="24" cy="24" rx="5.5" ry="8.5" transform="rotate(-20 24 24)" fill="#FFFDF9" stroke={OUTLINE} strokeWidth="2.4" />
          <ellipse cx="24.5" cy="24.5" rx="2.6" ry="5" transform="rotate(-20 24.5 24.5)" fill="#FBCFE8" />
          <ellipse cx="56" cy="24" rx="5.5" ry="8.5" transform="rotate(20 56 24)" fill="#FFFDF9" stroke={OUTLINE} strokeWidth="2.4" />
          <ellipse cx="55.5" cy="24.5" rx="2.6" ry="5" transform="rotate(20 55.5 24.5)" fill="#FBCFE8" />

          {/* Badan Chibi Zebra */}
          <ellipse cx="40" cy="59" rx="15" ry="12.5" fill="#FFFDF9" stroke={OUTLINE} strokeWidth="2.6" />
          {/* Garis Belang Badan */}
          <path d="M27 56C30 57 32 58 33 60M53 56C50 57 48 58 47 60M28 63H33M47 63H52" stroke="#4A3B32" strokeWidth="3" strokeLinecap="round" />
          {/* Kaki dengan kuku hitam */}
          <rect x="29" y="65" width="7" height="7.5" rx="3.2" fill="#4A3B32" stroke={OUTLINE} strokeWidth="2" />
          <rect x="44" y="65" width="7" height="7.5" rx="3.2" fill="#4A3B32" stroke={OUTLINE} strokeWidth="2" />

          {/* Kepala Zebra */}
          <ellipse cx="40" cy="37" rx="18.5" ry="16" fill="#FFFDF9" stroke={OUTLINE} strokeWidth="2.6" />
          {/* Garis Belang Kepala */}
          <path d="M40 21.5V27.5" stroke="#4A3B32" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M22.5 34L27 35M57.5 34L53 35" stroke="#4A3B32" strokeWidth="3" strokeLinecap="round" />
          {/* Moncong Pastel Pink-Cream */}
          <ellipse cx="40" cy="45" rx="11.5" ry="7" fill="#FFE4E6" />

          <KawaiiFaceFeatures
            mood={mood}
            leftEyeX={32}
            rightEyeX={48}
            eyeY={36}
            cheekY={41}
            noseX={40}
            noseY={43.5}
            noseColor="#4A3B32"
            mouthY={46.5}
          />
        </>
      );
  }
}

export const KawaiiCharacterIcon: React.FC<KawaiiCharacterIconProps> = ({
  character,
  mood = 'happy',
  isMoving = false,
  moveTick,
  reduceMotion = false,
  alt,
  className = 'w-full h-full',
}) => {
  const shouldReduce = Boolean(reduceMotion);
  const [isStepBouncing, setIsStepBouncing] = useState(false);
  const prevMoveTickRef = useRef<number>(moveTick ?? 0);

  useEffect(() => {
    const currentTick = moveTick ?? 0;
    if (currentTick > prevMoveTickRef.current && !shouldReduce) {
      prevMoveTickRef.current = currentTick;
      setIsStepBouncing(true);
      const timer = window.setTimeout(() => {
        setIsStepBouncing(false);
      }, 390);
      return () => window.clearTimeout(timer);
    }
    prevMoveTickRef.current = currentTick;
  }, [moveTick, shouldReduce]);

  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  const activeMoving = !shouldReduce && (Boolean(isMoving) || isStepBouncing);

  const bodyAnimClass = shouldReduce
    ? 'kawaii-char-body'
    : activeMoving
    ? 'kawaii-char-body kawaii-char-moving'
    : mood === 'dizzy'
    ? 'kawaii-char-body kawaii-char-dizzy'
    : mood === 'cheer'
    ? 'kawaii-char-body kawaii-char-cheer'
    : 'kawaii-char-body kawaii-char-idle';

  const shadowAnimClass = shouldReduce
    ? 'kawaii-char-shadow'
    : activeMoving
    ? 'kawaii-char-shadow kawaii-char-shadow-moving'
    : 'kawaii-char-shadow kawaii-char-shadow-idle';

  const stageKey = activeMoving
    ? `moving-${moveTick ?? 0}`
    : mood === 'dizzy'
    ? 'dizzy'
    : mood === 'cheer'
    ? 'cheer'
    : 'idle';

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={`kawaii-char-svg ${className}`}
      {...ariaProps}
    >
      {/* Bayangan tanah lembut agar pantulan saat bergerak terasa hidup */}
      <ellipse
        key={`shadow-${stageKey}`}
        cx="40"
        cy="74"
        rx="15"
        ry="3.2"
        fill="#451A03"
        opacity="0.14"
        className={shadowAnimClass}
      />
      <g key={stageKey} className={bodyAnimClass}>
        {renderCharacterArtwork(character, mood)}
      </g>
    </svg>
  );
};

type StoryAvatarProps = {
  speaking?: boolean;
  alt?: string;
  className?: string;
};

export const CompanionKawaiiAvatar: React.FC<StoryAvatarProps> = ({
  speaking = false,
  alt,
  className = 'w-full h-full',
}) => {
  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} {...ariaProps}>
      {/* Lapisan Belakang Hijab Pastel Krem Santun */}
      <path
        d="M22 46C22 25 33 14 48 14C63 14 74 25 74 46V68C74 74 68 78 60 79H36C28 78 22 74 22 68V46Z"
        fill="#F3DEC0"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Blazer Formal Pendamping Edukatif PAUD/RA */}
      <path
        d="M22 88C23 72 33 64 48 64C63 64 73 72 74 88H22Z"
        fill="#8D6E63"
        stroke={OUTLINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Blus Dalam Krem & Kerah Blazer */}
      <path d="M40 65L48 84L56 65Z" fill="#FFFDF9" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M34 66L44 82L48 79L40 65Z" fill="#6D4C41" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 66L52 82L48 79L56 65Z" fill="#6D4C41" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />

      {/* Drape Hijab Pastel Krem Membingkai Wajah dengan Santun */}
      <path
        d="M26 44C26 28 36 18 48 18C60 18 70 28 70 44C70 59 62 71 48 73C34 71 26 59 26 44Z"
        fill="#FFF3DB"
        stroke={OUTLINE}
        strokeWidth="2.6"
      />
      <path
        d="M32 61C38 68 58 68 64 61"
        stroke="#E2C499"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Wajah Kawaii Ramah & Menggemaskan */}
      <ellipse
        cx="48"
        cy="45"
        rx="16.5"
        ry="15.5"
        fill="#FFE6D5"
        stroke={OUTLINE}
        strokeWidth="2.4"
      />

      {/* Rona Pipi Pastel */}
      <ellipse cx="36.5" cy="48.5" rx="4.2" ry="2.4" fill="#FDA4AF" opacity="0.85" />
      <ellipse cx="59.5" cy="48.5" rx="4.2" ry="2.4" fill="#FDA4AF" opacity="0.85" />

      {/* Mata Kawaii Berbinar Ramah */}
      <circle cx="40.5" cy="43.5" r="3.4" fill="#3B2314" />
      <circle cx="39.4" cy="42.4" r="1.3" fill="#FFFFFF" />
      <circle cx="41.6" cy="44.6" r="0.65" fill="#FFFFFF" />

      <circle cx="55.5" cy="43.5" r="3.4" fill="#3B2314" />
      <circle cx="54.4" cy="42.4" r="1.3" fill="#FFFFFF" />
      <circle cx="56.6" cy="44.6" r="0.65" fill="#FFFFFF" />

      {/* Alis Lembut & Senyum Hangat */}
      <path d="M37.5 38.2Q40.5 36.8 43.2 38.2" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M52.8 38.2Q55.5 36.8 58.5 38.2" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />

      {speaking ? (
        <path
          d="M44 50.5Q48 56.5 52 50.5 Z"
          fill="#FB7185"
          stroke={OUTLINE}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M44 51Q48 54.5 52 51"
          stroke={OUTLINE}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* Tangan Melambai Ramah */}
      <circle cx="22" cy="74" r="5" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.2" />
    </svg>
  );
};

export const ZookeeperNaedieAvatar: React.FC<StoryAvatarProps> = ({
  speaking = false,
  alt,
  className = 'w-full h-full',
}) => {
  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} {...ariaProps}>
      {/* Kemeja Safari Khaki Penjaga Kebun Binatang */}
      <path
        d="M23 88C24 72 34 64 48 64C62 64 72 72 73 88H23Z"
        fill="#9C956B"
        stroke={OUTLINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Kerah Kemeja Safari & Lencana ZOO */}
      <path d="M39 65L48 75L57 65" fill="#7D7650" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="55" y="74" width="11" height="6.5" rx="2" fill="#FDE68A" stroke={OUTLINE} strokeWidth="1.6" />
      <circle cx="35" cy="76" r="4" fill="#86EFAC" stroke={OUTLINE} strokeWidth="1.6" />

      {/* Telinga */}
      <circle cx="29" cy="45" r="4.5" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2.3" />
      <circle cx="67" cy="45" r="4.5" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2.3" />

      {/* Kepala Pria Dewasa Bersih Tanpa Janggut/Kumis */}
      <ellipse
        cx="48"
        cy="44"
        rx="18.5"
        ry="16.5"
        fill="#FFE2C8"
        stroke={OUTLINE}
        strokeWidth="2.6"
      />
      {/* Rambut Hitam/Cokelat Tua Rapi Tanpa Uban */}
      <path
        d="M30 37C32 28 40 25 48 25C56 25 64 28 66 37C61 33 55 34 51 31C46 35 38 33 30 37Z"
        fill="#2D1E17"
        stroke={OUTLINE}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Topi Rimba / Safari Khaki */}
      <path
        d="M27 29C28 17 37 12 48 12C59 12 68 17 69 29H27Z"
        fill="#C8B486"
        stroke={OUTLINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M28 26H68" stroke="#6B5335" strokeWidth="3.8" />
      <ellipse
        cx="48"
        cy="29.5"
        rx="25"
        ry="5"
        fill="#D6C59A"
        stroke={OUTLINE}
        strokeWidth="2.5"
      />

      {/* Rona Pipi Ramah */}
      <ellipse cx="35.5" cy="49.5" rx="3.8" ry="2.2" fill="#FDA4AF" opacity="0.75" />
      <ellipse cx="60.5" cy="49.5" rx="3.8" ry="2.2" fill="#FDA4AF" opacity="0.75" />

      {/* Mata Ramah di Balik Kacamata */}
      <circle cx="40.5" cy="43.5" r="2.8" fill="#3B2314" />
      <circle cx="39.6" cy="42.6" r="1.1" fill="#FFFFFF" />
      <circle cx="55.5" cy="43.5" r="2.8" fill="#3B2314" />
      <circle cx="54.6" cy="42.6" r="1.1" fill="#FFFFFF" />

      {/* Kacamata Bingkai Persegi Membulat */}
      <rect
        x="34"
        y="39"
        width="12.5"
        height="9"
        rx="3"
        fill="#FFFFFF"
        fillOpacity="0.25"
        stroke="#3B2314"
        strokeWidth="2.2"
      />
      <rect
        x="49.5"
        y="39"
        width="12.5"
        height="9"
        rx="3"
        fill="#FFFFFF"
        fillOpacity="0.25"
        stroke="#3B2314"
        strokeWidth="2.2"
      />
      <path d="M46.5 43H49.5" stroke="#3B2314" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30.5 42.5L34 43M62 43L65.5 42.5" stroke="#3B2314" strokeWidth="2" strokeLinecap="round" />

      {/* Alis & Senyum Bersahabat (Wajah Bersih Tanpa Janggut/Kumis) */}
      <path d="M36.5 36.8Q40.5 35.2 44 36.8" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M52 36.8Q55.5 35.2 59.5 36.8" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />

      {speaking ? (
        <path
          d="M43.5 51.5Q48 57 52.5 51.5 Z"
          fill="#FB7185"
          stroke={OUTLINE}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M43.5 51.5Q48 55.2 52.5 51.5"
          stroke={OUTLINE}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

export const KindergartenChildAvatar: React.FC<{
  alt?: string;
  className?: string;
}> = ({ alt, className = 'w-full h-full' }) => {
  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} {...ariaProps}>
      {/* Baju Kaos TK Pastel Mint dengan Kerah Putih & Tali Ransel Kuning */}
      <path
        d="M24 88C25 73 34 65 48 65C62 65 71 73 72 88H24Z"
        fill="#6EE7B7"
        stroke={OUTLINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Kerah Bulat Putih */}
      <path
        d="M39 66Q48 73 57 66"
        fill="#FFFFFF"
        stroke={OUTLINE}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tali Ransel Study Tour Netral */}
      <path d="M33 67L35 88" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M63 67L61 88" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round" />

      {/* Telinga Mungil */}
      <circle cx="29" cy="48" r="4.5" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.3" />
      <circle cx="67" cy="48" r="4.5" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.3" />

      {/* Rambut Pendek Bulat Netral di Sisi */}
      <path
        d="M28 45C28 31 36 24 48 24C60 24 68 31 68 45C65 41 62 39 59 38H37C34 39 31 41 28 45Z"
        fill="#784B2A"
        stroke={OUTLINE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Wajah Anak TK Kawaii */}
      <ellipse
        cx="48"
        cy="47"
        rx="17.5"
        ry="16"
        fill="#FFE6D5"
        stroke={OUTLINE}
        strokeWidth="2.5"
      />

      {/* Poni Rambut Lembut di Dahi (Gender-Neutral) */}
      <path
        d="M32 39C35 34 40 33 44 37C47 33 52 33 55 37C59 33 62 35 64 39C59 34 37 34 32 39Z"
        fill="#784B2A"
        stroke={OUTLINE}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />

      {/* Topi TK Inklusif Pastel Biru-Kuning dengan Lencana Bintang */}
      <path
        d="M27 33C28 20 37 14 48 14C59 14 68 20 69 33H27Z"
        fill="#38BDF8"
        stroke={OUTLINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Garis Panel Topi & Kancing Atas */}
      <circle cx="48" cy="13.5" r="2.8" fill="#FACC15" stroke={OUTLINE} strokeWidth="2" />
      {/* Visor / Lidah Topi Kuning Hangat */}
      <path
        d="M23 33C31 29.5 65 29.5 73 33C74 36 69 37.5 48 37.5C27 37.5 22 36 23 33Z"
        fill="#FACC15"
        stroke={OUTLINE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Lencana Bintang Kecil di Tengah Topi */}
      <path
        d="M48 19L49.7 22.4L53.4 22.9L50.7 25.5L51.3 29.2L48 27.4L44.7 29.2L45.3 25.5L42.6 22.9L46.3 22.4Z"
        fill="#FEF08A"
        stroke={OUTLINE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Rona Pipi Hangat */}
      <ellipse cx="36" cy="51.5" rx="4.2" ry="2.4" fill="#FDA4AF" opacity="0.85" />
      <ellipse cx="60" cy="51.5" rx="4.2" ry="2.4" fill="#FDA4AF" opacity="0.85" />

      {/* Mata Kawaii Berbinar Ramah */}
      <circle cx="40.5" cy="46.5" r="3.4" fill="#3B2314" />
      <circle cx="39.4" cy="45.4" r="1.3" fill="#FFFFFF" />
      <circle cx="41.6" cy="47.6" r="0.65" fill="#FFFFFF" />

      <circle cx="55.5" cy="46.5" r="3.4" fill="#3B2314" />
      <circle cx="54.4" cy="45.4" r="1.3" fill="#FFFFFF" />
      <circle cx="56.6" cy="47.6" r="0.65" fill="#FFFFFF" />

      {/* Alis & Senyum Ceria Statis */}
      <path d="M37.5 41.2Q40.5 39.8 43.2 41.2" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M52.8 41.2Q55.5 39.8 58.5 41.2" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M44 53.5Q48 57 52 53.5" stroke={OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
};

export const KindergartenChildrenGroupAvatar: React.FC<{
  alt?: string;
  className?: string;
}> = ({ alt, className = 'w-full h-full' }) => {
  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} {...ariaProps}>
      {/* --- ANAK 1 (Kiri Atas): Baju Coral Pastel & Cepol Rambut Ceria --- */}
      <g>
        {/* Baju */}
        <path
          d="M8 55C9 44 15 39 25 39C35 39 41 44 42 55H8Z"
          fill="#FDA4AF"
          stroke={OUTLINE}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M19 40Q25 45 31 40"
          fill="#FFFFFF"
          stroke={OUTLINE}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cepol Rambut Kiri & Kanan */}
        <circle cx="13" cy="14" r="4.8" fill="#6D4C41" stroke={OUTLINE} strokeWidth="2" />
        <circle cx="37" cy="14" r="4.8" fill="#6D4C41" stroke={OUTLINE} strokeWidth="2" />
        <circle cx="14.5" cy="16.5" r="2" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.2" />
        <circle cx="35.5" cy="16.5" r="2" fill="#FB7185" stroke={OUTLINE} strokeWidth="1.2" />

        {/* Telinga */}
        <circle cx="11.5" cy="27" r="3.2" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2" />
        <circle cx="38.5" cy="27" r="3.2" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2" />

        {/* Rambut & Kepala */}
        <path
          d="M11.5 25C11.5 15 17.5 10.5 25 10.5C32.5 10.5 38.5 15 38.5 25Z"
          fill="#6D4C41"
          stroke={OUTLINE}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <ellipse
          cx="25"
          cy="26"
          rx="13.2"
          ry="12.2"
          fill="#FFE6D5"
          stroke={OUTLINE}
          strokeWidth="2.2"
        />
        {/* Poni Lembut */}
        <path
          d="M13 21C16 16.5 21 15.5 25 18.5C29 15.5 34 16.5 37 21C32.5 18 17.5 18 13 21Z"
          fill="#6D4C41"
          stroke={OUTLINE}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Rona Pipi & Ekspresi */}
        <ellipse cx="16.8" cy="29.5" rx="3" ry="1.8" fill="#FDA4AF" opacity="0.85" />
        <ellipse cx="33.2" cy="29.5" rx="3" ry="1.8" fill="#FDA4AF" opacity="0.85" />
        <circle cx="19.8" cy="25.8" r="2.5" fill="#3B2314" />
        <circle cx="19" cy="25" r="0.95" fill="#FFFFFF" />
        <circle cx="30.2" cy="25.8" r="2.5" fill="#3B2314" />
        <circle cx="29.4" cy="25" r="0.95" fill="#FFFFFF" />
        <path d="M22.2 31.2Q25 33.8 27.8 31.2" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* --- ANAK 2 (Kanan Atas): Baju Biru Langit & Topi Kuning Hangat --- */}
      <g>
        {/* Baju */}
        <path
          d="M54 55C55 44 61 39 71 39C81 39 87 44 88 55H54Z"
          fill="#7DD3FC"
          stroke={OUTLINE}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M65 40Q71 45 77 40"
          fill="#FFFFFF"
          stroke={OUTLINE}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Telinga */}
        <circle cx="57.5" cy="27" r="3.2" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2" />
        <circle cx="84.5" cy="27" r="3.2" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2" />

        {/* Rambut & Kepala */}
        <path
          d="M57 25C57 15 63.5 11 71 11C78.5 11 85 15 85 25Z"
          fill="#4A3525"
          stroke={OUTLINE}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <ellipse
          cx="71"
          cy="26"
          rx="13.2"
          ry="12.2"
          fill="#FFE2C8"
          stroke={OUTLINE}
          strokeWidth="2.2"
        />
        {/* Poni */}
        <path
          d="M59 20.5C62 16 66.5 15.5 70 18C73.5 15.5 79 16 83 20.5C78 17.8 64 17.8 59 20.5Z"
          fill="#4A3525"
          stroke={OUTLINE}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Topi Kuning Pastel */}
        <path
          d="M56.5 17C57.5 8.5 63.5 5 71 5C78.5 5 84.5 8.5 85.5 17H56.5Z"
          fill="#FACC15"
          stroke={OUTLINE}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M54 17C60 14.5 82 14.5 88 17C88.5 19.2 84.5 20 71 20C57.5 20 53.5 19.2 54 17Z"
          fill="#FB923C"
          stroke={OUTLINE}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {/* Rona Pipi & Ekspresi */}
        <ellipse cx="62.8" cy="29.5" rx="3" ry="1.8" fill="#FDA4AF" opacity="0.85" />
        <ellipse cx="79.2" cy="29.5" rx="3" ry="1.8" fill="#FDA4AF" opacity="0.85" />
        <circle cx="65.8" cy="25.8" r="2.5" fill="#3B2314" />
        <circle cx="65" cy="25" r="0.95" fill="#FFFFFF" />
        <circle cx="76.2" cy="25.8" r="2.5" fill="#3B2314" />
        <circle cx="75.4" cy="25" r="0.95" fill="#FFFFFF" />
        <path d="M68.2 31.2Q71 33.8 73.8 31.2" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* --- ANAK 3 (Tengah Bawah / Depan): Baju Mint Pastel & Topi Biru-Kuning --- */}
      <g>
        {/* Baju Mint & Tali Ransel */}
        <path
          d="M27 91C28 78 35 72 48 72C61 72 68 78 69 91H27Z"
          fill="#6EE7B7"
          stroke={OUTLINE}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M40.5 73Q48 79 55.5 73"
          fill="#FFFFFF"
          stroke={OUTLINE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M35.5 74L37 91" stroke="#FBBF24" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M60.5 74L59 91" stroke="#FBBF24" strokeWidth="3.6" strokeLinecap="round" />

        {/* Telinga */}
        <circle cx="32.5" cy="61.5" r="3.6" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.1" />
        <circle cx="63.5" cy="61.5" r="3.6" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.1" />

        {/* Rambut Sisi & Kepala */}
        <path
          d="M32 59C32 48 39 42 48 42C57 42 64 48 64 59Z"
          fill="#784B2A"
          stroke={OUTLINE}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <ellipse
          cx="48"
          cy="60.5"
          rx="14.8"
          ry="13.5"
          fill="#FFE6D5"
          stroke={OUTLINE}
          strokeWidth="2.3"
        />
        {/* Poni */}
        <path
          d="M35 54C38 49.5 42 49 45 52C48 49 51 49 54 52C57 49 60 50.5 61 54C56.5 50.5 39.5 50.5 35 54Z"
          fill="#784B2A"
          stroke={OUTLINE}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />

        {/* Topi TK Biru Langit & Visor Kuning */}
        <path
          d="M31.5 49.5C32.5 39 39.5 34.5 48 34.5C56.5 34.5 63.5 39 64.5 49.5H31.5Z"
          fill="#38BDF8"
          stroke={OUTLINE}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="34" r="2.2" fill="#FACC15" stroke={OUTLINE} strokeWidth="1.7" />
        <path
          d="M28.5 49.5C35 46.8 61 46.8 67.5 49.5C68.2 52 64 53.2 48 53.2C32 53.2 27.8 52 28.5 49.5Z"
          fill="#FACC15"
          stroke={OUTLINE}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M48 38.5L49.3 41.1L52.2 41.5L50.1 43.5L50.6 46.4L48 45L45.4 46.4L45.9 43.5L43.8 41.5L46.7 41.1Z"
          fill="#FEF08A"
          stroke={OUTLINE}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Rona Pipi, Mata & Senyum */}
        <ellipse cx="38.2" cy="64.5" rx="3.4" ry="2" fill="#FDA4AF" opacity="0.85" />
        <ellipse cx="57.8" cy="64.5" rx="3.4" ry="2" fill="#FDA4AF" opacity="0.85" />
        <circle cx="41.8" cy="60" r="2.9" fill="#3B2314" />
        <circle cx="40.9" cy="59.1" r="1.1" fill="#FFFFFF" />
        <circle cx="54.2" cy="60" r="2.9" fill="#3B2314" />
        <circle cx="53.3" cy="59.1" r="1.1" fill="#FFFFFF" />
        <path d="M44.5 66.2Q48 69.4 51.5 66.2" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
};

type FullBodyLivingProps = {
  alt?: string;
  className?: string;
  animateLiving?: boolean;
  isSpeaking?: boolean;
  mouthOpen?: number;
  blinkDelaySec?: number;
  reduceMotion?: boolean;
  rightArmPose?: 'down' | 'wave';
};

export const ZookeeperNaedieFullBody: React.FC<FullBodyLivingProps> = ({
  alt,
  className = 'w-full h-full',
  animateLiving = false,
  isSpeaking = false,
  mouthOpen = 0,
  blinkDelaySec = 0,
  reduceMotion = false,
}) => {
  const mouthClipId = useId();
  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  const shouldAnimate = animateLiving && !reduceMotion;
  const open = animateLiving ? Math.min(1, Math.max(0, mouthOpen)) : 0;
  const mouthLeftX = 80.5 + open * 1.3;
  const mouthRightX = 99.5 - open * 1.3;
  const mouthTopY = 86.2 - open * 0.6;
  const mouthTopCtrlY = 86.4 + open * 0.5;
  const mouthBottomCtrlY = 87.8 + open * 16.5;
  const mouthPathD = `M${mouthLeftX.toFixed(2)} ${mouthTopY.toFixed(2)}Q90 ${mouthTopCtrlY.toFixed(2)} ${mouthRightX.toFixed(2)} ${mouthTopY.toFixed(2)}Q90 ${mouthBottomCtrlY.toFixed(2)} ${mouthLeftX.toFixed(2)} ${mouthTopY.toFixed(2)}Z`;

  return (
    <svg viewBox="0 0 180 280" fill="none" className={className} {...ariaProps}>
      {animateLiving && open > 0.03 && (
        <defs>
          <clipPath id={mouthClipId}>
            <path d={mouthPathD} />
          </clipPath>
        </defs>
      )}

      {/* Bayangan Pijakan Lembut */}
      <ellipse cx="90" cy="264" rx="44" ry="8" fill="#10B981" opacity="0.2" />

      {/* Celana Panjang Safari Khaki-Olive */}
      <rect
        x="67"
        y="192"
        width="19"
        height="46"
        rx="7"
        fill="#7E7952"
        stroke={OUTLINE}
        strokeWidth="3"
      />
      <rect
        x="94"
        y="192"
        width="19"
        height="46"
        rx="7"
        fill="#7E7952"
        stroke={OUTLINE}
        strokeWidth="3"
      />

      {/* Sepatu Bot Lapangan Cokelat */}
      <path
        d="M61 236C61 230 66 227 72 227H84C87 227 89 230 89 235V249C89 254 85 258 78 258H63C58 258 55 254 55 249C55 244 58 240 61 236Z"
        fill="#6D452B"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M57 252H87" stroke="#3E2723" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M91 235C91 230 93 227 96 227H108C114 227 119 230 119 236C122 240 125 244 125 249C125 254 122 258 117 258H102C95 258 91 254 91 249V235Z"
        fill="#6D452B"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M93 252H123" stroke="#3E2723" strokeWidth="3.5" strokeLinecap="round" />

      {/* Lengan Kiri & Kanan Berkacak Pinggang Ramah */}
      <path
        d="M54 128C41 140 42 158 54 170"
        stroke="#9C956B"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M54 128C41 140 42 158 54 170"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="54" cy="172" r="7" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2.5" />

      <path
        d="M126 128C139 140 138 158 126 170"
        stroke="#9C956B"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M126 128C139 140 138 158 126 170"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="126" cy="172" r="7" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2.5" />

      {/* Kemeja Safari Khaki dengan Kerah, Kantong, & Lencana */}
      <path
        d="M54 124C54 115 65 110 90 110C115 110 126 115 126 124L129 194C129 201 122 206 113 206H67C58 206 51 201 51 194L54 124Z"
        fill="#9C956B"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Bagian Atas Celana */}
      <path
        d="M52 178H128L129 196C129 203 122 208 112 208H96L90 194L84 208H68C58 208 51 203 51 196L52 178Z"
        fill="#7E7952"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Kerah Kemeja Safari & Garis Kancing Tengah */}
      <path d="M75 111L90 128L105 111" fill="#5A6B47" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M70 111L84 127L74 132L66 115Z" fill="#B5AE84" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M110 111L96 127L106 132L114 115Z" fill="#B5AE84" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M90 128V175" stroke={OUTLINE} strokeWidth="2.4" />

      {/* Saku Kemeja & Lencana ZOO */}
      <rect x="61" y="140" width="18" height="17" rx="3" fill="#8A835A" stroke={OUTLINE} strokeWidth="2.1" />
      <rect x="101" y="140" width="18" height="17" rx="3" fill="#8A835A" stroke={OUTLINE} strokeWidth="2.1" />
      <rect x="101" y="128" width="18" height="9" rx="2.5" fill="#FDE68A" stroke={OUTLINE} strokeWidth="1.9" />
      <circle cx="49" cy="136" r="5.5" fill="#86EFAC" stroke={OUTLINE} strokeWidth="1.8" />

      {/* Sabuk Fungsional & Gesper */}
      <rect x="51" y="174" width="78" height="10" rx="4" fill="#4A3525" stroke={OUTLINE} strokeWidth="2.5" />
      <rect x="83" y="172" width="14" height="14" rx="3" fill="#E2E8F0" stroke={OUTLINE} strokeWidth="2.2" />

      {/* Grup Kepala & Ekspresi (Mengangguk lembut saat berbicara) */}
      <g
        className={`prologue-head-group ${
          shouldAnimate && isSpeaking ? 'prologue-head-nod' : ''
        }`}
        style={{ transformOrigin: '90px 112px' }}
      >
        {/* Telinga */}
        <circle cx="52" cy="74" r="8" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2.8" />
        <circle cx="128" cy="74" r="8" fill="#FFE2C8" stroke={OUTLINE} strokeWidth="2.8" />

        {/* Kepala Pria Dewasa Bersih Tanpa Janggut/Kumis */}
        <ellipse
          cx="90"
          cy="73"
          rx="35"
          ry="31"
          fill="#FFE2C8"
          stroke={OUTLINE}
          strokeWidth="3"
        />

        {/* Rambut Cokelat Tua Rapi (Tanpa Uban) */}
        <path
          d="M55 61C58 43 73 37 90 37C107 37 122 43 125 61C116 53 105 56 95 49C84 57 69 53 55 61Z"
          fill="#2D1E17"
          stroke={OUTLINE}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/* Topi Rimba / Safari */}
        <path
          d="M49 46C51 22 68 13 90 13C112 13 129 22 131 46H49Z"
          fill="#C8B486"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M51 40H129" stroke="#6B5335" strokeWidth="6" />
        <ellipse
          cx="90"
          cy="47"
          rx="48"
          ry="9"
          fill="#D6C59A"
          stroke={OUTLINE}
          strokeWidth="2.8"
        />

        {/* Rona Pipi Ramah */}
        <ellipse cx="66" cy="83" rx="6.5" ry="3.6" fill="#FDA4AF" opacity="0.75" />
        <ellipse cx="114" cy="83" rx="6.5" ry="3.6" fill="#FDA4AF" opacity="0.75" />

        {/* Mata dengan Kedipan Natural (Di Balik Kacamata) */}
        <g
          className={shouldAnimate ? 'prologue-eye-blink' : undefined}
          style={
            shouldAnimate
              ? {
                  transformOrigin: '90px 72px',
                  animationDelay: `${blinkDelaySec}s`,
                }
              : undefined
          }
        >
          <circle cx="75" cy="72" r="4.5" fill="#3B2314" />
          <circle cx="73.5" cy="70.5" r="1.8" fill="#FFFFFF" />
          <circle cx="105" cy="72" r="4.5" fill="#3B2314" />
          <circle cx="103.5" cy="70.5" r="1.8" fill="#FFFFFF" />
        </g>

        {/* Kelopak Mata Warna Kulit Natural (#FFE2C8) */}
        {shouldAnimate && (
          <g
            className="prologue-eyelid-blink"
            style={{
              transformOrigin: '90px 66.8px',
              animationDelay: `${blinkDelaySec}s`,
            }}
          >
            <rect x="69" y="66.8" width="12" height="10.4" rx="4" fill="#FFE2C8" />
            <rect x="99" y="66.8" width="12" height="10.4" rx="4" fill="#FFE2C8" />
            <path d="M70 76.5Q75 78 80 76.5" stroke="#3B2314" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M100 76.5Q105 78 110 76.5" stroke="#3B2314" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}

        {/* Kacamata Khas Pak Naedie */}
        <rect
          x="63"
          y="64"
          width="23"
          height="16"
          rx="4.5"
          fill="#FFFFFF"
          fillOpacity="0.22"
          stroke="#3B2314"
          strokeWidth="3"
        />
        <rect
          x="94"
          y="64"
          width="23"
          height="16"
          rx="4.5"
          fill="#FFFFFF"
          fillOpacity="0.22"
          stroke="#3B2314"
          strokeWidth="3"
        />
        <path d="M86 71H94" stroke="#3B2314" strokeWidth="3" strokeLinecap="round" />
        <path d="M56 70L63 71M117 71L124 70" stroke="#3B2314" strokeWidth="2.6" strokeLinecap="round" />

        {/* Alis */}
        <path d="M67 59Q75 56 82 59" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M98 59Q105 56 113 59" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />

        {/* Mulut Lip-Sync Dinamis atau Senyum Ramah */}
        {!animateLiving ? (
          <path
            d="M80 86Q90 95 100 86Z"
            fill="#FB7185"
            stroke={OUTLINE}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        ) : open <= 0.03 ? (
          <path
            d="M80 87Q90 93.5 100 87"
            fill="none"
            stroke={OUTLINE}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ) : (
          <g>
            <path d={mouthPathD} fill="#9F1239" />
            {open > 0.22 && (
              <ellipse
                cx="90"
                cy={90.2 + open * 3.2}
                rx={4.2 + open * 1.4}
                ry={1.5 + open * 1.8}
                fill="#FB7185"
                clipPath={`url(#${mouthClipId})`}
              />
            )}
            <path
              d={mouthPathD}
              fill="none"
              stroke={OUTLINE}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
    </svg>
  );
};

const quadBlend = (p0: number, pMid: number, p1: number, u: number): number => {
  const inv = 1 - u;
  return inv * inv * p0 + 2 * inv * u * pMid + u * u * p1;
};

export const CompanionTeacherFullBody: React.FC<FullBodyLivingProps> = ({
  alt,
  className = 'w-full h-full',
  animateLiving = false,
  isSpeaking = false,
  mouthOpen = 0,
  blinkDelaySec = -1.75,
  reduceMotion = false,
  rightArmPose = 'wave',
}) => {
  const mouthClipId = useId();
  const targetArmLift = rightArmPose === 'wave' ? 1 : 0;
  const [armLift, setArmLift] = useState<number>(targetArmLift);
  const armLiftRef = useRef<number>(targetArmLift);

  useEffect(() => {
    if (reduceMotion) {
      armLiftRef.current = targetArmLift;
      setArmLift(targetArmLift);
      return;
    }

    const startValue = armLiftRef.current;
    if (Math.abs(startValue - targetArmLift) < 0.005) {
      armLiftRef.current = targetArmLift;
      setArmLift(targetArmLift);
      return;
    }

    let rafId: number | null = null;
    const durationMs = 480;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, Math.max(0, elapsed / durationMs));
      // Smooth cubic ease-in-out
      const eased =
        rawT < 0.5
          ? 4 * rawT * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      const next = startValue + (targetArmLift - startValue) * eased;
      armLiftRef.current = next;
      setArmLift(next);

      if (rawT < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [targetArmLift, reduceMotion]);

  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  const shouldAnimate = animateLiving && !reduceMotion;
  const open = animateLiving ? Math.min(1, Math.max(0, mouthOpen)) : 0;
  const mouthLeftX = 81.5 + open * 1.2;
  const mouthRightX = 98.5 - open * 1.2;
  const mouthTopY = 85.4 - open * 0.5;
  const mouthTopCtrlY = 85.6 + open * 0.4;
  const mouthBottomCtrlY = 87 + open * 15.8;
  const mouthPathD = `M${mouthLeftX.toFixed(2)} ${mouthTopY.toFixed(2)}Q90 ${mouthTopCtrlY.toFixed(2)} ${mouthRightX.toFixed(2)} ${mouthTopY.toFixed(2)}Q90 ${mouthBottomCtrlY.toFixed(2)} ${mouthLeftX.toFixed(2)} ${mouthTopY.toFixed(2)}Z`;

  // Interpolasi kurva lengan kanan karakter (sisi kiri SVG) dari turun tenang (0) ke melambai ramah (1)
  const u = armLift;
  const armC1X = quadBlend(44, 26.5, 39, u);
  const armC1Y = quadBlend(146, 130.5, 121, u);
  const armC2X = quadBlend(44, 2.5, 31, u);
  const armC2Y = quadBlend(164, 127.5, 105, u);
  const armEndX = quadBlend(52, -27.5, 35, u);
  const armEndY = quadBlend(178, 127, 88, u);
  const handX = quadBlend(52, -31.5, 35, u);
  const handY = quadBlend(180, 126, 84, u);
  const handR = 7 + u * 1;
  const rightArmPathD = `M55 132C${armC1X.toFixed(2)} ${armC1Y.toFixed(2)} ${armC2X.toFixed(2)} ${armC2Y.toFixed(2)} ${armEndX.toFixed(2)} ${armEndY.toFixed(2)}`;

  return (
    <svg
      viewBox="0 0 180 280"
      fill="none"
      overflow="visible"
      className={className}
      {...ariaProps}
    >
      {animateLiving && open > 0.03 && (
        <defs>
          <clipPath id={mouthClipId}>
            <path d={mouthPathD} />
          </clipPath>
        </defs>
      )}

      {/* Bayangan Pijakan Lembut */}
      <ellipse cx="90" cy="264" rx="44" ry="8" fill="#10B981" opacity="0.18" />

      {/* Sepatu Formal Pendamping */}
      <path
        d="M64 246C64 240 69 237 76 237H84C87 237 89 241 89 247V253C89 256 85 258 78 258H66C61 258 59 255 59 251C59 249 61 247 64 246Z"
        fill="#4E342E"
        stroke={OUTLINE}
        strokeWidth="2.8"
      />
      <path
        d="M91 247C91 241 93 237 96 237H104C111 237 116 240 116 246C119 247 121 249 121 251C121 255 119 258 114 258H102C95 258 91 256 91 253V247Z"
        fill="#4E342E"
        stroke={OUTLINE}
        strokeWidth="2.8"
      />

      {/* Rok Panjang Formal Santun */}
      <path
        d="M58 175H122L130 242C130 246 123 249 112 249H68C57 249 50 246 50 242L58 175Z"
        fill="#7D6354"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Lengan Kanan Karakter (Turun tenang saat mendengarkan, terangkat melambai saat berbicara) */}
      <path
        d={rightArmPathD}
        stroke="#8D6E63"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d={rightArmPathD}
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx={handX}
        cy={handY}
        r={handR}
        fill="#FFE6D5"
        stroke={OUTLINE}
        strokeWidth="2.55"
      />

      {/* Lengan Kanan Santun di Samping */}
      <path
        d="M125 132C136 146 136 164 128 178"
        stroke="#8D6E63"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M125 132C136 146 136 164 128 178"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="128" cy="180" r="7" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.5" />

      {/* Blazer Formal Pendamping Edukatif PAUD/RA */}
      <path
        d="M56 122C56 114 67 110 90 110C113 110 124 114 124 122L127 184C127 190 120 194 111 194H69C60 194 53 190 53 184L56 122Z"
        fill="#8D6E63"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Blus Dalam Krem & Kerah Blazer Formal */}
      <path d="M77 118L90 156L103 118Z" fill="#FFFDF9" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M68 118L85 156L90 150L77 118Z" fill="#6D4C41" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M112 118L95 156L90 150L103 118Z" fill="#6D4C41" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="90" cy="164" r="3" fill="#4E342E" />
      <circle cx="90" cy="176" r="3" fill="#4E342E" />

      {/* Grup Kepala, Hijab & Ekspresi (Mengangguk lembut saat berbicara) */}
      <g
        className={`prologue-head-group ${
          shouldAnimate && isSpeaking ? 'prologue-head-nod' : ''
        }`}
        style={{ transformOrigin: '90px 116px' }}
      >
        {/* Hijab Santun Pastel/Krem Menutupi Dada */}
        <path
          d="M44 74C44 37 63 20 90 20C117 20 136 37 136 74V110C136 122 124 132 106 135H74C56 132 44 122 44 110V74Z"
          fill="#F3DEC0"
          stroke={OUTLINE}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M50 74C50 43 67 26 90 26C113 26 130 43 130 74C130 103 115 126 90 129C65 126 50 103 50 74Z"
          fill="#FFF3DB"
          stroke={OUTLINE}
          strokeWidth="2.8"
        />
        <path d="M62 109C74 121 106 121 118 109" stroke="#E2C499" strokeWidth="2.6" strokeLinecap="round" />

        {/* Wajah Kawaii Ibu Guru */}
        <ellipse
          cx="90"
          cy="75"
          rx="30"
          ry="28"
          fill="#FFE6D5"
          stroke={OUTLINE}
          strokeWidth="2.8"
        />

        {/* Rona Pipi Pastel */}
        <ellipse cx="69" cy="82" rx="7.2" ry="4" fill="#FDA4AF" opacity="0.88" />
        <ellipse cx="111" cy="82" rx="7.2" ry="4" fill="#FDA4AF" opacity="0.88" />

        {/* Mata Kawaii Berbinar Ramah dengan Kedipan Natural */}
        <g
          className={shouldAnimate ? 'prologue-eye-blink' : undefined}
          style={
            shouldAnimate
              ? {
                  transformOrigin: '90px 73px',
                  animationDelay: `${blinkDelaySec}s`,
                }
              : undefined
          }
        >
          <circle cx="76" cy="73" r="5.6" fill="#3B2314" />
          <circle cx="74" cy="71" r="2.1" fill="#FFFFFF" />
          <circle cx="78" cy="75" r="1" fill="#FFFFFF" />

          <circle cx="104" cy="73" r="5.6" fill="#3B2314" />
          <circle cx="102" cy="71" r="2.1" fill="#FFFFFF" />
          <circle cx="106" cy="75" r="1" fill="#FFFFFF" />
        </g>

        {/* Kelopak Mata Warna Kulit Natural (#FFE6D5) */}
        {shouldAnimate && (
          <g
            className="prologue-eyelid-blink"
            style={{
              transformOrigin: '90px 66.8px',
              animationDelay: `${blinkDelaySec}s`,
            }}
          >
            <rect x="69.5" y="66.8" width="13" height="12.4" rx="5" fill="#FFE6D5" />
            <rect x="97.5" y="66.8" width="13" height="12.4" rx="5" fill="#FFE6D5" />
            <path d="M70 78.2Q76 80 82 78.2" stroke="#3B2314" strokeWidth="2" strokeLinecap="round" />
            <path d="M98 78.2Q104 80 110 78.2" stroke="#3B2314" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Alis Lembut */}
        <path d="M70 63Q76 60.5 82 63" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M98 63Q104 60.5 110 63" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />

        {/* Mulut Lip-Sync Dinamis atau Senyum Ramah */}
        {!animateLiving ? (
          <path
            d="M81 85Q90 93 99 85Z"
            fill="#FB7185"
            stroke={OUTLINE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : open <= 0.03 ? (
          <path
            d="M81.5 86Q90 92 98.5 86"
            fill="none"
            stroke={OUTLINE}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : (
          <g>
            <path d={mouthPathD} fill="#9F1239" />
            {open > 0.22 && (
              <ellipse
                cx="90"
                cy={89.2 + open * 3}
                rx={4 + open * 1.3}
                ry={1.4 + open * 1.7}
                fill="#FB7185"
                clipPath={`url(#${mouthClipId})`}
              />
            )}
            <path
              d={mouthPathD}
              fill="none"
              stroke={OUTLINE}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
    </svg>
  );
};

export const KindergartenChildFullBody: React.FC<{
  alt?: string;
  className?: string;
}> = ({ alt, className = 'w-full h-full' }) => {
  const ariaProps = alt
    ? ({ role: 'img', 'aria-label': alt } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg viewBox="0 0 180 280" fill="none" className={className} {...ariaProps}>
      {/* Bayangan Pijakan Lembut */}
      <ellipse cx="90" cy="264" rx="40" ry="8" fill="#10B981" opacity="0.2" />

      {/* Kaki & Kaus Kaki Putih Anak */}
      <rect
        x="68"
        y="204"
        width="16"
        height="34"
        rx="7"
        fill="#FFE6D5"
        stroke={OUTLINE}
        strokeWidth="2.8"
      />
      <rect
        x="96"
        y="204"
        width="16"
        height="34"
        rx="7"
        fill="#FFE6D5"
        stroke={OUTLINE}
        strokeWidth="2.8"
      />
      <rect
        x="67"
        y="224"
        width="18"
        height="16"
        rx="5"
        fill="#FFFFFF"
        stroke={OUTLINE}
        strokeWidth="2.5"
      />
      <rect
        x="95"
        y="224"
        width="18"
        height="16"
        rx="5"
        fill="#FFFFFF"
        stroke={OUTLINE}
        strokeWidth="2.5"
      />

      {/* Sepatu Kets Ceria Merah-Putih */}
      <path
        d="M60 242C60 236 65 233 72 233H84C87 233 89 236 89 241V251C89 255 85 258 78 258H62C57 258 55 254 55 250C55 246 57 243 60 242Z"
        fill="#FB7185"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path d="M56 253H88" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M91 241C91 236 93 233 96 233H108C115 233 120 236 120 242C123 243 125 246 125 250C125 254 123 258 118 258H102C95 258 91 255 91 251V241Z"
        fill="#FB7185"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path d="M92 253H124" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />

      {/* Lengan Kiri & Kanan Anak Melambai Ceria */}
      <path
        d="M57 140C42 128 35 112 40 96"
        stroke="#FDE047"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M57 140C42 128 35 112 40 96"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="40" cy="92" r="8" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.6" />

      <path
        d="M123 140C136 150 138 166 130 180"
        stroke="#FDE047"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M123 140C136 150 138 166 130 180"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="130" cy="182" r="7.5" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.6" />

      {/* Kaos Kuning Cerah di Dalam Baju Kodok */}
      <path
        d="M56 126C56 116 68 112 90 112C112 112 124 116 124 126L126 184H54L56 126Z"
        fill="#FDE047"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Kerah Putih Bulat Manis */}
      <path
        d="M72 115C77 124 85 125 90 119C95 125 103 124 108 115"
        fill="#FFFFFF"
        stroke={OUTLINE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Baju Kodok (Overalls) Denim Biru Petualang Kecil */}
      <path
        d="M66 116H76V142H104V116H114V152L122 204C122 209 116 212 108 212H94L90 194L86 212H72C64 212 58 209 58 204L66 152V116Z"
        fill="#38BDF8"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Kancing Emas Overalls & Saku Depan */}
      <circle cx="71" cy="136" r="3.2" fill="#FACC15" stroke={OUTLINE} strokeWidth="1.8" />
      <circle cx="109" cy="136" r="3.2" fill="#FACC15" stroke={OUTLINE} strokeWidth="1.8" />
      <rect
        x="76"
        y="156"
        width="28"
        height="22"
        rx="6"
        fill="#0284C7"
        stroke={OUTLINE}
        strokeWidth="2.2"
      />
      {/* Bintang Kecil di Saku Baju Kodok */}
      <path
        d="M90 160L91.8 163.8L96 164.4L93 167.3L93.7 171.4L90 169.4L86.3 171.4L87 167.3L84 164.4L88.2 163.8Z"
        fill="#FEF08A"
        stroke={OUTLINE}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Telinga Anak */}
      <circle cx="52" cy="80" r="8" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.6" />
      <circle cx="128" cy="80" r="8" fill="#FFE6D5" stroke={OUTLINE} strokeWidth="2.6" />

      {/* Wajah Bulat Anak Balita Ceria */}
      <ellipse
        cx="90"
        cy="78"
        rx="35"
        ry="31"
        fill="#FFE6D5"
        stroke={OUTLINE}
        strokeWidth="3"
      />

      {/* Poni Rambut Cokelat Lembut */}
      <path
        d="M58 64C63 54 73 52 81 60C87 52 96 52 103 60C110 52 117 55 122 64C112 54 68 54 58 64Z"
        fill="#784B2A"
        stroke={OUTLINE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Topi Petualang Anak Biru-Kuning dengan Lencana Bintang */}
      <path
        d="M50 52C52 27 69 16 90 16C111 16 128 27 130 52H50Z"
        fill="#38BDF8"
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="15" r="4.5" fill="#FACC15" stroke={OUTLINE} strokeWidth="2.2" />
      <path
        d="M44 52C58 45 122 45 136 52C138 58 128 60 90 60C52 60 42 58 44 52Z"
        fill="#FACC15"
        stroke={OUTLINE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M90 25L93 31.2L99.8 32.2L94.9 37L96 43.8L90 40.6L84 43.8L85.1 37L80.2 32.2L87 31.2Z"
        fill="#FEF08A"
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Rona Pipi Kemerahan */}
      <ellipse cx="67" cy="86" rx="7.5" ry="4.4" fill="#FDA4AF" opacity="0.88" />
      <ellipse cx="113" cy="86" rx="7.5" ry="4.4" fill="#FDA4AF" opacity="0.88" />

      {/* Mata Kawaii Besar Berbinar */}
      <circle cx="75" cy="77" r="6" fill="#3B2314" />
      <circle cx="73" cy="74.8" r="2.3" fill="#FFFFFF" />
      <circle cx="77.2" cy="79.2" r="1.1" fill="#FFFFFF" />

      <circle cx="105" cy="77" r="6" fill="#3B2314" />
      <circle cx="103" cy="74.8" r="2.3" fill="#FFFFFF" />
      <circle cx="107.2" cy="79.2" r="1.1" fill="#FFFFFF" />

      {/* Alis & Senyum Lebar Anak */}
      <path d="M69 66Q75 63.5 81 66" stroke={OUTLINE} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M99 66Q105 63.5 111 66" stroke={OUTLINE} strokeWidth="2.3" strokeLinecap="round" />
      <path
        d="M80 88Q90 98 100 88Z"
        fill="#FB7185"
        stroke={OUTLINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
};
