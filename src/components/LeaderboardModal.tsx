import React, { useState } from 'react';
import { LeaderboardEntry } from '../types/game';
import { formatPlaytime } from '../data/words';
import {
  exportLeaderboardToCSV,
  fetchLeaderboardFromGoogleSheet,
  getGoogleSheetWebhookUrl,
  setGoogleSheetWebhookUrl,
  syncEntryToGoogleSheet,
} from '../services/leaderboardService';
import {
  Trophy,
  X,
  Download,
  RefreshCw,
  Settings,
  CheckCircle2,
  Copy,
  Database,
  Medal,
  Clock,
  Sparkles,
} from 'lucide-react';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  currentPlayerName: string;
  onUpdateEntries: (entries: LeaderboardEntry[]) => void;
  onClose: () => void;
}

const APPS_SCRIPT_CODE = `// วางโค้ดนี้ใน Google Sheet -> ส่วนขยาย (Extensions) -> Apps Script
// แล้วกด Deploy -> New deployment -> Web app (เลือก Who has access: Anyone)
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "PlayerName", "Score", "WordsCount", "LevelReached", "PlaytimeSeconds"]);
  }
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    data.playerName,
    Number(data.score),
    Number(data.wordsCount),
    Number(data.levelReached),
    Number(data.playtimeSeconds)
  ]);
  // เรียงลำดับคะแนนจากมากไปน้อยอัตโนมัติ (คอลัมน์ C = คะแนน)
  if (sheet.getLastRow() > 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).sort({column: 3, ascending: false});
  }
  return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var entries = [];
  for (var i = 1; i < rows.length; i++) {
    entries.push({
      id: "row-" + i,
      createdAt: rows[i][0],
      playerName: rows[i][1],
      score: Number(rows[i][2]),
      wordsCount: Number(rows[i][3]),
      levelReached: Number(rows[i][4]),
      playtimeSeconds: Number(rows[i][5])
    });
  }
  entries.sort(function(a, b) { return b.score - a.score; });
  return ContentService.createTextOutput(JSON.stringify({entries: entries}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  currentPlayerName,
  onUpdateEntries,
  onClose,
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => getGoogleSheetWebhookUrl());
  const [showSheetSetup, setShowSheetSetup] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const sortedEntries = [...entries].sort((a, b) => b.score - a.score);

  React.useEffect(() => {
    let active = true;
    setIsSyncing(true);
    fetchLeaderboardFromGoogleSheet(webhookUrl)
      .then((remote) => {
        if (active && remote) {
          onUpdateEntries(remote);
        }
      })
      .finally(() => {
        if (active) setIsSyncing(false);
      });
    return () => {
      active = false;
    };
  }, [webhookUrl, onUpdateEntries]);

  const handleSaveSheetUrl = () => {
    setGoogleSheetWebhookUrl(webhookUrl);
    setStatusMessage('บันทึกลิงก์ฐานข้อมูล Google Sheet เรียบร้อยแล้ว!');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSyncWithSheet = async () => {
    if (!webhookUrl.trim()) {
      setShowSheetSetup(true);
      setStatusMessage('กรุณาใส่ Web App URL ของ Google Sheet ก่อนซิงค์ข้อมูล');
      return;
    }
    setIsSyncing(true);
    setStatusMessage('กำลังดึงข้อมูลอันดับคะแนนจาก Google Sheet...');
    try {
      for (const item of sortedEntries.slice(0, 5)) {
        if (!item.syncedToSheet) {
          await syncEntryToGoogleSheet(item, webhookUrl);
          item.syncedToSheet = true;
        }
      }
      const remote = await fetchLeaderboardFromGoogleSheet(webhookUrl);
      if (remote) {
        onUpdateEntries(remote);
        setStatusMessage('ดึงข้อมูลอันดับคะแนนจาก Google Sheet สำเร็จ!');
      } else {
        setStatusMessage('อัปเดตข้อมูลกับ Google Sheet เรียบร้อยแล้ว!');
      }
    } catch {
      setStatusMessage('ซิงค์ข้อมูลกับ Google Sheet แล้ว');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-3xl border border-amber-400/40 bg-slate-950 p-5 md:p-6 shadow-[0_0_50px_rgba(245,158,11,0.28)] text-white flex flex-col">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-cyan-400 to-fuchsia-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-cyan-300">
                ตารางจัดอันดับคะแนน (Leaderboard)
              </h2>
              <p className="text-xs text-slate-400">
                เรียงลำดับคะแนนสูงสุด · เชื่อมต่อฐานข้อมูล Google Sheet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Sheet Toolbar */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSheetSetup(!showSheetSetup)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${
                webhookUrl
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {webhookUrl ? 'เชื่อมต่อ Google Sheet แล้ว' : 'ตั้งค่าฐานข้อมูล Google Sheet'}
              </span>
              <Settings className="w-3 h-3 opacity-70" />
            </button>

            <button
              onClick={handleSyncWithSheet}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>ซิงค์ Google Sheet</span>
            </button>
          </div>

          <button
            onClick={() => exportLeaderboardToCSV(sortedEntries)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>ดาวน์โหลด CSV (เปิดใน Google Sheet)</span>
          </button>
        </div>

        {statusMessage && (
          <div className="my-2 px-3 py-2 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Collapsible Google Sheet Database Setup Panel */}
        {showSheetSetup && (
          <div className="my-2 p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 text-left space-y-2.5 text-xs">
            <div className="font-semibold text-cyan-300 flex items-center justify-between">
              <span>เชื่อมต่อฐานข้อมูล Google Sheet (บันทึกชื่อและเรียงลำดับคะแนนอัตโนมัติ)</span>
              <button
                onClick={handleCopyScript}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 flex items-center gap-1 transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedScript ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
              </button>
            </div>
            <p className="text-slate-400 leading-relaxed">
              1. สร้างไฟล์ Google Sheet ใหม่ ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong> วางโค้ดด้านบนแล้วกด <strong>Deploy &gt; New deployment &gt; Web app</strong> (ตั้งสิทธิ์เป็น Anyone)<br />
              2. นำลิงก์ <strong>Web App URL</strong> มาวางด้านล่าง ระบบจะบันทึกชื่อผู้เล่นและเรียงลำดับคะแนนลง Google Sheet ทันทีเมื่อจบเกม!
            </p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleSaveSheetUrl}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow"
              >
                บันทึก URL
              </button>
            </div>
          </div>
        )}

        {/* Sorted Leaderboard Table (from Google Sheet only) */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {sortedEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {isSyncing
                ? 'กำลังดึงข้อมูลอันดับคะแนนจาก Google Sheet...'
                : 'ยังไม่มีข้อมูลคะแนนใน Google Sheet หรือกำลังรอซิงค์ข้อมูล'}
            </div>
          ) : (
            sortedEntries.map((item, idx) => {
              const rank = idx + 1;
              const isCurrentPlayer =
                currentPlayerName.trim() !== '' &&
                item.playerName.toLowerCase() === currentPlayerName.trim().toLowerCase();

              return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                  rank === 1
                    ? 'bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-slate-900/90 border-amber-400/50'
                    : rank === 2
                    ? 'bg-gradient-to-r from-slate-800/80 to-slate-900/90 border-slate-400/40'
                    : rank === 3
                    ? 'bg-gradient-to-r from-amber-950/40 to-slate-900/90 border-amber-700/40'
                    : isCurrentPlayer
                    ? 'bg-cyan-950/50 border-cyan-400/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 ${
                      rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rank <= 3 ? <Medal className="w-5 h-5" /> : `#${rank}`}
                  </div>

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm md:text-base text-white truncate">
                        {item.playerName}
                      </span>
                      {isCurrentPlayer && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px]">
                          คุณ (You)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Sparkles className="w-3 h-3" /> {item.wordsCount} คำศัพท์
                      </span>
                      <span>·</span>
                      <span>ระดับ Lv.{item.levelReached}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {formatPlaytime(item.playtimeSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className="text-lg md:text-xl font-bold text-amber-300 tabular-nums">
                    {item.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">คะแนน</div>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>จำนวนผู้เล่นทั้งหมด {sortedEntries.length} คน</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
