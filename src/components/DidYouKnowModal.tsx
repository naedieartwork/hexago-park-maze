import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KawaiiCharacterIcon,
  ZookeeperNaedieAvatar,
  type KawaiiCharacterKey,
} from './KawaiiCharacters';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';

export interface AnimalDidYouKnowFact {
  id: string;
  badge: string;
  headline: string;
  fact: string;
  habitat: string;
}

export const DID_YOU_KNOW_FACTS: Record<
  KawaiiCharacterKey,
  AnimalDidYouKnowFact[]
> = {
  deer: [
    {
      id: 'deer-1',
      badge: 'Keajaiban Tubuh',
      headline: 'Tanduk Rusa Bisa Tumbuh Lagi!',
      fact: 'Rusa jantan memiliki tanduk unik bernama ranggah yang bisa tanggal lalu tumbuh kembali lebih kuat setiap tahun, lho!',
      habitat: 'Hutan Sejuk · Pemakan Tumbuhan',
    },
    {
      id: 'deer-2',
      badge: 'Rahasia Hutan',
      headline: 'Bintik Putih Si Anak Rusa',
      fact: 'Anak rusa lahir dengan bintik-bintik putih di punggungnya yang mirip cahaya matahari menembus daun agar tidak mudah terlihat pemangsa.',
      habitat: 'Padang & Hutan · Pelari Lincah',
    },
    {
      id: 'deer-3',
      badge: 'Indra Tajam',
      headline: 'Mata Lebar Penjaga Hutan',
      fact: 'Posisi mata rusa berada di sisi kepala sehingga ia bisa melihat hampir ke segala arah tanpa perlu menoleh jauh!',
      habitat: 'Hutan Cemara · Suka Apel & Daun',
    },
  ],
  rabbit: [
    {
      id: 'rabbit-1',
      badge: 'Kebiasaan Unik',
      headline: 'Lompatan Bahagia Bernama Binky!',
      fact: 'Saat kelinci merasa sangat gembira, ia melompat tinggi sambil memutar tubuhnya di udara. Gerakan lucu ini disebut binky!',
      habitat: 'Padang Rumput · Pemakan Sayur',
    },
    {
      id: 'rabbit-2',
      badge: 'Keajaiban Tubuh',
      headline: 'Gigi Kelinci Terus Tumbuh',
      fact: 'Gigi depan kelinci tidak pernah berhenti tumbuh sepanjang hidupnya, karena itu kelinci rajin mengunyah wortel dan rumput berserat.',
      habitat: 'Kebun & Padang · Penggali Cerdik',
    },
    {
      id: 'rabbit-3',
      badge: 'Indra Tajam',
      headline: 'Telinga Panjang Seperti Radar',
      fact: 'Kelinci bisa memutar kedua telinganya ke arah berbeda untuk mendengar suara halus dari jarak jauh sekaligus menjaga suhu tubuhnya.',
      habitat: 'Lubang Tanah · Aktif Pagi & Sore',
    },
  ],
  cat: [
    {
      id: 'cat-1',
      badge: 'Indra Tajam',
      headline: 'Kumis Pengukur Jalan Rahasia',
      fact: 'Kumis kucing sangat peka terhadap getaran udara dan lebarnya hampir sama dengan tubuhnya, membantu kucing tahu apakah suatu celah cukup dilewati!',
      habitat: 'Rumah & Taman · Pemanjat Hebat',
    },
    {
      id: 'cat-2',
      badge: 'Kebiasaan Unik',
      headline: 'Dengkuran Hangat Penenang Hati',
      fact: 'Saat kucing merasa aman dan disayang, ia mengeluarkan suara dengkuran lembut yang ternyata juga membantu ototnya tetap rileks.',
      habitat: 'Tempat Hangat · Suka Ikan Segar',
    },
    {
      id: 'cat-3',
      badge: 'Keajaiban Tubuh',
      headline: 'Bantalan Kaki Selembut Kapas',
      fact: 'Telapak kaki kucing memiliki bantalan empuk sehingga ia bisa berjalan sangat pelan tanpa suara dan mendarat lembut saat melompat.',
      habitat: 'Taman & Rumah · Tidur 12–16 Jam',
    },
  ],
  bear: [
    {
      id: 'bear-1',
      badge: 'Indra Tajam',
      headline: 'Hidung Super Pencium Madu',
      fact: 'Indra penciuman beruang jauh lebih tajam daripada anjing! Ia bisa mencium aroma buah dan madu manis dari jarak berkilo-kilometer.',
      habitat: 'Hutan & Lembah · Pemakan Segala',
    },
    {
      id: 'bear-2',
      badge: 'Kebiasaan Unik',
      headline: 'Tidur Panjang di Musim Dingin',
      fact: 'Sebelum musim dingin tiba, beruang makan banyak madu dan buah agar punya energi untuk beristirahat panjang di dalam gua yang hangat.',
      habitat: 'Gua Hutan · Perenang Andal',
    },
    {
      id: 'bear-3',
      badge: 'Keajaiban Tubuh',
      headline: 'Besar Namun Jago Memanjat',
      fact: 'Meski bertubuh besar dan berbulu tebal, beruang memiliki cakar kuat yang membantunya memanjat pohon tinggi untuk mencari sarang lebah.',
      habitat: 'Lembah Madu · Suka Buah & Ikan',
    },
  ],
  fox: [
    {
      id: 'fox-1',
      badge: 'Keajaiban Tubuh',
      headline: 'Ekor Lebat Seperti Selimut Hangat',
      fact: 'Rubah menggunakan ekornya yang tebal dan lembut untuk menjaga keseimbangan saat berlari cepat sekaligus menyelimuti hidungnya saat tidur!',
      habitat: 'Hutan & Bukit · Cerdik & Gesit',
    },
    {
      id: 'fox-2',
      badge: 'Indra Tajam',
      headline: 'Pendengar Suara di Balik Semak',
      fact: 'Telinga rubah yang tegak dan runcing bisa menangkap suara langkah kecil serangga atau hewan mungil bahkan di balik dedaunan tebal.',
      habitat: 'Sarang Pohon · Suka Buah Berry',
    },
    {
      id: 'fox-3',
      badge: 'Kebiasaan Unik',
      headline: 'Pelari Cerdas Penjaga Arah',
      fact: 'Rubah memiliki ingatan jalur yang sangat baik dan sering membuat lebih dari satu pintu keluar rahasia di dekat sarangnya.',
      habitat: 'Bukit Daun · Aktif Senja Hari',
    },
  ],
  hedgehog: [
    {
      id: 'hedgehog-1',
      badge: 'Keajaiban Tubuh',
      headline: 'Ribuan Duri yang Tidak Beracun',
      fact: 'Punggung landak mini ditumbuhi ribuan duri keras yang sebenarnya terbuat dari bahan keratin—sama seperti kuku dan rambut manusia!',
      habitat: 'Hutan Rimbun · Penjelajah Malam',
    },
    {
      id: 'hedgehog-2',
      badge: 'Kebiasaan Unik',
      headline: 'Bola Duri Pelindung Diri',
      fact: 'Ketika merasa terkejut, landak mungil akan melengkungkan otot punggungnya dan menggulung diri menjadi bola rapi agar tetap aman.',
      habitat: 'Sarang Daun · Suka Jamur & Buah',
    },
    {
      id: 'hedgehog-3',
      badge: 'Indra Tajam',
      headline: 'Mengandalkan Hidung Mungilnya',
      fact: 'Penglihatan landak tidak terlalu tajam, jadi ia mengandalkan hidung basahnya yang lucu untuk mencium jejak makanan di antara dedaunan.',
      habitat: 'Semak & Ranting · Perenang Kecil',
    },
  ],
  lion: [
    {
      id: 'lion-1',
      badge: 'Kehidupan Sabana',
      headline: 'Kucing Besar yang Hidup Berkelompok',
      fact: 'Berbeda dari kucing besar lain yang suka menyendiri, singa hidup bersama dalam keluarga besar yang saling menjaga dan bermain bersama!',
      habitat: 'Padang Sabana · Hidup Berkelompok',
    },
    {
      id: 'lion-2',
      badge: 'Keajaiban Suara',
      headline: 'Auman Lantang Penjaga Wilayah',
      fact: 'Auman singa sangat kuat hingga suaranya bisa terdengar sampai jarak 8 kilometer untuk memanggil anggota keluarganya.',
      habitat: 'Batu Sabana · Raja Padang Rumput',
    },
    {
      id: 'lion-3',
      badge: 'Kebiasaan Unik',
      headline: 'Suka Berjemur & Tidur Siang',
      fact: 'Singa sangat menyukai waktu istirahat bersama keluarganya di tempat teduh atau di atas batu hangat selama belasan jam sehari!',
      habitat: 'Sabana Emas · Istirahat 16–20 Jam',
    },
  ],
  elephant: [
    {
      id: 'elephant-1',
      badge: 'Keajaiban Tubuh',
      headline: 'Belalai dengan Puluhan Ribu Otot',
      fact: 'Belalai gajah tidak memiliki tulang, tetapi punya lebih dari 40.000 otot! Karena itu gajah bisa mengangkat batang kayu atau mengambil pisang dengan lembut.',
      habitat: 'Hutan & Danau · Pemakan Tumbuhan',
    },
    {
      id: 'elephant-2',
      badge: 'Kehidupan Hutan',
      headline: 'Ingatan Kuat Sahabat Setia',
      fact: 'Gajah terkenal memiliki ingatan luar biasa: ia bisa mengingat sumber air segar, rute perjalanan, dan wajah teman-temannya selama bertahun-tahun!',
      habitat: 'Danau Segar · Hidup Berkeluarga',
    },
    {
      id: 'elephant-3',
      badge: 'Keajaiban Tubuh',
      headline: 'Telinga Lebar Sebagai Kipas Alami',
      fact: 'Saat cuaca terasa panas, gajah mengibas-ngibaskan telinganya yang lebar untuk menyejukkan aliran darah dan menurunkan suhu tubuhnya.',
      habitat: 'Rimba & Oasis · Suka Mandi Air',
    },
  ],
  giraffe: [
    {
      id: 'giraffe-1',
      badge: 'Keajaiban Tubuh',
      headline: 'Lidah Biru Penyelamat Daun Tinggi',
      fact: 'Lidah jerapah panjangnya hampir setengah meter dan berwarna gelap kebiruan agar tidak terbakar sinar matahari saat memetik daun akasia!',
      habitat: 'Padang Akasia · Mamalia Tertinggi',
    },
    {
      id: 'giraffe-2',
      badge: 'Keajaiban Tubuh',
      headline: 'Corak Unik Seperti Sidik Jari',
      fact: 'Tidak ada dua jerapah di dunia yang punya pola bintik persis sama. Setiap corak di tubuh jerapah seunik sidik jari manusia!',
      habitat: 'Pohon Tinggi · Pemakan Daun',
    },
    {
      id: 'giraffe-3',
      badge: 'Kebiasaan Unik',
      headline: 'Jumlah Tulang Leher Sama dengan Manusia',
      fact: 'Meski lehernya sangat panjang untuk menjangkau puncak pohon, jumlah ruas tulang leher jerapah sama persis dengan manusia, yaitu hanya 7 ruas!',
      habitat: 'Sabana Malam · Pengawas Jauh',
    },
  ],
  zebra: [
    {
      id: 'zebra-1',
      badge: 'Kehidupan Sabana',
      headline: 'Belang Unik Penolak Serangga',
      fact: 'Garis hitam-putih pada tubuh zebra berbeda untuk setiap individu dan membuat lalat sabana bingung sehingga jarang hinggap di kulitnya!',
      habitat: 'Padang Sabana · Hidup Berkelompok',
    },
    {
      id: 'zebra-2',
      badge: 'Kebiasaan Unik',
      headline: 'Tidur Berdiri Bersama Teman',
      fact: 'Zebra sering tidur sambil berdiri di dekat kelompoknya. Ada anggota yang tetap berjaga agar semua teman tetap aman dari bahaya.',
      habitat: 'Padang Rumput · Pelari Kencang',
    },
    {
      id: 'zebra-3',
      badge: 'Keajaiban Tubuh',
      headline: 'Sapaan Ramah Lewat Telinga',
      fact: 'Zebra berkomunikasi dengan menggerakkan telinganya: telinga menghadap ke depan artinya ia sedang senang dan bersemangat!',
      habitat: 'Sabana Luas · Pemakan Rumput',
    },
  ],
};

export function pickDidYouKnowFact(
  characterKey: KawaiiCharacterKey,
  seenFactIds?: Set<string>
): AnimalDidYouKnowFact {
  const pool =
    DID_YOU_KNOW_FACTS[characterKey] ?? DID_YOU_KNOW_FACTS.deer;
  const unseen = seenFactIds
    ? pool.filter((item) => !seenFactIds.has(item.id))
    : pool;
  const activePool = unseen.length > 0 ? unseen : pool;
  const idx = Math.floor(Math.random() * activePool.length);
  return activePool[idx];
}

interface DidYouKnowModalProps {
  isOpen: boolean;
  level: number;
  characterKey: KawaiiCharacterKey;
  characterName: string;
  fact: AnimalDidYouKnowFact | null;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onClose: () => void;
}

export const DidYouKnowModal: React.FC<DidYouKnowModalProps> = ({
  isOpen,
  level,
  characterKey,
  characterName,
  fact,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onClose,
}) => {
  const modalCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      const primaryBtn = modalCardRef.current?.querySelector<HTMLButtonElement>(
        'button[data-kb-default="true"]'
      );
      primaryBtn?.focus();
    }, 80);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && fact && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="did-you-know-title"
          aria-describedby="did-you-know-fact"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.14 : 0.24,
            delay: shouldReduceMotion ? 0 : 0.26,
          }}
          className="fixed inset-0 z-[68] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md select-none"
        >
          <motion.div
            ref={modalCardRef}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.88, y: 22 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.93, y: 12 }
            }
            transition={{
              type: 'spring',
              stiffness: 370,
              damping: 25,
              delay: shouldReduceMotion ? 0 : 0.28,
            }}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-sky-50 via-white to-amber-50 border-3 border-white shadow-[0_24px_60px_rgba(15,23,42,0.3)] p-5 text-stone-800 overflow-hidden"
          >
            {/* Ornamen Latar Lembut */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-amber-200/35 blur-xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-sky-200/40 blur-xl"
            />

            {/* Lencana Header: Tahukah Kamu? */}
            <div className="relative flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-extrabold tracking-wide shadow-xs">
                <span aria-hidden="true">💡</span>
                <span>Tahukah Kamu?</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/90 border border-emerald-200 text-emerald-900 text-[11px] font-extrabold tabular-nums">
                Level {level} · {characterName}
              </span>
            </div>

            {/* Ilustrasi Hewan Level Saat Ini + Pak Naedie */}
            <div className="relative flex items-center justify-center gap-3 mb-3">
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -5, 0], rotate: [0, -2, 2, 0] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.5,
                  ease: 'easeInOut',
                }}
                className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 via-sky-50 to-amber-100 border-2 border-emerald-200 shadow-md flex items-center justify-center p-2.5"
              >
                <KawaiiCharacterIcon
                  character={characterKey}
                  mood="happy"
                  alt={`Karakter ${characterName}`}
                  className="w-full h-full drop-shadow-xs"
                />
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-xl bg-amber-400 border-2 border-white text-white text-sm flex items-center justify-center shadow-sm"
                >
                  ✨
                </span>
              </motion.div>

              <div className="flex flex-col items-start gap-1 max-w-[165px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-100 border border-sky-200 text-sky-900 text-[10px] font-extrabold uppercase tracking-wide">
                  {fact.badge}
                </span>
                <h2
                  id="did-you-know-title"
                  className="font-display text-lg sm:text-xl font-bold text-emerald-950 leading-snug"
                >
                  {fact.headline}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-200 p-0.5 shrink-0">
                    <ZookeeperNaedieAvatar
                      alt="Pak Naedie Penjaga Kebun Binatang"
                      className="w-full h-full"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-stone-500 leading-tight">
                    Info Satwa Pak Naedie
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak Penjelasan Fakta Edukatif */}
            <div className="relative rounded-2xl bg-amber-50/90 border-2 border-amber-200/90 shadow-inner px-4 py-3 mb-3">
              <p
                id="did-you-know-fact"
                className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed text-center"
              >
                {fact.fact}
              </p>
            </div>

            {/* Info Singkat Habitat & Kebiasaan */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50/90 border border-sky-200 mb-3.5 text-[11px] font-extrabold text-sky-900">
              <span aria-hidden="true">🌿</span>
              <span>{fact.habitat}</span>
            </div>

            {/* Tombol Lanjutkan ke Permainan */}
            <motion.button
              type="button"
              data-sfx="custom"
              data-kb-default="true"
              onClick={onClose}
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
              className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
            >
              <span>Asyik! Ayo Mulai Level {level}</span>
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
