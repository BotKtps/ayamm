import React, { useState, useEffect } from 'react';
import { Share2, Users, Trophy, Copy, Plus, CheckCircle, Gift } from 'lucide-react';
import { UserStats } from '../types';

interface ReferralPanelProps {
  user: UserStats | null;
  onReferralClaimed: (updatedUser: UserStats) => void;
}

export const ReferralPanel: React.FC<ReferralPanelProps> = ({ user, onReferralClaimed }) => {
  const [referrerCode, setReferrerCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ username: string; count: number }[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  };

  const handleCopyLink = () => {
    const link = `https://t.me/lesehtoolsbot?start=REF-${user?.userId.slice(-6)}`;
    navigator.clipboard.writeText(link);
    alert(`Referral Link copied: ${link}`);
  };

  const handleClaimReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referrerCode.trim() || !user) return;

    setIsClaiming(true);
    setClaimStatus(null);

    try {
      const res = await fetch(`/api/user/${user.userId}/referral/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrerCode: referrerCode.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengklaim kode referral.");
      }

      setClaimStatus({ type: 'success', text: data.message });
      onReferralClaimed(data.user);
      setReferrerCode('');
      fetchLeaderboard();
    } catch (err: any) {
      setClaimStatus({ type: 'error', text: err.message || "Gagal klaim referral." });
    } finally {
      setIsClaiming(false);
    }
  };

  const myCode = user ? `REF-${user.userId.slice(-6)}` : 'N/A';

  return (
    <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      <div className="flex items-center gap-2.5 border-b border-gray-850 pb-4">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Users className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-white text-base">👥 REFERRAL PARTNERSHIP</h2>
          <p className="text-xs text-gray-400">Undang teman Anda dan dapatkan bonus kuota bypass</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Stats/Claim Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-850">
              <span className="text-[10px] text-gray-500 block font-bold font-mono tracking-wider mb-1">KODE SAYA</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono font-bold text-emerald-400 tracking-wide select-all">{myCode}</span>
                <button
                  id="copy-my-code-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(myCode);
                    alert(`Copied code: ${myCode}`);
                  }}
                  className="text-gray-500 hover:text-white p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-gray-950 p-4 rounded-xl border border-gray-850">
              <span className="text-[10px] text-gray-500 block font-bold font-mono tracking-wider mb-1">TOTAL RUJUKAN</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">{user?.referralCount || 0}</span>
                <span className="text-[9px] text-gray-400">PENGGUNA</span>
              </div>
            </div>
          </div>

          {/* Invitation link */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-2.5">
            <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-emerald-400" /> Link Referral Telegram Bot
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Bagikan link bot di bawah ini. Ketika pengguna memulai bot dengan kode Anda, pengundang akan otomatis mendapat bonus <strong>+2 limit harian</strong>.
            </p>
            <div className="flex gap-2">
              <input
                id="referral-link-input"
                type="text"
                readOnly
                value={`https://t.me/lesehtoolsbot?start=${myCode}`}
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-400 font-mono select-all outline-none"
              />
              <button
                id="copy-ref-link-btn"
                onClick={handleCopyLink}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-3 rounded-lg flex items-center justify-center transition"
                title="Salin Link"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Claim Inviter */}
          {!user?.referredBy ? (
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-3">
              <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-emerald-400" /> Klaim Pengundang
              </h3>
              <p className="text-[10px] text-gray-400 leading-normal">
                Diundang oleh seseorang? Masukkan kode referral pengundang Anda di bawah ini untuk mendukung mereka:
              </p>
              <form onSubmit={handleClaimReferral} className="flex gap-2">
                <input
                  id="inviter-code-input"
                  type="text"
                  placeholder="Contoh: REF-..."
                  value={referrerCode}
                  onChange={(e) => setReferrerCode(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono placeholder-gray-600 outline-none"
                />
                <button
                  id="claim-ref-btn"
                  type="submit"
                  disabled={isClaiming || !referrerCode.trim()}
                  className="bg-gray-800 hover:bg-emerald-500 hover:text-gray-950 font-bold px-4 py-1.5 rounded-lg text-xs transition disabled:opacity-40"
                >
                  Claim
                </button>
              </form>
              {claimStatus && (
                <div className={`p-2 rounded text-[10px] border leading-relaxed ${
                  claimStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {claimStatus.text}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-center gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="text-xs text-emerald-400 font-bold block">Referral Diklaim</span>
                <span className="text-[10px] text-gray-400">Anda telah berhasil menautkan akun dengan pengundang Anda.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Leaderboard Column */}
        <div className="lg:col-span-5 bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-850 pb-2.5 mb-2.5">
              <Trophy className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500/20" />
              Top Referral Leaderboard
            </h3>

            <div className="space-y-2">
              {leaderboard.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-5 w-5 rounded-md font-mono font-bold text-[10px] flex items-center justify-center ${
                      idx === 0 ? 'bg-yellow-500 text-gray-950' : idx === 1 ? 'bg-gray-300 text-gray-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-gray-900 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-300">@{item.username}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">{item.count} rujukan</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-2 text-center">
            Pembaruan rujukan disinkronkan secara instan.
          </div>
        </div>
      </div>
    </div>
  );
};
