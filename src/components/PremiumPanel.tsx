import React, { useState, useEffect } from 'react';
import { Crown, Star, Key, Sparkles, Copy, Plus, CheckCircle2, RotateCw } from 'lucide-react';
import { PremiumKey, UserStats } from '../types';

interface PremiumPanelProps {
  user: UserStats | null;
  onPremiumActivated: (updatedUser: UserStats) => void;
}

export const PremiumPanel: React.FC<PremiumPanelProps> = ({ user, onPremiumActivated }) => {
  const [redeemKey, setRedeemKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Admin Key generator state
  const [adminKeys, setAdminKeys] = useState<PremiumKey[]>([]);
  const [genDays, setGenDays] = useState(30);
  const [genUses, setGenUses] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchAdminKeys();
  }, []);

  const fetchAdminKeys = async () => {
    try {
      const res = await fetch('/api/admin/keys');
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to load admin keys", err);
    }
  };

  const handleRedeemKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemKey.trim()) return;

    setIsActivating(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/user/${user?.userId}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: redeemKey.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal melakukan redeem key.");
      }

      setStatusMessage({ type: 'success', text: data.message });
      onPremiumActivated(data.user);
      setRedeemKey('');
      fetchAdminKeys(); // Reload key lists
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || "Gagal mengaktifkan lisensi." });
    } finally {
      setIsActivating(false);
    }
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/keys', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: genDays, uses: genUses })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to generate premium key", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert(`Key copied: ${key}`);
  };

  return (
    <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-2.5 border-b border-gray-850 pb-4">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Crown className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-white text-base">💎 PREMIUM LICENSING SERVICE</h2>
          <p className="text-xs text-gray-400">Aktifkan fitur tak terbatas dan prioritas server</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Reedemer & Perks */}
        <div className="space-y-4">
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-3">
            <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider flex items-center gap-1">
              <Key className="h-3.5 w-3.5 text-emerald-400" />
              Aktivasi Lisensi
            </h3>
            <p className="text-[11px] text-gray-400">Masukkan kode lisensi Premium LesehTools Anda di bawah ini:</p>

            <form onSubmit={handleRedeemKey} className="flex gap-2">
              <input
                id="redeem-key-input"
                type="text"
                placeholder="Contoh: LESEH-..."
                value={redeemKey}
                onChange={(e) => setRedeemKey(e.target.value)}
                required
                className="flex-1 bg-gray-900 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg py-1.5 px-3 text-xs text-white font-mono placeholder-gray-600 outline-none"
              />
              <button
                id="redeem-key-btn"
                type="submit"
                disabled={isActivating || !redeemKey.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-bold px-4 py-1.5 rounded-lg text-xs transition"
              >
                {isActivating ? <RotateCw className="h-3 w-3 animate-spin" /> : 'Aktifkan'}
              </button>
            </form>

            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-[10px] leading-relaxed border ${
                statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {statusMessage.text}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-950/20 to-teal-950/10 border border-emerald-500/10 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-emerald-400/20" /> Keuntungan Premium
            </h4>
            <ul className="text-[11px] text-gray-300 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Banding Tanpa Batas</strong> — Bebas kirim appeal tanpa batas limit harian.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Priority Delivery</strong> — Akses SMTP multi-saluran tercepat tanpa delay antrian.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>50+ Variasi Bahasa</strong> — Pilih bebas dari puluhan surat appeal yang dirancang khusus.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right column: Admin Key Generator (Sandbox Play!) */}
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Admin Key Generator <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded ml-1 font-mono font-normal">ADMIN ONLY</span>
            </h3>
          </div>

          <p className="text-[10px] text-gray-400 leading-normal">
            Buat Lisensi Premium baru untuk di-redeem atau bagikan ke pengguna lain.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="duration-select" className="block text-[10px] text-gray-500 mb-1">Durasi Lisensi</label>
              <select
                id="duration-select"
                value={genDays}
                onChange={(e) => setGenDays(parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 text-gray-300 rounded-lg p-1.5 text-xs outline-none cursor-pointer"
              >
                <option value={1}>1 Hari Trial</option>
                <option value={7}>7 Hari Silver</option>
                <option value={30}>30 Hari Gold</option>
                <option value={365}>365 Hari Platinum</option>
                <option value={3650}>Lifetime Premium</option>
              </select>
            </div>

            <div>
              <label htmlFor="uses-select" className="block text-[10px] text-gray-500 mb-1">Kuota Penggunaan</label>
              <select
                id="uses-select"
                value={genUses}
                onChange={(e) => setGenUses(parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 text-gray-300 rounded-lg p-1.5 text-xs outline-none cursor-pointer"
              >
                <option value={1}>1 Kali Pakai</option>
                <option value={5}>5 Kali Pakai</option>
                <option value={10}>10 Kali Pakai</option>
                <option value={100}>100 Kali Pakai</option>
              </select>
            </div>
          </div>

          <button
            id="generate-key-btn"
            onClick={handleGenerateKey}
            disabled={isGenerating}
            className="w-full bg-gray-900 hover:bg-emerald-500/10 hover:text-emerald-400 border border-gray-800 text-gray-300 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Generate Lisensi Baru
          </button>

          {/* List of generated keys */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-gray-500 font-bold tracking-wider block font-mono">AVAILABLE LICENSES ({adminKeys.length})</span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {adminKeys.map((k) => (
                <div key={k.key} className="bg-gray-900/60 p-2 rounded border border-gray-850 flex items-center justify-between gap-2 text-[10px]">
                  <div className="font-mono">
                    <span className="text-emerald-400 font-bold select-all">{k.key}</span>
                    <span className="text-gray-500 block text-[9px]">
                      Durasi: {k.days} Hari | Kuota: {k.usedCount}/{k.uses}
                    </span>
                  </div>
                  <button
                    id={`copy-key-btn-${k.key}`}
                    onClick={() => handleCopyKey(k.key)}
                    className="text-gray-500 hover:text-white p-1 rounded"
                    title="Copy Key"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
