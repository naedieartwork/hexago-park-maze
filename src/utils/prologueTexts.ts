import type { GameMode } from '../components/PassAndPlayScreens';

export type DialogueLine = {
  id: number;
  speaker: 'naedie' | 'companion';
  speakerName: string;
  speakerRole: string;
  text: string;
};

export type PrologueDialogueParams = {
  mode: GameMode;
  playerName: string;
  groupName?: string;
  groupPlayers?: string[];
  companionName: string;
};

export function buildPrologueDialogues({
  mode,
  playerName,
  companionName,
}: PrologueDialogueParams): DialogueLine[] {
  const trimmedPlayer = playerName.trim();
  const safePlayerName =
    mode === 'group' ? 'anak-anak' : trimmedPlayer || 'anak-anak';
  const safeCompanionName = companionName.trim() || 'Ibu Guru';

  return [
    {
      id: 0,
      speaker: 'naedie',
      speakerName: 'Pak Naedie',
      speakerRole: 'Kreator Taman Bermain & Penjaga Hutan',
      text: `Halo, ${safePlayerName} yang pintar! Selamat datang di Taman Ajaib Hexago Park. Saya Pak Naedie yang membuat taman bermain ini. Hari ini, ${safeCompanionName} akan menemani petualanganmu memandu satwa pulang sambil mengoleksi bekal makanan. Ayo tunjukkan keberanianmu!`,
    },
    {
      id: 1,
      speaker: 'companion',
      speakerName: safeCompanionName,
      speakerRole: 'Guru Pendamping',
      text: `Halo Pak Naedie! Ayo ${safePlayerName}, kita bantu para satwa untuk kembali sambil mengumpulkan bekal makanan mereka.`,
    },
  ];
}
