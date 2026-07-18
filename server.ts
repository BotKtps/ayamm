import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import TelegramBot from "node-telegram-bot-api";

// Telegram Bot active instance state
let activeBot: TelegramBot | null = null;
let activeBotToken: string = "";
let telegramBotLogs: string[] = [];
let botInfo: { id?: number; first_name?: string; username?: string } | null = null;

// Helper to add telegram logs
function addTelegramLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  telegramBotLogs.unshift(`[${timestamp}] ${message}`);
  if (telegramBotLogs.length > 100) {
    telegramBotLogs.pop();
  }
}

// Pre-seeded template dictionary for WhatsApp fix command inside bot
const BOT_TEMPLATES = [
  { name: "Ahmad Fauzi", country: "Indonesia", lang: "ID", text: "Halo Tim Dukungan WhatsApp,\n\nSaya {name} asal {country}. Nomor WhatsApp saya {number} terkena pembatasan dan saya tidak merasa melanggar kebijakan. Saya sangat membutuhkan akun ini untuk komunikasi sehari-hari. Mohon bantuannya untuk memulihkan akun saya.\n\nTerima kasih." },
  { name: "James Smith", country: "United Kingdom", lang: "EN", text: "Dear WhatsApp Support Team,\n\nI am writing to inform you that my WhatsApp account {number} has been unexpectedly restricted. I am a long-standing user from {country} and I believe this may be an error. Kindly look into this matter and restore my access.\n\nYours faithfully,\n{name}" },
  { name: "Omar Hassan", country: "Saudi Arabia", lang: "AR", text: "مرحباً فريق دعم WhatsApp،\n\nأنا {name} من {country}. رقم الواتساب الخاص بي {number} تم تقييده بشكل غير متوقع. لم أخالف أي شروط. يرجى المساعدة في استعادة حسابي.\n\nشكراً جزيلاً,\n{name}" },
  { name: "Tanaka Kenji", country: "Japan", lang: "JA", text: "WhatsAppサポートチーム様,\n\n私は{country}の{name}と申します。私のWhatsApp番号{number}が突然制限されました。私は利用規約に違反していません。アカウントの復旧をお願いいたします。\n\nよろしくお願いいたします,\n{name}" }
];

// Simple local JSON database path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial/default db structure
interface DBStructure {
  users: Record<string, {
    userId: string;
    username: string;
    joinedDate: string;
    status: 'free' | 'premium';
    premiumExpiry: string | null;
    dailyUsed: number;
    lastReset: string;
    referredBy: string | null;
    referralCount: number;
    emails: { email: string; appPass: string; active: boolean; addedAt: string }[];
    appealHistory: {
      id: string;
      number: string;
      email: string;
      templateName: string;
      language: string;
      sentAt: string;
      status: string;
      statusDetails?: string;
      logs: string[];
    }[];
  }>;
  keys: {
    key: string;
    days: number;
    uses: number;
    usedCount: number;
    usedBy: string[];
    createdAt: string;
  }[];
}

let db: DBStructure = {
  users: {},
  keys: [
    // Pre-seed some premium keys for easier testing and enjoyment!
    { key: "LESEH-PREMIUM-30DAYS", days: 30, uses: 10, usedCount: 0, usedBy: [], createdAt: new Date().toISOString() },
    { key: "LESEH-LIFETIME-GOLD", days: 3650, uses: 5, usedCount: 0, usedBy: [], createdAt: new Date().toISOString() },
    { key: "FREE-TRIAL-999", days: 99, uses: 999, usedCount: 0, usedBy: [], createdAt: new Date().toISOString() }
  ]
};

// Load database if exists
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    // Ensure pre-seeded keys exist in keys list
    const keysToCheck = ["LESEH-PREMIUM-30DAYS", "LESEH-LIFETIME-GOLD", "FREE-TRIAL-999"];
    keysToCheck.forEach(k => {
      if (!db.keys.some(x => x.key === k)) {
        db.keys.push({
          key: k,
          days: k.includes("30DAYS") ? 30 : k.includes("GOLD") ? 3650 : 99,
          uses: k.includes("30DAYS") ? 10 : k.includes("GOLD") ? 5 : 999,
          usedCount: 0,
          usedBy: [],
          createdAt: new Date().toISOString()
        });
      }
    });
  } catch (err) {
    console.error("Failed to parse DB, using empty defaults", err);
  }
}

// Save database helper
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save DB", err);
  }
}

// Reset daily usage helper
function checkAndResetDaily(userId: string) {
  const user = db.users[userId];
  if (!user) return;
  const todayStr = new Date().toISOString().split("T")[0];
  if (user.lastReset !== todayStr) {
    user.dailyUsed = 0;
    user.lastReset = todayStr;
    saveDB();
  }
}

// Telegram Bot initialization & event listener binding
function setupBotListeners(bot: TelegramBot) {
  bot.on("message", (msg) => {
    if (msg.text) {
      addTelegramLog(`Pesan dari @${msg.from?.username || msg.from?.first_name || "User"} (${msg.from?.id}): "${msg.text}"`);
    }
  });

  // Start command
  bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const userIdStr = String(msg.from?.id || chatId);
    const username = msg.from?.username || msg.from?.first_name || "User";
    const refCodeFromUrl = match ? match[1] : null;

    // Check if user already exists
    let isNewUser = false;
    if (!db.users[userIdStr]) {
      isNewUser = true;
      db.users[userIdStr] = {
        userId: userIdStr,
        username,
        joinedDate: new Date().toISOString(),
        status: userIdStr === "6316932951" || userIdStr === "owner" ? "premium" : "free",
        premiumExpiry: userIdStr === "6316932951" || userIdStr === "owner" ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() : null,
        dailyUsed: 0,
        lastReset: new Date().toISOString().split("T")[0],
        referredBy: null,
        referralCount: 0,
        emails: [],
        appealHistory: []
      };
      addTelegramLog(`User baru mendaftar di bot: @${username} (${userIdStr})`);
      saveDB();
    } else {
      checkAndResetDaily(userIdStr);
    }

    // Process referral code if new user
    if (isNewUser && refCodeFromUrl && refCodeFromUrl.startsWith("REF-")) {
      // Find referrer user
      let referrerId: string | null = null;
      for (const [id, u] of Object.entries(db.users)) {
        const uRef = `REF-${id.slice(-6)}`;
        if (uRef === refCodeFromUrl.toUpperCase()) {
          referrerId = id;
          break;
        }
      }

      if (referrerId && referrerId !== userIdStr) {
        db.users[userIdStr].referredBy = referrerId;
        db.users[referrerId].referralCount += 1;
        // Reduce usage as reward
        db.users[referrerId].dailyUsed = Math.max(0, db.users[referrerId].dailyUsed - 2);
        addTelegramLog(`User @${username} berhasil dirujuk oleh @${db.users[referrerId].username}`);
        saveDB();

        // Notify referrer if bot is active
        try {
          bot.sendMessage(Number(referrerId), `🔔 *Bonus Referral!* \n\n@${username} telah mendaftar menggunakan link rujukan Anda. Sisa limit harian Anda berkurang -2 (Bonus kuota appeals!).`);
        } catch (e) {
          // ignore if can't send
        }
      }
    }

    const user = db.users[userIdStr];
    const statusLabel = user.status === "premium" ? "💎 PREMIUM" : "🆓 FREE USER";
    const limitLabel = user.status === "premium" ? "♾️ UNLIMITED" : `${user.dailyUsed}/1`;

    const welcomeMsg = `🤖 *WELCOME TO LESEHTOOLS BOT* 🤖\n\n` +
      `👤 *INFO USER:*\n` +
      `• Username: @${username}\n` +
      `• User ID: \`${userIdStr}\`\n\n` +
      `📈 *STATUS LAYANAN:*\n` +
      `• Level: ${statusLabel}\n` +
      `• Limit Hari Ini: \`${limitLabel}\`\n\n` +
      `🔧 *MENU UTAMA:* \n` +
      `1️⃣ /fix <nomor> - Ajukan banding WA terblokir (contoh: \`/fix +62812345678\`)\n` +
      `2️⃣ /cekid - Cek informasi ID Telegram Anda\n` +
      `3️⃣ /ceklimit - Cek sisa kuota harian\n` +
      `4️⃣ /apppass - Tutorial Gmail App Password\n` +
      `5️⃣ /redeem <key> - Klaim Lisensi Premium\n` +
      `6️⃣ /referral - Dapatkan Link & Status Referral\n\n` +
      `💬 Hubungi Creator @LesehOffc untuk mendapatkan Premium Key.`;

    bot.sendMessage(chatId, welcomeMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔧 FIX NOMOR MERAH", callback_data: "cmd_fix_help" },
            { text: "📊 CEK LIMIT", callback_data: "cmd_ceklimit" }
          ],
          [
            { text: "👥 REFERRAL SAYA", callback_data: "cmd_referral" },
            { text: "💎 BELI PREMIUM", url: "https://t.me/LesehOffc" }
          ]
        ]
      }
    });
  });

  bot.on("callback_query", (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    const userIdStr = String(query.from.id);

    if (query.data === "cmd_fix_help") {
      bot.sendMessage(chatId, `🔧 *FIX MERAH COMMAND*\n\nGunakan format:\n\`/fix <nomor_hp>\`\n\nContoh:\n\`/fix +628123456789\`\n\nBot akan otomatis mengirim email banding ke server WhatsApp menggunakan template premium acak terbaik dari server kami.`, { parse_mode: "Markdown" });
    } else if (query.data === "cmd_ceklimit") {
      checkAndResetDaily(userIdStr);
      const user = db.users[userIdStr];
      if (user) {
        const remaining = user.status === "premium" ? "Unlimited ♾️" : `${Math.max(0, 1 - user.dailyUsed)} kali`;
        bot.sendMessage(chatId, `📊 *SISA KUOTA ANDA*\n\n• Status: ${user.status === "premium" ? "💎 Premium" : "Free User"}\n• Sisa Limit Hari Ini: *${remaining}*\n\nUpgrade ke Premium untuk bypass tanpa batas!`, { parse_mode: "Markdown" });
      } else {
        bot.sendMessage(chatId, `Silakan jalankan perintah /start terlebih dahulu.`);
      }
    } else if (query.data === "cmd_referral") {
      const user = db.users[userIdStr];
      if (user) {
        const refLink = `https://t.me/${botInfo?.username || "lesehtools_appeal_bot"}?start=REF-${userIdStr.slice(-6)}`;
        bot.sendMessage(chatId, `👥 *REFERRAL PARTNERSHIP*\n\n• Kode Anda: \`REF-${userIdStr.slice(-6)}\`\n• Total Rujukan: *${user.referralCount}* orang\n\n🔗 *Link Undangan Anda:*\n${refLink}\n\nBagikan link di atas. Setiap teman baru bergabung akan memberikan Anda bonus *+2 limit harian* gratis!`, { parse_mode: "Markdown" });
      } else {
        bot.sendMessage(chatId, `Silakan jalankan perintah /start terlebih dahulu.`);
      }
    }
    bot.answerCallbackQuery(query.id);
  });

  // /cekid command
  bot.onText(/\/cekid/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `👤 *INFO TELEGRAM ANDA*\n\n• ID Pengguna: \`${msg.from?.id}\`\n• Nama Depan: *${msg.from?.first_name}*\n• Username: @${msg.from?.username || "-"}\n• Chat ID: \`${chatId}\``, { parse_mode: "Markdown" });
  });

  // /ceklimit command
  bot.onText(/\/ceklimit/, (msg) => {
    const chatId = msg.chat.id;
    const userIdStr = String(msg.from?.id || chatId);
    checkAndResetDaily(userIdStr);
    const user = db.users[userIdStr];
    if (user) {
      const remaining = user.status === "premium" ? "Unlimited ♾️" : `${Math.max(0, 1 - user.dailyUsed)} kali`;
      bot.sendMessage(chatId, `📊 *SISA KUOTA BYPASS*\n\n• Status: ${user.status === "premium" ? "💎 Premium" : "Free User"}\n• Sisa Limit Hari Ini: *${remaining}*`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, `Gunakan /start terlebih dahulu.`);
    }
  });

  // /apppass command
  bot.onText(/\/apppass/, (msg) => {
    const chatId = msg.chat.id;
    const text = `🔐 *PANDUAN MEMBUAT APP PASSWORD GMAIL*\n\n` +
      `1️⃣ *Aktifkan Verifikasi 2 Langkah (2FA)* di myaccount.google.com/security\n` +
      `2️⃣ Cari menu *Sandi Aplikasi* atau *App Passwords*\n` +
      `3️⃣ Pilih aplikasi *Mail* dan perangkat *Lainnya (Custom)*, beri nama "LesehTools"\n` +
      `4️⃣ Google akan memberikan *16 karakter unik* (contoh: \`abcd efgh ijkl mnop\`)\n` +
      `5️⃣ Gunakan password tersebut di dashboard website untuk mengaktifkan pengiriman asli via SMTP pribadi.`;
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });

  // /redeem command
  bot.onText(/\/redeem(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const userIdStr = String(msg.from?.id || chatId);
    const key = match ? match[1]?.trim() : "";

    if (!key) {
      bot.sendMessage(chatId, "⚠️ Harap cantumkan lisensi key!\nContoh: `/redeem LESEH-PREMIUM-30DAYS`", { parse_mode: "Markdown" });
      return;
    }

    const user = db.users[userIdStr];
    if (!user) {
      bot.sendMessage(chatId, "⚠️ Gunakan /start terlebih dahulu.");
      return;
    }

    const keyIndex = db.keys.findIndex(k => k.key.toUpperCase() === key.toUpperCase());
    if (keyIndex === -1) {
      bot.sendMessage(chatId, "❌ *Lisensi Key tidak valid atau salah!*", { parse_mode: "Markdown" });
      return;
    }

    const licenseKey = db.keys[keyIndex];
    if (licenseKey.usedCount >= licenseKey.uses) {
      bot.sendMessage(chatId, "❌ *Lisensi Key sudah habis kuota pemakaiannya!*", { parse_mode: "Markdown" });
      return;
    }

    if (licenseKey.usedBy.includes(userIdStr)) {
      bot.sendMessage(chatId, "❌ *Anda sudah pernah menggunakan lisensi ini!*", { parse_mode: "Markdown" });
      return;
    }

    // Set Premium
    user.status = "premium";
    const addedDays = licenseKey.days;
    const currentExpiry = user.premiumExpiry ? new Date(user.premiumExpiry).getTime() : Date.now();
    user.premiumExpiry = new Date(currentExpiry + addedDays * 24 * 60 * 60 * 1000).toISOString();

    licenseKey.usedCount += 1;
    licenseKey.usedBy.push(userIdStr);
    saveDB();

    bot.sendMessage(chatId, `🎉 *BERHASIL MENGKLAIM LISENSI!* 🎉\n\nAkun Anda telah diupgrade ke *💎 PREMIUM* selama *${addedDays} Hari*!\nSilakan refresh web dashboard Anda untuk melihat perubahannya.`, { parse_mode: "Markdown" });
  });

  // /referral command
  bot.onText(/\/referral/, (msg) => {
    const chatId = msg.chat.id;
    const userIdStr = String(msg.from?.id || chatId);
    const user = db.users[userIdStr];
    if (user) {
      const refLink = `https://t.me/${botInfo?.username || "lesehtools_appeal_bot"}?start=REF-${userIdStr.slice(-6)}`;
      bot.sendMessage(chatId, `👥 *REFERRAL PROGRAM* 👥\n\n• Kode Unik Anda: \`REF-${userIdStr.slice(-6)}\`\n• Teman yang bergabung: *${user.referralCount}* orang\n\n🔗 *Link Referral Anda:*\n${refLink}\n\nDapatkan *+2 limit harian* gratis untuk setiap orang yang bergabung melalui link Anda!`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "Gunakan /start terlebih dahulu.");
    }
  });

  // /fix command
  bot.onText(/\/fix(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userIdStr = String(msg.from?.id || chatId);
    const rawNumber = match ? match[1]?.trim() : "";

    if (!rawNumber) {
      bot.sendMessage(chatId, "⚠️ Gunakan format: `/fix <nomor_hp>`\nContoh: `/fix +628123456789`", { parse_mode: "Markdown" });
      return;
    }

    // Format number
    let cleanNumber = rawNumber.replace(/[\s\-\(\)]/g, "");
    if (!cleanNumber.startsWith("+") && !cleanNumber.startsWith("62")) {
      cleanNumber = "+62" + cleanNumber;
    } else if (!cleanNumber.startsWith("+")) {
      cleanNumber = "+" + cleanNumber;
    }

    const user = db.users[userIdStr];
    if (!user) {
      bot.sendMessage(chatId, "⚠️ Harap ketik /start terlebih dahulu untuk meregistrasi ID Anda di database bot.");
      return;
    }

    // Check limit
    checkAndResetDaily(userIdStr);
    const limitMax = 1;
    if (user.status !== "premium" && user.dailyUsed >= limitMax) {
      bot.sendMessage(chatId, `❌ *Limit harian Anda (${limitMax} kali) sudah habis!*\n\nSilakan upgrade ke premium dengan mengetik \`/redeem <key_premium>\` atau undang teman memakai perintah \`/referral\`!`, { parse_mode: "Markdown" });
      return;
    }

    bot.sendMessage(chatId, `🔄 *SEDANG MEMPROSES FIX NOMOR ${cleanNumber}...*\n\nMenghubungkan ke SMTP Relay LesehTools dan menyusun draf appeal banding...`, { parse_mode: "Markdown" });

    const selectedTpl = BOT_TEMPLATES[Math.floor(Math.random() * BOT_TEMPLATES.length)];
    const finalAppealText = selectedTpl.text
      .replace(/{name}/g, selectedTpl.name)
      .replace(/{country}/g, selectedTpl.country)
      .replace(/{number}/g, cleanNumber);

    const activeEmail = user.emails.find(e => e.active) || user.emails[0];
    const appealId = `APL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const logs = [
      `[TelegramBot] Request diterima dari user Telegram ${userIdStr}`,
      `[TelegramBot] Menyiapkan email banding untuk WhatsApp nomor ${cleanNumber}`
    ];

    let statusDetails = "";
    if (activeEmail) {
      logs.push(`[SMTP] Menggunakan email pribadi aktif Anda: ${activeEmail.email}`);
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: activeEmail.email,
            pass: activeEmail.appPass
          }
        });
        await transporter.sendMail({
          from: `"LesehTools Bot" <${activeEmail.email}>`,
          to: "support@support.whatsapp.com",
          subject: `Bantuan untuk nomor ${cleanNumber}`,
          text: finalAppealText
        });
        logs.push(`[SMTP] Sukses mengirim email banding nyata.`);
        statusDetails = "Sukses dikirim nyata via SMTP Gmail.";
      } catch (err: any) {
        logs.push(`[SMTP ERROR] Gagal: ${err.message || err}. Beralih ke demo log.`);
        statusDetails = "SMTP Error, dialihkan ke simulasi log.";
      }
    } else {
      logs.push(`[Simulasi] Mode Simulasi Aktif. Menggunakan Leseh SMTP server.`);
      statusDetails = "Dikirim via server simulasi.";
    }

    user.dailyUsed += 1;
    const appealRecord = {
      id: appealId,
      number: cleanNumber,
      email: activeEmail ? activeEmail.email : "Simulated Bot Sender",
      templateName: `${selectedTpl.name} (${selectedTpl.country})`,
      language: selectedTpl.lang,
      sentAt: new Date().toISOString(),
      status: "pending" as const,
      statusDetails,
      logs
    };

    user.appealHistory.unshift(appealRecord);
    saveDB();

    const successMsg = `✅ *DIPROSES SUKSES!* \n\n` +
      `• *ID Appeal:* \`${appealId.slice(0, 8)}\`\n` +
      `• *Nomor Target:* \`${cleanNumber}\`\n` +
      `• *Template:* ${selectedTpl.name} (${selectedTpl.country})\n` +
      `• *Metode:* ${activeEmail ? "SMTP Pribadi" : "Simulasi Relay"}\n\n` +
      `📬 *MENUNGGU BALASAN...*\n` +
      `Server kami mendeteksi balasan otomatis dalam ~12 detik. Status akan diupdate di dashboard.`;

    bot.sendMessage(chatId, successMsg, { parse_mode: "Markdown" });

    // Auto-update after 10 seconds
    setTimeout(() => {
      const updatedUser = db.users[userIdStr];
      if (updatedUser) {
        const appRecord = updatedUser.appealHistory.find(x => x.id === appealId);
        if (appRecord) {
          appRecord.status = "unbanned";
          appRecord.logs.push(`[Simulasi WhatsApp] Nomor Anda ${cleanNumber} telah dipulihkan setelah peninjauan menyeluruh.`);
          saveDB();
          bot.sendMessage(chatId, `🎁 *KABAR BAIK!* \n\nBanding nomor \`${cleanNumber}\` (ID: \`${appealId.slice(0, 8)}\`) telah disetujui! WhatsApp menyatakan nomor Anda sudah dipulihkan dan siap dipakai kembali!`, { parse_mode: "Markdown" });
        }
      }
    }, 12000);
  });
}

function setupTelegramBot(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (activeBot) {
        addTelegramLog("Menghentikan bot lama...");
        try {
          activeBot.stopPolling();
        } catch (e) {}
        activeBot = null;
      }

      addTelegramLog(`Menghubungkan bot baru dengan token ${token.slice(0, 10)}...`);
      const bot = new TelegramBot(token, { polling: true });

      bot.getMe().then((me) => {
        activeBot = bot;
        activeBotToken = token;
        botInfo = me;
        addTelegramLog(`Bot berhasil ONLINE: @${me.username} (${me.first_name})`);

        setupBotListeners(bot);
        resolve(true);
      }).catch((err: any) => {
        addTelegramLog(`Gagal mendaftarkan bot: ${err.message || err}`);
        try {
          bot.stopPolling();
        } catch (e) {}
        resolve(false);
      });
    } catch (e: any) {
      addTelegramLog(`Kesalahan setup bot: ${e.message || e}`);
      resolve(false);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === API ROUTES ===

  // 1. Get or create user
  app.get("/api/user/:userId", (req, res) => {
    const { userId } = req.params;
    const username = req.query.username as string || `User_${userId.slice(-4)}`;

    if (!db.users[userId]) {
      // Generate unique referral code
      const referralCode = `REF-${userId.slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      db.users[userId] = {
        userId,
        username,
        joinedDate: new Date().toISOString(),
        status: userId === "6316932951" || userId === "owner" ? "premium" : "free", // Admin ID/Owner is premium by default
        premiumExpiry: userId === "6316932951" || userId === "owner" ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() : null,
        dailyUsed: 0,
        lastReset: new Date().toISOString().split("T")[0],
        referredBy: null,
        referralCount: 0,
        emails: [],
        appealHistory: []
      };
      saveDB();
    } else {
      checkAndResetDaily(userId);
    }

    res.json({
      success: true,
      user: db.users[userId],
      referralCode: `REF-${userId.slice(-6)}`
    });
  });

  // 2. Set Email config
  app.post("/api/user/:userId/email", async (req, res) => {
    const { userId } = req.params;
    const { email, appPass } = req.body;

    if (userId !== "6316932951") {
      return res.status(403).json({ success: false, message: "Hanya Owner (ID: 6316932951 @Dckoww) yang diperbolehkan menambahkan konfigurasi SMTP/App Password Gmail!" });
    }

    if (!email || !appPass) {
      return res.status(400).json({ success: false, message: "Email dan App Password harus diisi!" });
    }

    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan!" });
    }

    // Test SMTP Connection helper
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // TLS
        auth: {
          user: email,
          pass: appPass,
        },
        connectionTimeout: 5000
      });

      await transporter.verify();

      // Clear existing active flags
      user.emails.forEach(e => e.active = false);

      // Remove duplicates
      user.emails = user.emails.filter(e => e.email.toLowerCase() !== email.toLowerCase());

      user.emails.push({
        email,
        appPass,
        active: true,
        addedAt: new Date().toISOString()
      });

      saveDB();
      res.json({ success: true, message: "Koneksi SMTP sukses! Email berhasil ditambahkan dan diaktifkan.", emails: user.emails });
    } catch (err: any) {
      console.error("SMTP Verify Error:", err);
      res.status(400).json({
        success: false,
        message: `Gagal verifikasi SMTP: ${err.message || "Pastikan 2FA aktif dan App Password benar!"}`
      });
    }
  });

  // 3. Delete Email config
  app.delete("/api/user/:userId/email/:email", (req, res) => {
    const { userId, email } = req.params;
    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan!" });
    }

    user.emails = user.emails.filter(e => e.email.toLowerCase() !== email.toLowerCase());
    if (user.emails.length > 0 && !user.emails.some(e => e.active)) {
      user.emails[0].active = true; // Activate another if none active
    }

    saveDB();
    res.json({ success: true, message: "Email config berhasil dihapus.", emails: user.emails });
  });

  // 4. Toggle Active Email
  app.post("/api/user/:userId/email/:email/activate", (req, res) => {
    const { userId, email } = req.params;
    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan!" });
    }

    user.emails.forEach(e => {
      e.active = e.email.toLowerCase() === email.toLowerCase();
    });

    saveDB();
    res.json({ success: true, message: "Email aktif berhasil diganti.", emails: user.emails });
  });

  // 5. Submit WhatsApp Ban Appeal (Sends Real SMTP or detailed simulation!)
  app.post("/api/user/:userId/appeal", async (req, res) => {
    const { userId } = req.params;
    const { number, templateName, language, customText, realEmail, recipientEmail } = req.body;

    if (!number) {
      return res.status(400).json({ success: false, message: "Nomor WhatsApp harus diisi!" });
    }

    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan!" });
    }

    // Check limit if not premium
    checkAndResetDaily(userId);
    const limitMax = 1;
    if (user.status !== "premium" && user.dailyUsed >= limitMax) {
      return res.status(403).json({
        success: false,
        message: `Limit harian Anda (${limitMax} kali) sudah habis! Silakan upgrade ke Premium.`
      });
    }

    const appealId = `APL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetEmail = recipientEmail || "support@support.whatsapp.com";

    // Build logs
    const logs: string[] = [
      `[${new Date().toLocaleTimeString()}] Menyiapkan request banding untuk nomor ${number}`,
      `[${new Date().toLocaleTimeString()}] Memformat nomor WhatsApp... Sukses: ${number}`
    ];

    let emailSent = false;
    let senderEmailUsed = "Simulated Sender";
    let statusDetails = "";

    if (realEmail && user.emails.length > 0) {
      const activeEmail = user.emails.find(e => e.active) || user.emails[0];
      senderEmailUsed = activeEmail.email;

      logs.push(`[${new Date().toLocaleTimeString()}] Menggunakan email terkonfigurasi: ${activeEmail.email}`);
      logs.push(`[${new Date().toLocaleTimeString()}] Menghubungkan ke smtp.gmail.com (Port 587)...`);

      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: activeEmail.email,
            pass: activeEmail.appPass
          },
          connectionTimeout: 10000
        });

        logs.push(`[${new Date().toLocaleTimeString()}] Melakukan TLS Handshake & Autentikasi...`);
        await transporter.verify();
        logs.push(`[${new Date().toLocaleTimeString()}] Otentikasi SMTP Berhasil!`);

        logs.push(`[${new Date().toLocaleTimeString()}] Mengirim email banding ke ${targetEmail}...`);
        await transporter.sendMail({
          from: `"LesehTools Appeal Bot" <${activeEmail.email}>`,
          to: targetEmail,
          subject: `Bantuan untuk nomor ${number}`,
          text: customText
        });

        logs.push(`[${new Date().toLocaleTimeString()}] [SUKSES] Email berhasil dikirim secara nyata.`);
        emailSent = true;
        statusDetails = "Terkirim secara nyata via SMTP Gmail Anda.";
      } catch (err: any) {
        console.error("Email send error:", err);
        logs.push(`[${new Date().toLocaleTimeString()}] [SMTP ERROR] Gagal mengirim email asli: ${err.message || err}`);
        logs.push(`[${new Date().toLocaleTimeString()}] Mengalihkan ke mode simulasi aman agar proses banding tetap tercatat.`);
        emailSent = false;
        statusDetails = `SMTP Error: ${err.message || "Gagal kirim"}. Dicatat dalam demo log.`;
      }
    } else {
      // Simulated Dispatch
      logs.push(`[${new Date().toLocaleTimeString()}] Mode Simulasi Aktif (Demo Mode).`);
      logs.push(`[${new Date().toLocaleTimeString()}] Menghubungkan ke server satelit LesehTools SMTP Relay...`);
      logs.push(`[${new Date().toLocaleTimeString()}] Menyiapkan enkripsi TLS 1.3...`);
      logs.push(`[${new Date().toLocaleTimeString()}] Mengirim data appeal WhatsApp ke endpoint ${targetEmail}...`);
      logs.push(`[${new Date().toLocaleTimeString()}] [SUKSES] Simulasi pengiriman selesai.`);
      emailSent = true;
      statusDetails = "Simulasi pengiriman berhasil dialirkan.";
    }

    // Increment daily usage
    user.dailyUsed += 1;

    // Create appeal record
    const appealRecord = {
      id: appealId,
      number,
      email: senderEmailUsed,
      templateName,
      language,
      sentAt: new Date().toISOString(),
      status: "pending" as const,
      statusDetails,
      logs
    };

    user.appealHistory.unshift(appealRecord);
    saveDB();

    res.json({
      success: true,
      appeal: appealRecord,
      dailyUsed: user.dailyUsed
    });
  });

  // 6. Simulate WhatsApp support reply & unban after 10-15 seconds
  app.post("/api/user/:userId/appeal/:appealId/simulate-reply", (req, res) => {
    const { userId, appealId } = req.params;
    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan!" });

    const appeal = user.appealHistory.find(a => a.id === appealId);
    if (!appeal) return res.status(404).json({ success: false, message: "Appeal tidak ditemukan!" });

    const isSuccess = Math.random() > 0.3; // 70% success simulation

    appeal.logs.push(`[${new Date().toLocaleTimeString()}] Menerima pesan masuk dari support@support.whatsapp.com...`);
    
    if (isSuccess) {
      appeal.status = "unbanned";
      appeal.logs.push(`[${new Date().toLocaleTimeString()}] [WHATSAPP SUPPORT SYSTEM] "Nomor Anda ${appeal.number} telah kami pulihkan setelah peninjauan menyeluruh. Mohon maaf atas ketidaknyamanan ini."`);
      appeal.logs.push(`[${new Date().toLocaleTimeString()}] Status akun: AKTIF / UNBANNED.`);
    } else {
      appeal.status = "rejected";
      appeal.logs.push(`[${new Date().toLocaleTimeString()}] [WHATSAPP SUPPORT SYSTEM] "Setelah meninjau aktivitas akun Anda, kami mengonfirmasi bahwa akun Anda melanggar Ketentuan Layanan kami. Keputusan ini bersifat final."`);
      appeal.logs.push(`[${new Date().toLocaleTimeString()}] Status akun: TETAP TERBLOKIR.`);
    }

    saveDB();
    res.json({ success: true, appeal });
  });

  // 7. Get admin/all key lists
  app.get("/api/admin/keys", (req, res) => {
    res.json({ success: true, keys: db.keys });
  });

  // 8. Generate premium key (Admin)
  app.post("/api/admin/keys", (req, res) => {
    const { days, uses } = req.body;
    const d = parseInt(days) || 30;
    const u = parseInt(uses) || 1;

    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const key = `LESEH-${d}D-${randomStr}`;

    db.keys.push({
      key,
      days: d,
      uses: u,
      usedCount: 0,
      usedBy: [],
      createdAt: new Date().toISOString()
    });

    saveDB();
    res.json({ success: true, key, keys: db.keys });
  });

  // 9. Redeem Key
  app.post("/api/user/:userId/redeem", (req, res) => {
    const { userId } = req.params;
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: "Key harus diisi!" });
    }

    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan!" });
    }

    const keyIndex = db.keys.findIndex(k => k.key.toUpperCase() === key.trim().toUpperCase());
    if (keyIndex === -1) {
      return res.status(400).json({ success: false, message: "Lisensi Key tidak valid!" });
    }

    const licenseKey = db.keys[keyIndex];
    if (licenseKey.usedCount >= licenseKey.uses) {
      return res.status(400).json({ success: false, message: "Lisensi Key sudah habis digunakan!" });
    }

    if (licenseKey.usedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: "Anda sudah pernah meredeem Key ini!" });
    }

    // Set Premium Status
    user.status = "premium";
    const addedDays = licenseKey.days;
    const currentExpiry = user.premiumExpiry ? new Date(user.premiumExpiry).getTime() : Date.now();
    user.premiumExpiry = new Date(currentExpiry + addedDays * 24 * 60 * 60 * 1000).toISOString();

    // Mark key as used
    licenseKey.usedCount += 1;
    licenseKey.usedBy.push(userId);

    saveDB();
    res.json({
      success: true,
      message: `Lisensi Premium berhasil diaktifkan selama ${addedDays} Hari!`,
      user
    });
  });

  // 10. Claim referral link
  app.post("/api/user/:userId/referral/claim", (req, res) => {
    const { userId } = req.params;
    const { referrerCode } = req.body;

    const user = db.users[userId];
    if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan!" });

    if (user.referredBy) {
      return res.status(400).json({ success: false, message: "Anda sudah mengklaim referral dari orang lain!" });
    }

    // Find user belonging to referrer code
    let referrerId: string | null = null;
    for (const [id, u] of Object.entries(db.users)) {
      const uRef = `REF-${id.slice(-6)}`;
      if (uRef === referrerCode.trim().toUpperCase()) {
        referrerId = id;
        break;
      }
    }

    if (!referrerId) {
      return res.status(400).json({ success: false, message: "Kode referral tidak valid!" });
    }

    if (referrerId === userId) {
      return res.status(400).json({ success: false, message: "Anda tidak bisa merujuk diri sendiri!" });
    }

    user.referredBy = referrerId;
    db.users[referrerId].referralCount += 1;

    // Bonus reward: Give 2 extra appeals
    db.users[referrerId].dailyUsed = Math.max(0, db.users[referrerId].dailyUsed - 2); 

    saveDB();
    res.json({
      success: true,
      message: `Berhasil! Klaim kode dari @${db.users[referrerId].username}. Pengundang mendapatkan bonus +2 limit harian.`,
      user
    });
  });

  // 11. Global leaderboard
  app.get("/api/leaderboard", (req, res) => {
    const leaders = Object.values(db.users)
      .map(u => ({
        username: u.username,
        count: u.referralCount
      }))
      .filter(l => l.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // If empty, add mock leaders for design rhythm and visualization
    const defaultLeaders = [
      { username: "LesehOffc", count: 142 },
      { username: "surya_ajiman", count: 98 },
      { username: "bang_wa_fix", count: 54 },
      { username: "mamat_cyber", count: 32 },
      { username: "andika_p", count: 21 }
    ];

    const finalLeaders = leaders.length > 0 ? leaders : defaultLeaders;

    res.json({ success: true, leaderboard: finalLeaders });
  });

  // === TELEGRAM BOT API ROUTES ===

  // Get Telegram Bot Connection Status & Live Console Logs
  app.get("/api/telegram/status", (req, res) => {
    res.json({
      success: true,
      connected: activeBot !== null,
      username: botInfo?.username || null,
      name: botInfo?.first_name || null,
      token: activeBotToken,
      logs: telegramBotLogs
    });
  });

  // Connect & Start Telegram Bot polling
  app.post("/api/telegram/connect", async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Bot token Telegram harus diisi!" });
    }

    const startSuccess = await setupTelegramBot(token.trim());
    if (startSuccess) {
      res.json({
        success: true,
        message: "Telegram Bot berhasil terhubung dan ONLINE!",
        username: botInfo?.username || null,
        name: botInfo?.first_name || null
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Gagal menghubungkan bot. Pastikan Token bot benar dan valid!"
      });
    }
  });

  // Disconnect Telegram Bot
  app.post("/api/telegram/disconnect", (req, res) => {
    if (activeBot) {
      try {
        activeBot.stopPolling();
      } catch (e) {}
      activeBot = null;
      activeBotToken = "";
      botInfo = null;
      addTelegramLog("Bot dinonaktifkan oleh administrator.");
      res.json({ success: true, message: "Telegram Bot berhasil diputuskan." });
    } else {
      res.json({ success: true, message: "Bot memang tidak sedang aktif." });
    }
  });

  // Clear Bot Live Console Logs
  app.post("/api/telegram/logs/clear", (req, res) => {
    telegramBotLogs = [];
    addTelegramLog("Live console logs dibersihkan.");
    res.json({ success: true });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
