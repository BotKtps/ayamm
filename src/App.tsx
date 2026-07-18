import { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader';
import { AppealHub } from './components/AppealHub';
import { PendingBoard } from './components/PendingBoard';
import { EmailConfigurator } from './components/EmailConfigurator';
import { PremiumPanel } from './components/PremiumPanel';
import { ReferralPanel } from './components/ReferralPanel';
import { TelegramBotPanel } from './components/TelegramBotPanel';
import { UserStats, AppealHistory, EmailConfig } from './types';
import { ShieldAlert, BookOpen, ExternalLink, HelpCircle, Gift, Crown, Mail, Bot } from 'lucide-react';

export default function App() {
  const [userId, setUserId] = useState('6316932951'); // Seed with default Owner ID for instantly loaded data!
  const [userIdInput, setUserIdInput] = useState('6316932951');
  const [user, setUser] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appeal' | 'smtp' | 'premium' | 'referral' | 'telegram'>('appeal');

  // Load user data on mount or change of userId
  useEffect(() => {
    fetchUserData(userId);
  }, [userId]);

  const fetchUserData = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/user/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setUser({
          userId: data.user.userId,
          username: data.user.username,
          isPremium: data.user.status === 'premium',
          premiumExpiry: data.user.premiumExpiry,
          dailyUsed: data.user.dailyUsed,
          freeLimit: 1,
          referredBy: data.user.referredBy,
          referralCount: data.user.referralCount
        });
      }
    } catch (err) {
      console.error("Failed to load user info", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchUser = () => {
    if (userIdInput.trim()) {
      setUserId(userIdInput.trim());
    }
  };

  const handleAppealSubmitted = (newAppeal: AppealHistory) => {
    // We fetch user data to refresh list, limit counters, and keep it sync
    fetchUserData(userId);
  };

  const handleEmailsUpdated = (updatedEmails: EmailConfig[]) => {
    // Reload user data to synchronize emails list
    fetchUserData(userId);
  };

  const handleTriggerReply = async (appealId: string) => {
    setIsLoadingReply(appealId);
    try {
      const res = await fetch(`/api/user/${userId}/appeal/${appealId}/simulate-reply`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Reload user to get latest history status
        fetchUserData(userId);
      }
    } catch (err) {
      console.error("Failed to simulate reply", err);
    } finally {
      setIsLoadingReply(null);
    }
  };

  // Extract logs list and email configurations directly from user data or backend response
  const [fullUserHistory, setFullUserHistory] = useState<AppealHistory[]>([]);
  const [fullUserEmails, setFullUserEmails] = useState<EmailConfig[]>([]);

  useEffect(() => {
    if (userId) {
      fetch(`/api/user/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setFullUserHistory(data.user.appealHistory || []);
            setFullUserEmails(data.user.emails || []);
          }
        })
        .catch(err => console.error(err));
    }
  }, [userId, user]); // Reload whenever user changes

  return (
    <div className="min-h-screen bg-obsidian-dark text-gray-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-gray-950">
      {/* Background ambient glows */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-emerald-500/5 blur-3xl rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-teal-500/5 blur-3xl rounded-full pointer-events-none z-0" />

      {/* Header */}
      <AppHeader
        user={user}
        userIdInput={userIdInput}
        setUserIdInput={setUserIdInput}
        onSwitchUser={handleSwitchUser}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6 z-10">
        
        {/* Banner Alert if NOT premium */}
        {user && !user.isPremium && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Akun Anda Menggunakan Layanan Free</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Anda dibatasi {user.freeLimit} kali bypass per hari. Upgrade ke premium untuk menikmati bypass tak terbatas tanpa kuota.
                </p>
              </div>
            </div>
            <button
              id="banner-upgrade-btn"
              onClick={() => setActiveTab('premium')}
              className="bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-bold px-4 py-2 rounded-xl shrink-0 shadow-lg shadow-amber-500/10 transition"
            >
              Dapatkan Premium
            </button>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-px">
          <button
            id="tab-appeal-btn"
            onClick={() => setActiveTab('appeal')}
            className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 font-display flex items-center gap-2 transition-all ${
              activeTab === 'appeal'
                ? 'border-emerald-500 text-white bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            WhatsApp Appeal Hub
          </button>

          <button
            id="tab-smtp-btn"
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 font-display flex items-center gap-2 transition-all ${
              activeTab === 'smtp'
                ? 'border-emerald-500 text-white bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            SMTP Gmail Config
          </button>

          <button
            id="tab-premium-btn"
            onClick={() => setActiveTab('premium')}
            className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 font-display flex items-center gap-2 transition-all ${
              activeTab === 'premium'
                ? 'border-emerald-500 text-white bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            Premium Key Panel
          </button>

          <button
            id="tab-referral-btn"
            onClick={() => setActiveTab('referral')}
            className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 font-display flex items-center gap-2 transition-all ${
              activeTab === 'referral'
                ? 'border-emerald-500 text-white bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Gift className="h-3.5 w-3.5" />
            Referral & Rank
          </button>

          <button
            id="tab-telegram-btn"
            onClick={() => setActiveTab('telegram')}
            className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 font-display flex items-center gap-2 transition-all ${
              activeTab === 'telegram'
                ? 'border-emerald-500 text-white bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            Telegram Bot Setup
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'appeal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Input Form & Logs */}
              <div className="lg:col-span-7">
                <AppealHub
                  userEmails={fullUserEmails}
                  userId={userId}
                  isPremium={user?.isPremium || false}
                  onAppealSubmitted={handleAppealSubmitted}
                  refreshUser={() => fetchUserData(userId)}
                />
              </div>

              {/* Right Column: Historical monitor */}
              <div className="lg:col-span-5">
                <PendingBoard
                  appeals={fullUserHistory}
                  onTriggerReply={handleTriggerReply}
                  isLoadingReply={isLoadingReply}
                />
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <EmailConfigurator
              emails={fullUserEmails}
              userId={userId}
              onEmailsUpdated={handleEmailsUpdated}
            />
          )}

          {activeTab === 'premium' && (
            <PremiumPanel
              user={user}
              onPremiumActivated={(updatedUser) => {
                setUser(updatedUser);
                fetchUserData(userId);
              }}
            />
          )}

          {activeTab === 'referral' && (
            <ReferralPanel
              user={user}
              onReferralClaimed={(updatedUser) => {
                setUser(updatedUser);
                fetchUserData(userId);
              }}
            />
          )}

          {activeTab === 'telegram' && (
            <TelegramBotPanel userId={userId} />
          )}
        </div>

        {/* Footer Support Panel */}
        <footer className="border-t border-gray-850 pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>
            <p>© 2026 LesehTools. Built for security bypass & educational demonstrations.</p>
            <p className="mt-0.5 text-gray-600">Telegram Bot: @lesehtoolsbot | Creator: @LesehOffc</p>
          </div>
          <div className="flex gap-4">
            <a
              id="live-chat-link"
              href="https://t.me/LesehOffc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-400 font-semibold transition"
            >
              <span>Live Chat Admin</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-gray-800">|</span>
            <a
              id="telegram-bot-link"
              href="https://t.me/lesehtoolsbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-400 font-semibold transition"
            >
              <span>Telegram Bot Link</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
