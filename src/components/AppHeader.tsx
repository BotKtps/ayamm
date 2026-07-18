import React from 'react';
import { Crown, Sparkles, RefreshCw, Send, CheckCircle, Clock } from 'lucide-react';
import { UserStats } from '../types';

interface AppHeaderProps {
  user: UserStats | null;
  userIdInput: string;
  setUserIdInput: (val: string) => void;
  onSwitchUser: () => void;
  isLoading: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  userIdInput,
  setUserIdInput,
  onSwitchUser,
  isLoading
}) => {
  return (
    <header className="border-b border-gray-800 bg-gray-950/70 backdrop-blur-md sticky top-0 z-50 px-4 py-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-5 w-5 text-gray-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-white">LesehTools</h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono px-2 py-0.5 rounded-full font-bold">
                V2.20
              </span>
            </div>
            <p className="text-xs text-gray-400">WhatsApp Banned Appeal & Automation Hub</p>
          </div>
        </div>

        {/* User Status / ID Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {user && (
            <div className="flex items-center gap-2.5 bg-gray-900 border border-gray-800 px-3.5 py-1.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${user.isPremium ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span className="font-mono text-xs text-gray-300 font-semibold">ID: {user.userId}</span>
              </div>
              
              <div className="h-3 w-px bg-gray-800" />

              {user.isPremium ? (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-md font-bold">
                  <Crown className="h-3 w-3 fill-emerald-400/20" />
                  PREMIUM
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md font-bold">
                  FREE USER
                </div>
              )}

              <div className="h-3 w-px bg-gray-800" />
              
              <div className="text-xs text-gray-400">
                Limit Hari Ini: <span className="font-mono font-bold text-white">{user.isPremium ? '♾️' : `${user.dailyUsed}/${user.freeLimit}`}</span>
              </div>
            </div>
          )}

          {/* Switcher Form */}
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 p-1 rounded-xl w-full sm:w-auto max-w-xs">
            <input
              id="user-id-input"
              type="text"
              placeholder="Ganti Telegram ID..."
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none px-2 w-28 sm:w-32 font-mono"
            />
            <button
              id="switch-user-btn"
              onClick={onSwitchUser}
              disabled={isLoading || !userIdInput.trim()}
              className="bg-gray-800 hover:bg-emerald-500 hover:text-gray-950 text-gray-300 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Ganti
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
