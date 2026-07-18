import React, { useState, useEffect } from 'react';
import { Bot, Terminal, Shield, RefreshCw, Send, Trash2, HelpCircle, Copy, Check, Power, AlertCircle, Link } from 'lucide-react';

interface TelegramBotPanelProps {
  userId: string;
}

export function TelegramBotPanel({ userId }: TelegramBotPanelProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState<{
    connected: boolean;
    username: string | null;
    name: string | null;
    token: string;
    logs: string[];
  }>({
    connected: false,
    username: null,
    name: null,
    token: '',
    logs: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch bot status and logs
  const fetchBotStatus = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({
          connected: data.connected,
          username: data.username,
          name: data.name,
          token: data.token,
          logs: data.logs || []
        });
        if (data.token && !tokenInput) {
          setTokenInput(data.token);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bot status", err);
    } finally {
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  };

  // Poll logs periodically
  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(() => {
      fetchBotStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setMessage({ type: 'error', text: 'Token bot tidak boleh kosong!' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchBotStatus();
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal menyambungkan bot!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghubungi server backend!' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/telegram/disconnect', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        setStatus(prev => ({ ...prev, connected: false, username: null, name: null }));
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal mematikan bot!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghubungi server!' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/telegram/logs/clear', { method: 'POST' });
      fetchBotStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const botCommands = [
    { cmd: '/start', desc: 'Menampilkan menu utama dan keyboard interaktif' },
    { cmd: '/fix <nomor>', desc: 'Ajukan banding langsung untuk nomor tertentu (contoh: /fix +62812345678)' },
    { cmd: '/cekid', desc: 'Mengecek ID Telegram Anda' },
    { cmd: '/ceklimit', desc: 'Mengecek sisa limit kuota appeal harian Anda' },
    { cmd: '/apppass', desc: 'Tutorial cara generate App Password Gmail SMTP' },
    { cmd: '/redeem <key>', desc: 'Mengaktifkan Key Lisensi Premium secara langsung dari Telegram' },
    { cmd: '/referral', desc: 'Melihat link rujukan dan status bonus koin limit Anda' }
  ];

  return (
    <div className="space-y-6" id="telegram-bot-panel">
      
      {/* Overview & Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Connection Setup (Left) */}
        <div className="lg:col-span-5 bg-gray-900/40 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${status.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-850 text-gray-500'}`}>
                  <Bot className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Bot Telegram</h2>
                  <p className="text-xs text-gray-400">Hubungkan token API Telegram</p>
                </div>
              </div>
              
              {/* Online status tag */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                status.connected 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.connected ? 'bg-emerald-400' : 'bg-red-400 animate-ping'}`} />
                {status.connected ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="bg-gray-950/40 border border-gray-850 rounded-2xl p-4 text-xs space-y-2 text-gray-300">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <HelpCircle className="h-4 w-4 text-emerald-400" />
                <span>Cara Membuat Bot Telegram</span>
              </div>
              <p>1. Buka Telegram dan cari <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-emerald-400 font-semibold underline">@BotFather</a></p>
              <p>2. Kirim perintah <code className="bg-gray-800 px-1 py-0.5 rounded text-white">/newbot</code> dan ikuti petunjuknya</p>
              <p>3. Salin token API yang diberikan (contoh: <code className="text-yellow-400 font-mono">123456:ABC-def...</code>)</p>
              <p>4. Tempel token di bawah dan klik hubungkan</p>
            </div>

            {/* Form */}
            <form onSubmit={handleConnect} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">HTTP API Token Bot</label>
                <div className="relative">
                  <input
                    id="telegram-token-input"
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Masukkan token dari @BotFather"
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <div className="absolute right-3 top-3 text-gray-500">
                    <Power className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {!status.connected ? (
                  <button
                    id="connect-bot-btn"
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                    Sambungkan Bot
                  </button>
                ) : (
                  <>
                    <button
                      id="disconnect-bot-btn"
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isLoading}
                      className="flex-1 bg-red-500 hover:bg-red-400 text-gray-950 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                      Putuskan Bot
                    </button>
                    
                    {status.username && (
                      <a
                        id="open-bot-link"
                        href={`https://t.me/${status.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs px-4 py-3 rounded-xl border border-emerald-500/20 transition flex items-center justify-center gap-2"
                      >
                        <Link className="h-3.5 w-3.5" />
                        Buka Bot
                      </a>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>

          {/* Active Bot Meta */}
          {status.connected && (
            <div className="mt-4 pt-4 border-t border-gray-850 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Bot Name:</span>
                <span className="text-white font-semibold">{status.name || 'Bot'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bot Username:</span>
                <span className="text-emerald-400 font-mono">@{status.username}</span>
              </div>
            </div>
          )}
        </div>

        {/* Console Terminal (Right) */}
        <div className="lg:col-span-7 bg-gray-950 border border-gray-850 rounded-3xl p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-gray-850 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono">Bot Live Terminal Logs</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="clear-logs-btn"
                onClick={handleClearLogs}
                className="text-gray-500 hover:text-white p-1.5 hover:bg-gray-900 rounded-lg transition"
                title="Bersihkan log"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                id="refresh-logs-btn"
                onClick={() => fetchBotStatus(true)}
                className={`text-gray-500 hover:text-white p-1.5 hover:bg-gray-900 rounded-lg transition ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
                title="Refresh log"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable logs area */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 text-emerald-400/80 scrollbar-thin scrollbar-thumb-gray-800">
            {status.logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                <Terminal className="h-8 w-8 opacity-40 text-gray-500" />
                <p>Belum ada aktivitas telegram terdeteksi.</p>
                <p className="text-[10px]">Coba ketik pesan di bot setelah menghubungkan!</p>
              </div>
            ) : (
              status.logs.map((log, index) => {
                let colorClass = "text-emerald-400/80";
                if (log.includes("[SUKSES]") || log.includes("ONLINE")) {
                  colorClass = "text-emerald-300 font-bold";
                } else if (log.includes("ERROR") || log.includes("Gagal") || log.includes("Menghentikan")) {
                  colorClass = "text-rose-400";
                } else if (log.includes("Pesan")) {
                  colorClass = "text-blue-300";
                }
                return (
                  <div key={index} className={`${colorClass} leading-relaxed break-all`}>
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Interactive Command Reference */}
      <div className="bg-gray-900/20 border border-gray-850 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-lg">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Daftar Command & Integrasi Bot</h3>
            <p className="text-xs text-gray-500">Daftar perintah yang bisa direspon bot Telegram Anda secara otomatis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {botCommands.map((item, index) => (
            <div key={index} className="bg-gray-950/60 border border-gray-850 p-4 rounded-2xl flex items-start justify-between gap-3 group hover:border-gray-800 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-md">{item.cmd}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed pr-4">{item.desc}</p>
              </div>
              <button
                onClick={() => handleCopy(item.cmd, `cmd-${index}`)}
                className="text-gray-600 hover:text-white transition p-1 rounded-lg shrink-0"
              >
                {copiedText === `cmd-${index}` ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 group-hover:scale-105 transition" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
