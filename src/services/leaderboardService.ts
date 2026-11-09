import { LeaderboardEntry } from '../types/game';

const STORAGE_KEY_SHEET_URL = 'gemini_runner_google_sheet_url';
const STORAGE_KEY_PLAYER_NAME = 'gemini_runner_player_name';

export const DEFAULT_GOOGLE_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbyKd6qGAT3L7Jls0bKPnk4YtNI0KIggs4geyb-ODqPrQmXGp__jBxgmlsSacJKqb_9vYQ/exec';

// Clean up any legacy mock leaderboard cache from localStorage
try {
  localStorage.removeItem('gemini_runner_leaderboard_v1');
} catch {
  // ignore
}

export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name.trim());
  } catch {
    // ignore
  }
}

export function getGoogleSheetWebhookUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SHEET_URL);
    if (saved && saved.trim()) {
      return saved.trim();
    }
    localStorage.setItem(STORAGE_KEY_SHEET_URL, DEFAULT_GOOGLE_SHEET_URL);
    return DEFAULT_GOOGLE_SHEET_URL;
  } catch {
    return DEFAULT_GOOGLE_SHEET_URL;
  }
}

export function setGoogleSheetWebhookUrl(url: string): void {
  try {
    const clean = url.trim() || DEFAULT_GOOGLE_SHEET_URL;
    localStorage.setItem(STORAGE_KEY_SHEET_URL, clean);
  } catch {
    // ignore
  }
}

export function getLeaderboardEntries(): LeaderboardEntry[] {
  return [];
}

export async function recordPlayerScoreAndSync(params: {
  playerName: string;
  score: number;
  wordsCount: number;
  levelReached: number;
  playtimeSeconds: number;
}): Promise<{ entry: LeaderboardEntry; allEntries: LeaderboardEntry[]; synced: boolean }> {
  const cleanName = params.playerName.trim() || 'นักเรียน';
  const newEntry: LeaderboardEntry = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    playerName: cleanName,
    score: params.score,
    wordsCount: params.wordsCount,
    levelReached: params.levelReached,
    playtimeSeconds: Math.round(params.playtimeSeconds),
    createdAt: new Date().toISOString(),
    syncedToSheet: false,
  };

  const webhookUrl = getGoogleSheetWebhookUrl();
  let synced = false;
  let allEntries: LeaderboardEntry[] = [];

  if (webhookUrl) {
    synced = await syncEntryToGoogleSheet(newEntry, webhookUrl);
    if (synced) {
      newEntry.syncedToSheet = true;
    }
    // Fetch live sorted entries directly from Google Sheet
    const sheetEntries = await fetchLeaderboardFromGoogleSheet(webhookUrl);
    if (sheetEntries) {
      allEntries = sheetEntries;
    }
  }

  return { entry: newEntry, allEntries, synced };
}

export async function syncEntryToGoogleSheet(
  entry: LeaderboardEntry,
  webhookUrl?: string
): Promise<boolean> {
  const url = (webhookUrl ?? getGoogleSheetWebhookUrl()).trim();
  if (!url) return false;

  const payload = {
    action: 'appendScore',
    playerName: entry.playerName,
    name: entry.playerName,
    score: entry.score,
    wordsCount: entry.wordsCount,
    levelReached: entry.levelReached,
    playtimeSeconds: entry.playtimeSeconds,
    createdAt: entry.createdAt,
  };

  try {
    const query = new URLSearchParams({
      action: 'appendScore',
      playerName: entry.playerName,
      name: entry.playerName,
      score: String(entry.score),
      wordsCount: String(entry.wordsCount),
      levelReached: String(entry.levelReached),
      playtimeSeconds: String(entry.playtimeSeconds),
      createdAt: entry.createdAt,
    }).toString();

    const postUrl = `${url}${url.includes('?') ? '&' : '?'}${query}`;

    await fetch(postUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.error('Google Sheet sync error:', err);
    return false;
  }
}

export async function fetchLeaderboardFromGoogleSheet(
  webhookUrl?: string
): Promise<LeaderboardEntry[] | null> {
  const url = (webhookUrl ?? getGoogleSheetWebhookUrl()).trim();
  if (!url) return null;

  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}action=getLeaderboard&_t=${Date.now()}`);
    if (!res.ok) return null;
    const text = await res.text();
    const data = JSON.parse(text);
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data.entries)
      ? data.entries
      : Array.isArray(data.data)
      ? data.data
      : null;

    if (rawList) {
      const remoteEntries: LeaderboardEntry[] = rawList
        .filter((item: Record<string, unknown>) => {
          const pName = String(item.playerName || item.name || item.PlayerName || '').trim();
          return pName !== '';
        })
        .map((item: Record<string, unknown>, idx: number) => ({
          id: String(item.id || `sheet-${idx}-${item.createdAt || ''}`),
          playerName: String(item.playerName || item.name || item.PlayerName || 'ผู้เล่น'),
          score: Number(item.score ?? item.Score ?? 0),
          wordsCount: Number(item.wordsCount ?? item.WordsCount ?? 0),
          levelReached: Number(item.levelReached ?? item.LevelReached ?? 1),
          playtimeSeconds: Number(item.playtimeSeconds ?? item.PlaytimeSeconds ?? 0),
          createdAt: String(item.createdAt || item.Timestamp || new Date().toISOString()),
          syncedToSheet: true,
        }));

      return remoteEntries.sort((a, b) => b.score - a.score);
    }
    return null;
  } catch {
    return null;
  }
}

export function exportLeaderboardToCSV(entries: LeaderboardEntry[]): void {
  const headers = [
    'ลำดับ (Rank)',
    'ชื่อผู้เล่น (Player Name)',
    'คะแนน (Score)',
    'คำศัพท์ที่ได้ (Words)',
    'ระดับสูงสุด (Level)',
    'เวลาเล่นวินาที (Playtime s)',
    'วันที่ (Date)',
  ];
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const rows = sorted.map((e, i) => [
    i + 1,
    `"${e.playerName.replace(/"/g, '""')}"`,
    e.score,
    e.wordsCount,
    e.levelReached,
    e.playtimeSeconds,
    `"${new Date(e.createdAt).toLocaleString('th-TH')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gemini_runner_scores_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
