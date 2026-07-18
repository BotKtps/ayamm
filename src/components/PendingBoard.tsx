import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { AppealHistory } from '../types';

interface PendingBoardProps {
  appeals: AppealHistory[];
  onTriggerReply: (appealId: string) => void;
  isLoadingReply: string | null;
}

export const PendingBoard: React.FC<PendingBoardProps> = ({
  appeals,
  onTriggerReply,
  isLoadingReply
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unbanned':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            UNBANNED
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2.5 py-0.5 rounded-full">
            <XCircle className="h-3 w-3" />
            REJECTED
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      case 'sending':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-0.5 rounded-full animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            SENDING
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
            <Clock className="h-3 w-3 animate-pulse" />
            AWAITING REPLY
          </span>
        );
    }
  };

  return (
    <div className="bg-gray-900/40 border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl">
      <div className="flex items-center gap-2.5 mb-5 border-b border-gray-850 pb-4">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <Clock className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-white text-base">📊 MONITOR RIWAYAT BANDING</h2>
          <p className="text-xs text-gray-400">Cek status real-time nomor terdaftar dari satelit sistem</p>
        </div>
      </div>

      {appeals.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl bg-gray-950/20">
          <FileText className="h-10 w-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-semibold">Belum Ada Riwayat Banding</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Silakan masukkan nomor WhatsApp Anda di atas untuk mengajukan banding pemulihan.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {appeals.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`border border-gray-850 rounded-xl transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'bg-gray-950/50 ring-1 ring-emerald-500/10' : 'bg-gray-950/20 hover:bg-gray-950/45'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white text-sm md:text-base">
                      {item.number}
                    </span>
                    <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded font-mono">
                      {item.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(item.status)}
                    <button
                      id={`expand-btn-${item.id}`}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-850 bg-gray-950/60 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-0.5">Waktu Pengiriman</span>
                        <span className="text-gray-300 font-medium">
                          {new Date(item.sentAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Template & Pengirim</span>
                        <span className="text-gray-300 font-medium">
                          {item.templateName} via {item.email}
                        </span>
                      </div>
                    </div>

                    {/* Trigger reply simulation */}
                    {item.status === 'pending' && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <span className="text-xs text-emerald-400 font-semibold block">Dapatkan Balasan Otomatis</span>
                          <span className="text-[10px] text-gray-400 block">
                            Simulasikan peninjauan dan balasan WhatsApp dalam 2 detik.
                          </span>
                        </div>
                        <button
                          id={`simulate-reply-btn-${item.id}`}
                          onClick={() => onTriggerReply(item.id)}
                          disabled={isLoadingReply === item.id}
                          className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all"
                        >
                          {isLoadingReply === item.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Menilai...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3" />
                              Simulasi Balasan
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Logs console */}
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider font-bold block mb-1">
                        PROCESS LOGS
                      </span>
                      <div className="p-3 bg-gray-950 border border-gray-850 rounded-lg font-mono text-[10px] text-emerald-500/90 space-y-1 max-h-32 overflow-y-auto">
                        {item.logs.map((log, lIdx) => (
                          <div key={lIdx}>{log}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
