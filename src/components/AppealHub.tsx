import React, { useState, useEffect } from 'react';
import { Send, Shuffle, Sparkles, Smartphone, Mail, AlertTriangle, HelpCircle, CheckCircle, RotateCw } from 'lucide-react';
import { FIX_TEMPLATES } from '../data';
import { Template, EmailConfig, AppealHistory } from '../types';

interface AppealHubProps {
  userEmails: EmailConfig[];
  userId: string;
  isPremium: boolean;
  onAppealSubmitted: (appeal: AppealHistory) => void;
  refreshUser: () => void;
}

export const AppealHub: React.FC<AppealHubProps> = ({
  userEmails,
  userId,
  isPremium,
  onAppealSubmitted,
  refreshUser
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(FIX_TEMPLATES[0]);
  const [customText, setCustomText] = useState('');
  const [useRealEmail, setUseRealEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('support@support.whatsapp.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Auto-fill template when selection changes or phone number updates
  useEffect(() => {
    updateTemplateText(selectedTemplate, phoneNumber);
  }, [selectedTemplate]);

  const updateTemplateText = (template: Template, phone: string) => {
    const formattedPhone = phone.trim() ? formatNumber(phone) : '{number}';
    const text = template.template
      .replace(/{name}/g, template.name)
      .replace(/{country}/g, template.country)
      .replace(/{number}/g, formattedPhone);
    setCustomText(text);
  };

  const formatNumber = (num: string) => {
    let clean = num.replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('+')) return clean;
    return '+' + clean;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhoneNumber(val);
    updateTemplateText(selectedTemplate, val);
  };

  const handleRandomizeTemplate = () => {
    const randomTpl = FIX_TEMPLATES[Math.floor(Math.random() * FIX_TEMPLATES.length)];
    setSelectedTemplate(randomTpl);
    updateTemplateText(randomTpl, phoneNumber);
  };

  const activeEmail = userEmails.find(e => e.active) || userEmails[0];

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setIsSubmitting(true);
    setLogMessages([`[${new Date().toLocaleTimeString()}] Menyiapkan request banding...`]);
    setSuccessResult(null);

    const formattedPhone = formatNumber(phoneNumber);

    try {
      // Step-by-step terminal simulation effect
      const steps = [
        { msg: `Memformat nomor WhatsApp... Sukses: ${formattedPhone}`, delay: 400 },
        { msg: `Mengambil template bahasa: ${selectedTemplate.language.toUpperCase()} (${selectedTemplate.country})`, delay: 800 },
        { msg: useRealEmail 
          ? `Membuka SMTP Handshake dengan ${activeEmail?.email || 'N/A'}...` 
          : `Mengalokasikan satelit server proxy LesehTools SMTP Relay...`, delay: 1400 },
        { msg: useRealEmail
          ? `Melakukan otentikasi Gmail Secure App Password...`
          : `Mengkoneksikan ke antrian global WhatsApp Support...`, delay: 2000 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step.msg}`]);
      }

      // Call API
      const res = await fetch(`/api/user/${userId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: formattedPhone,
          templateName: `${selectedTemplate.name} (${selectedTemplate.country})`,
          language: selectedTemplate.language,
          customText,
          realEmail: useRealEmail,
          recipientEmail: recipientEmail
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengirim appeal.");
      }

      setLogMessages(prev => [
        ...prev,
        ...data.appeal.logs,
        `[${new Date().toLocaleTimeString()}] [PROSES BERHASIL] ID Appeal Anda: ${data.appeal.id.slice(0, 8)}...`
      ]);

      setSuccessResult(data.appeal);
      onAppealSubmitted(data.appeal);
      refreshUser();

      // Trigger automatic simulated reply in background after 6 seconds for realistic feedback!
      setTimeout(async () => {
        try {
          await fetch(`/api/user/${userId}/appeal/${data.appeal.id}/simulate-reply`, { method: "POST" });
          refreshUser();
        } catch (err) {
          console.error("Auto reply simulation failed", err);
        }
      }, 7000);

    } catch (err: any) {
      setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] [FATAL ERROR] ${err.message || err}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Send className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-base">🔧 FIX MERAH / BAN APPEAL</h2>
            <p className="text-xs text-gray-400">Ajukan banding pemulihan nomor WhatsApp terblokir</p>
          </div>
        </div>

        <button
          id="randomize-template-btn"
          type="button"
          onClick={handleRandomizeTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 hover:text-gray-950 text-emerald-400 text-xs font-semibold transition-all duration-200"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Template Acak
        </button>
      </div>

      <form onSubmit={handleSubmitAppeal} className="space-y-4">
        {/* Phone number input */}
        <div>
          <label htmlFor="phone-input" className="block text-xs text-gray-400 font-semibold mb-1.5">
            📱 Nomor WhatsApp Terblokir
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              id="phone-input"
              type="text"
              placeholder="Contoh: 628123456789 atau +628..."
              value={phoneNumber}
              onChange={handlePhoneChange}
              required
              className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white font-mono placeholder-gray-600 transition-all outline-none"
            />
          </div>
          <span className="text-[10px] text-gray-500 block mt-1">
            Format akan otomatis diubah menjadi format internasional (+628xxxx) saat dikirim.
          </span>
        </div>

        {/* Template Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="template-select" className="block text-xs text-gray-400 font-semibold mb-1.5">
              🌐 Pilih Template Appeal
            </label>
            <select
              id="template-select"
              value={FIX_TEMPLATES.indexOf(selectedTemplate)}
              onChange={(e) => setSelectedTemplate(FIX_TEMPLATES[parseInt(e.target.value)])}
              className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-gray-300 transition-all outline-none cursor-pointer"
            >
              {FIX_TEMPLATES.map((tpl, idx) => (
                <option key={idx} value={idx}>
                  [{tpl.language.toUpperCase()}] {tpl.country} — {tpl.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="recipient-select" className="block text-xs text-gray-400 font-semibold mb-1.5">
              📩 Email Tujuan (WhatsApp Support)
            </label>
            <input
              id="recipient-select"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="support@support.whatsapp.com"
              className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono placeholder-gray-600 outline-none"
            />
          </div>
        </div>

        {/* Appeal text area preview */}
        <div>
          <label htmlFor="custom-text-area" className="block text-xs text-gray-400 font-semibold mb-1.5">
            📝 Isi Surat Appeal (Bisa diedit manual)
          </label>
          <textarea
            id="custom-text-area"
            rows={5}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs text-gray-300 font-sans leading-relaxed outline-none"
          />
        </div>

        {/* SMTP dispatch switch */}
        <div className="bg-gray-950/60 border border-gray-850 p-4 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-emerald-400" />
              <div>
                <span className="text-xs text-white font-semibold block">Kirim via SMTP Gmail Pribadi Anda</span>
                <span className="text-[10px] text-gray-400 block">Kirim email asli menggunakan kredensial aktif Anda</span>
              </div>
            </div>
            <label htmlFor="smtp-toggle" className="relative inline-flex items-center cursor-pointer">
              <input
                id="smtp-toggle"
                type="checkbox"
                checked={useRealEmail}
                onChange={(e) => setUseRealEmail(e.target.checked)}
                disabled={userEmails.length === 0}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-disabled:opacity-30"></div>
            </label>
          </div>

          {userEmails.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded-lg flex items-start gap-2 text-[11px] leading-relaxed">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Belum ada Gmail SMTP yang diset. Anda hanya dapat menggunakan <strong>Mode Simulasi</strong>. 
                Sediakan email di panel <strong>"📧 EMAIL CONFIGURATOR"</strong> untuk mendukung kirim asli.
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-gray-400 border-t border-gray-900 pt-2 flex justify-between items-center">
              <span>Status Email Aktif: <strong className="text-white font-mono">{activeEmail ? activeEmail.email : 'None'}</strong></span>
              {useRealEmail && <span className="text-emerald-400 font-bold font-mono">SMTP AKTIF</span>}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          id="submit-appeal-btn"
          type="submit"
          disabled={isSubmitting || !phoneNumber.trim()}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/10"
        >
          {isSubmitting ? (
            <>
              <RotateCw className="h-4 w-4 animate-spin" />
              Memproses Banding...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Kirim Banding Sekarang
            </>
          )}
        </button>
      </form>

      {/* Terminal / Real-time logs box */}
      {(isSubmitting || logMessages.length > 0) && (
        <div className="mt-5 border border-gray-800 rounded-xl overflow-hidden bg-gray-950">
          <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-850">
            <span className="text-[10px] font-mono font-bold text-gray-400 tracking-wider">APPEAL SYSTEM TRANSMISSION LOGS</span>
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            </div>
          </div>
          <div className="p-3 font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto space-y-1 leading-normal">
            {logMessages.map((msg, idx) => (
              <div key={idx} className="whitespace-pre-wrap">{msg}</div>
            ))}
            {isSubmitting && <div className="text-gray-400 animate-pulse text-xs mt-1">● Transmitting packet over TLS securely...</div>}
          </div>
        </div>
      )}
    </div>
  );
};
