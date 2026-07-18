import React, { useState } from 'react';
import { Mail, Plus, Trash2, Key, Check, Info, HelpCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { GOOGLE_APP_PASSWORD_GUIDE } from '../data';
import { EmailConfig } from '../types';

interface EmailConfiguratorProps {
  emails: EmailConfig[];
  userId: string;
  onEmailsUpdated: (newEmails: EmailConfig[]) => void;
}

export const EmailConfigurator: React.FC<EmailConfiguratorProps> = ({
  emails,
  userId,
  onEmailsUpdated
}) => {
  const [email, setEmail] = useState('');
  const [appPass, setAppPass] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !appPass.trim()) return;

    setIsAdding(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/user/${userId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), appPass: appPass.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal melakukan koneksi SMTP.");
      }

      onEmailsUpdated(data.emails);
      setEmail('');
      setAppPass('');
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal verifikasi SMTP.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteEmail = async (emailToDelete: string) => {
    if (!confirm(`Hapus konfigurasi SMTP untuk ${emailToDelete}?`)) return;

    try {
      const res = await fetch(`/api/user/${userId}/email/${encodeURIComponent(emailToDelete)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onEmailsUpdated(data.emails);
      }
    } catch (err) {
      console.error("Failed to delete email config", err);
    }
  };

  const handleToggleActive = async (emailToActivate: string) => {
    try {
      const res = await fetch(`/api/user/${userId}/email/${encodeURIComponent(emailToActivate)}/activate`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onEmailsUpdated(data.emails);
      }
    } catch (err) {
      console.error("Failed to activate email config", err);
    }
  };

  return (
    <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-gray-850 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Mail className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-base">📧 EMAIL SENDER CONFIGURATOR</h2>
            <p className="text-xs text-gray-400">Atur Gmail SMTP Anda untuk pengiriman appeal asli</p>
          </div>
        </div>

        <button
          id="toggle-guide-btn"
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 bg-gray-950 px-2.5 py-1.5 rounded-lg transition"
        >
          <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
          {showGuide ? 'Sembunyikan Panduan' : 'Lihat Panduan'}
        </button>
      </div>

      {/* Guide display */}
      {showGuide && (
        <div className="bg-gray-950 border border-emerald-500/10 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-display uppercase tracking-wider">
            <Key className="h-3.5 w-3.5" />
            PANDUAN MENDAPATKAN APP PASSWORD GMAIL
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GOOGLE_APP_PASSWORD_GUIDE.map((step) => (
              <div key={step.step} className="bg-gray-900/45 p-3 rounded-lg border border-gray-850 flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                  {step.step}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{step.title}</h4>
                  <p className="text-[10px] text-gray-400 leading-normal">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main configuration grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form left */}
        <form onSubmit={handleAddEmail} className="lg:col-span-5 space-y-3.5 bg-gray-950/40 p-4 rounded-xl border border-gray-850">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider">Sambungkan SMTP</h3>
            {userId === "6316932951" ? (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">Owner Mode</span>
            ) : (
              <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full uppercase">Locked</span>
            )}
          </div>
          
          {userId !== "6316932951" ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] p-3 rounded-lg leading-relaxed">
              ⚠️ <strong>Dibatasi:</strong> Penambahan App Password Gmail SMTP saat ini hanya dapat ditambahkan oleh <strong>Owner saja (ID: 6316932951 @Dckoww)</strong> untuk menjaga kuota server dan stabilitas sistem.
            </div>
          ) : null}

          <div>
            <label htmlFor="gmail-input" className="block text-[11px] text-gray-400 mb-1">Email Gmail</label>
            <input
              id="gmail-input"
              type="email"
              placeholder={userId === "6316932951" ? "contoh@gmail.com" : "Hanya untuk Owner"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={userId !== "6316932951"}
              className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg py-2 px-3 text-xs text-white outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="apppass-input" className="block text-[11px] text-gray-400 mb-1">Gmail App Password (16-Karakter)</label>
            <input
              id="apppass-input"
              type="password"
              placeholder={userId === "6316932951" ? "abcd efgh ijkl mnop" : "Dibatasi"}
              value={appPass}
              onChange={(e) => setAppPass(e.target.value)}
              required
              disabled={userId !== "6316932951"}
              className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg py-2 px-3 text-xs text-white font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2 rounded-lg leading-relaxed">
              {errorMessage}
            </div>
          )}

          <button
            id="add-email-btn"
            type="submit"
            disabled={userId !== "6316932951" || isAdding || !email.trim() || !appPass.trim()}
            className="w-full bg-gray-900 hover:bg-emerald-500 hover:text-gray-950 border border-gray-800 hover:border-transparent text-gray-300 font-bold rounded-lg py-2 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Menguji SMTP Koneksi...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Verifikasi & Simpan SMTP
              </>
            )}
          </button>
        </form>

        {/* Existing active list right */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-xs font-bold text-white font-display uppercase tracking-wider">Daftar Akun Terdaftar</h3>
          
          {emails.length === 0 ? (
            <div className="text-center py-10 bg-gray-950/20 border border-gray-850 rounded-xl">
              <Mail className="h-8 w-8 text-gray-850 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Belum Ada Akun Gmail Tersimpan</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Koneksikan SMTP Gmail Anda untuk dapat mengirim email asli langsung ke server WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {emails.map((e) => (
                <div
                  key={e.email}
                  onClick={() => handleToggleActive(e.email)}
                  className={`border p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                    e.active
                      ? 'bg-emerald-500/5 border-emerald-500/25 shadow-md shadow-emerald-500/5'
                      : 'bg-gray-950/20 border-gray-850 hover:bg-gray-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${e.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-850 text-gray-500'}`}>
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white block">{e.email}</span>
                      <span className="text-[9px] text-gray-500 font-mono block">Ditambahkan: {new Date(e.addedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                    {e.active ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <Check className="h-3 w-3" /> AKTIF
                      </span>
                    ) : (
                      <button
                        id={`activate-email-btn-${e.email}`}
                        onClick={() => handleToggleActive(e.email)}
                        className="text-[10px] font-semibold text-gray-400 hover:text-white bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-full transition"
                      >
                        AKTIFKAN
                      </button>
                    )}
                    <button
                      id={`delete-email-btn-${e.email}`}
                      onClick={() => handleDeleteEmail(e.email)}
                      className="text-gray-500 hover:text-red-400 p-1 rounded transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
