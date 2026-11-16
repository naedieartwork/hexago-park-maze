import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CompanionKawaiiAvatar,
  KawaiiCharacterIcon,
  type KawaiiCharacterKey,
} from './KawaiiCharacters';
import {
  CollectibleIcon,
  DestinationIcon,
  type CollectibleKind,
  type DestinationKind,
} from './MissionIcons';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';

export const ANIMAL_TIPS_BY_CHARACTER: Record<KawaiiCharacterKey, string[]> = {
  deer: [
    'Fakta Rusa: Tanduk rusa bisa tumbuh kembali setiap tahun dan mereka pelari hutan yang sangat lincah!',
    'Tip Semangat: Rusa suka makan buah apel manis dan pucuk daun segar. Ayo melangkah dengan tenang!',
    'Fakta Rusa: Anak rusa memiliki bintik-bintik putih di punggungnya agar aman bersembunyi di bawah pohon!',
  ],
  rabbit: [
    'Fakta Kelinci: Telinga panjang kelinci bisa berputar untuk mendengar suara dari jauh di padang rumput!',
    'Tip Semangat: Gigi kelinci tidak pernah berhenti tumbuh, karena itu mereka suka mengunyah wortel renyah!',
    'Fakta Kelinci: Saat sangat senang, kelinci suka melompat sambil berputar di udara yang disebut binky!',
  ],
  cat: [
    'Fakta Kucing: Kumis kucing sangat peka dan membantu mereka mengukur lebar celah sebelum lewat!',
    'Tip Semangat: Kucing suka tempat yang hangat dan kering. Hindari genangan air agar bulunya tetap bersih!',
    'Fakta Kucing: Suara dengkuran halus kucing tandanya ia merasa aman, nyaman, dan bahagia!',
  ],
  bear: [
    'Fakta Beruang: Penciuman beruang sangat tajam, ia bisa mencium wangi madu manis dari jarak jauh!',
    'Tip Semangat: Meski tubuhnya besar, beruang pandai memanjat dan berenang. Ayo terus maju!',
    'Fakta Beruang: Beruang suka beristirahat di dalam gua yang hangat setelah kenyang makan madu!',
  ],
  fox: [
    'Fakta Rubah: Ekor rubah yang tebal dan lebat berfungsi seperti selimut hangat saat cuaca dingin!',
    'Tip Semangat: Rubah terkenal cerdik dan gesit mencari buah berry di balik bebatuan hutan!',
    'Fakta Rubah: Rubah bisa mendengar langkah hewan kecil di balik semak-semak dengan sangat jelas!',
  ],
  hedgehog: [
    'Fakta Landak: Saat terkejut, landak mungil menggulung tubuhnya menjadi bola berduri untuk melindungi diri!',
    'Tip Semangat: Landak aktif mencari jamur di sore dan malam hari. Perhatikan jalan di sela ranting ya!',
    'Fakta Landak: Duri landak sebenarnya adalah rambut yang mengeras dan tidak beracun!',
  ],
  lion: [
    'Fakta Singa: Surai tebal di leher singa membuatnya tampak gagah seperti memakai mahkota raja sabana!',
    'Tip Semangat: Singa suka mengawasi padang sabana dari atas batu tinggi. Langkahmu sudah hebat!',
    'Fakta Singa: Auman singa sangat lantang hingga bisa terdengar sampai beberapa kilometer jauhnya!',
  ],
  elephant: [
    'Fakta Gajah: Belalai gajah punya puluhan ribu otot sehingga bisa memegang pisang dengan sangat lembut!',
    'Tip Semangat: Gajah punya ingatan yang luar biasa kuat dan suka bermain air di danau segar!',
    'Fakta Gajah: Telinga lebar gajah dikibas-kibaskan untuk menyejukkan tubuhnya saat hari cerah!',
  ],
  giraffe: [
    'Fakta Jerapah: Leher panjang jerapah membantunya memetik daun akasia segar di puncak pohon tertinggi!',
    'Tip Semangat: Lidah jerapah panjangnya hampir setengah meter dan berwarna biru keunguan agar tahan sinar matahari!',
    'Fakta Jerapah: Pola bintik pada tubuh setiap jerapah unik seperti sidik jari manusia!',
  ],
  zebra: [
    'Fakta Zebra: Belang hitam-putih pada zebra unik untuk setiap ekor dan membantu menghalau serangga sabana!',
    'Tip Semangat: Zebra selalu hidup rukun berkelompok di padang rumput luas. Kamu hampir menamatkan semua level!',
    'Fakta Zebra: Zebra tidur sambil berdiri bersama teman-temannya agar selalu siap berlari kencang!',
  ],
};

export function pickLevelAnimalTip(
  characterKey: KawaiiCharacterKey,
  previousTip?: string
): string {
  const pool =
    ANIMAL_TIPS_BY_CHARACTER[characterKey] ?? ANIMAL_TIPS_BY_CHARACTER.deer;
  if (pool.length <= 1) return pool[0];
  const candidates = previousTip
    ? pool.filter((item) => item !== previousTip)
    : pool;
  const activePool = candidates.length > 0 ? candidates : pool;
  const randomIndex = Math.floor(Math.random() * activePool.length);
  return activePool[randomIndex];
}

type AppreciationDialogModalProps = {
  isOpen: boolean;
  level: number;
  playerName: string;
  companionName: string;
  characterKey: KawaiiCharacterKey;
  characterName: string;
  collectibleKind: CollectibleKind;
  collectibleName: string;
  totalCollectibles: number;
  destinationKind: DestinationKind;
  destinationName: string;
  levelTip: string;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onContinue: () => void;
};

const LEVEL_ENCOURAGEMENT_QUOTES: Record<
  number,
  (
    player: string,
    animal: string,
    item: string,
    count: number,
    dest: string
  ) => string
> = {
  1: (player, animal, item, count, dest) =>
    `Wah, hebat sekali ${player}! Semua ${count} ${item} segar sudah terkumpul untuk ${animal}. Sekarang pintunya sudah terbuka, ayo tuntun ${animal} masuk ke ${dest}!`,
  2: (player, animal, item, count, dest) =>
    `Pintar sekali ${player}! ${count} ${item} renyah sudah di tangan ${animal}. Yuk, sedikit lagi kita antar ${animal} pulang ke ${dest}!`,
  3: (player, animal, item, count, dest) =>
    `MasyaAllah, jeli sekali matamu ${player}! Semua ${count} ${item} kesukaan ${animal} sudah terkumpul. Ayo segera bawa ${animal} pulang ke ${dest}!`,
  4: (player, animal, item, count, dest) =>
    `Luar biasa ${player}! ${animal} senang sekali sudah dapat ${count} ${item} favoritnya. Sekarang arahkan langkahmu langsung ke ${dest}, ya!`,
  5: (player, animal, item, count, dest) =>
    `Keren banget ${player}! Semua ${count} ${item} lezat sudah berhasil kamu kumpulkan. Pintu ${dest} sudah terbuka lebar untuk ${animal}!`,
  6: (player, animal, item, count, dest) =>
    `Wah, pemberani sekali ${player}! ${count} ${item} sudah terkumpul lengkap. Ayo tuntun ${animal} dengan hati-hati sampai ke ${dest}!`,
  7: (player, animal, item, count, dest) =>
    `Cerdas sekali langkahmu ${player}! ${animal} sudah bangga membawa ${count} ${item}. Tinggal beberapa langkah lagi menuju ${dest}!`,
  8: (player, animal, item, count, dest) =>
    `Hore, kamu teliti sekali ${player}! Semua ${count} ${item} sudah aman bersama ${animal}. Yuk, langsung masuk ke ${dest} sebelum waktunya habis!`,
  9: (player, animal, item, count, dest) =>
    `Subhanallah, tangguh sekali ${player}! Di labirin malam ini semua ${count} ${item} berhasil kamu temukan. Ayo antar ${animal} ke ${dest}!`,
  10: (player, animal, item, count, dest) =>
    `Kebanggaan Ibu Guru! Semua ${count} ${item} di level terakhir sudah terkumpul, ${player}! Ayo tuntaskan petualangan ini dan bawa ${animal} ke ${dest}!`,
};

export const AppreciationDialogModal: React.FC<AppreciationDialogModalProps> = ({
  isOpen,
  level,
  playerName,
  companionName,
  characterKey,
  characterName,
  collectibleKind,
  collectibleName,
  totalCollectibles,
  destinationKind,
  destinationName,
  levelTip,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onContinue,
}) => {
  const cleanPlayer = playerName.trim() || 'Rusa Kecil';
  const cleanCompanion = companionName.trim() || 'Ibu Guru';

  const quoteBuilder =
    LEVEL_ENCOURAGEMENT_QUOTES[level] ?? LEVEL_ENCOURAGEMENT_QUOTES[1];
  const customMessage = quoteBuilder(
    cleanPlayer,
    characterName,
    collectibleName.toLowerCase(),
    totalCollectibles,
    destinationName
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="appreciation-dialog-title"
          aria-describedby="appreciation-dialog-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[68] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md select-none"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.9, y: 18 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 10 }
            }
            transition={{ type: 'spring', stiffness: 380, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-50 via-white to-emerald-50 border-3 border-white shadow-[0_24px_60px_rgba(15,23,42,0.3)] p-5 text-stone-800 overflow-hidden"
          >
            {/* Lencana Atas: Status Misi Item Selesai & Tujuan Terbuka */}
            <div className="flex items-center justify-center mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-extrabold tracking-wide shadow-xs">
                <span aria-hidden="true">🌟</span>
                <span>Semua {collectibleName} Terkumpul!</span>
                <span className="tabular-nums text-emerald-700">
                  ({totalCollectibles}/{totalCollectibles})
                </span>
              </span>
            </div>

            {/* Header Karakter Pendamping & Karakter Hewan */}
            <div className="flex items-center justify-center gap-3 mb-3">
              {/* Avatar Pendamping (Ibu/Guru) */}
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -4, 0], rotate: [0, -2, 2, 0] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: 'easeInOut',
                }}
                className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 via-amber-50 to-pink-100 border-2 border-rose-200 shadow-md flex items-center justify-center p-1.5 shrink-0"
              >
                <CompanionKawaiiAvatar
                  speaking
                  alt={`Avatar pendamping ${cleanCompanion}`}
                  className="w-full h-full drop-shadow-xs"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-extrabold shadow-xs"
                >
                  💖
                </span>
              </motion.div>

              {/* Ikon Panah Semangat */}
              <div className="flex flex-col items-center gap-1 text-amber-500">
                <span className="text-lg leading-none" aria-hidden="true">
                  ✨
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-200 p-1 flex items-center justify-center">
                  <CollectibleIcon kind={collectibleKind} />
                </div>
              </div>

              {/* Karakter Hewan & Tujuan yang Terbuka */}
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -5, 0], scale: [1, 1.04, 1] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.1,
                  ease: 'easeInOut',
                }}
                className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 via-sky-50 to-amber-100 border-2 border-emerald-200 shadow-md flex items-center justify-center p-2 shrink-0"
              >
                <KawaiiCharacterIcon
                  character={characterKey}
                  mood="cheer"
                  alt={`${characterName} gembira`}
                  className="w-full h-full drop-shadow-xs"
                />
                <div
                  title={`${destinationName} terbuka`}
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-white border-2 border-emerald-400 p-1 shadow-sm flex items-center justify-center"
                >
                  <DestinationIcon
                    kind={destinationKind}
                    alt={destinationName}
                    className="w-full h-full"
                  />
                </div>
              </motion.div>
            </div>

            {/* Judul & Nama Pendamping */}
            <div className="text-center mb-2.5">
              <p className="text-xs font-extrabold text-rose-600 tracking-wide">
                Pesan Penyemangat dari {cleanCompanion}
              </p>
              <h2
                id="appreciation-dialog-title"
                className="font-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight"
              >
                Kerja Bagus, {cleanPlayer}! 🎉
              </h2>
            </div>

            {/* Kotak Dialog Apresiasi Pesan Penyemangat Kustom */}
            <div className="relative rounded-2xl bg-white/95 border-2 border-amber-200/90 shadow-inner px-4 py-3 mb-2.5">
              <p
                id="appreciation-dialog-message"
                className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed text-center"
              >
                &ldquo;{customMessage}&rdquo;
              </p>
            </div>

            {/* Baris Teks Tip Kustom di Bawah Dialog Apresiasi (Berubah Setiap Level Dimuat) */}
            <div className="rounded-xl bg-amber-100/80 border border-amber-300/80 px-3 py-2 mb-3 flex items-start gap-2 text-left">
              <span
                aria-hidden="true"
                className="text-sm leading-none mt-0.5 shrink-0"
              >
                💡
              </span>
              <p className="text-[11px] sm:text-xs font-bold text-amber-950 leading-snug">
                {levelTip}
              </p>
            </div>

            {/* Info Singkat Pintu Tujuan Terbuka */}
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100/80 border border-emerald-200 mb-3.5 text-xs font-extrabold text-emerald-900">
              <span aria-hidden="true">🔓</span>
              <span>
                Pintu <strong>{destinationName}</strong> sudah terbuka!
              </span>
            </div>

            {/* Tombol Lanjutkan ke Tujuan Akhir */}
            <motion.button
              type="button"
              data-sfx="custom"
              onClick={onContinue}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.03,
                      y: -2,
                      transition: {
                        type: 'spring',
                        stiffness: 420,
                        damping: 18,
                      },
                    }
              }
              whileTap={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 0.96,
                      y: 2,
                      transition: {
                        type: 'spring',
                        stiffness: 550,
                        damping: 22,
                      },
                    }
              }
              className="w-full min-h-[50px] px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span>Ayo Masuk ke {destinationName}!</span>
              <span aria-hidden="true">➔</span>
              {showShortcutLabels && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                  {getActionBadgeLabel('confirm', keyBindings)}
                </span>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
