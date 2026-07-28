const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs-extra');
const path = require('path');

// ==================== إعدادات الملفات ====================
const configPath = './config.json';
const sessionsPath = './sessions.json';
const groupsPath = './groups.json';

// متغير عام للتحكم في إيقاف الإعلانات أثناء إرسالها
let isAdvertisingActive = false;

// ==================== قائمة الكلمات المفتاحية الكاملة ====================
const defaultKeywords = [
    // طلبات بحوث ومشاريع
    "بنات تعرفون حد يسوي بحوث تخرج", "بنات تعرفون حد يسوي مشاريع", "بنات تعرفون حد يسوي سكليف", "بنات تعرفون حد يسوي عرض",
    "بنات تعرفون حد يسوي برزنتيشن", "بنات تعرفون أحد يسوي بحوث", "بنات تعرفون أحد يسوي مشروع", "بنات تعرفون أحد يسوي واجبات",
    "بنات تعرفون أحد يسوي تقارير", "بنات تعرفون أحد يسوي عروض", "بنات تعرفون أحد يسوي برزنتيشن", "بنات بغيت حد فاهم في البحوث",
    "بنات محتاجة حد يسوي لي الواجب", "بنات ساعدوني أبي خدمات طلابية", "تعرفون أحد يسوي بحوث", "تعرفون أحد يسوي مشروع",
    "تعرفون أحد يسوي واجبات", "تعرفون أحد يسوي سكليف", "تعرفون أحد يسوي برزنتيشن", "تعرفون أحد يسوي عروض بوربوينت",
    "تعرفون أحد يسوي كل التكاليف", "تعرفون أحد مضمون", "من يعرف حد يسوي واجبات", "من يعرف حد يسوي مشاريع",
    "من يعرف حد يسوي بحوث", "من يعرف حد يسوي تقارير", "من يعرف حد يسوي عروض", "من يعرف حد يسوي برزنتيشن",
    "من يعرف حد يسوي سكليف", "من تعرف وحدة تسوي تكاليف", "من تعرف وحدة ممتازة", "من يسوي واجبات", "من يسوي مشاريع",
    "من يسوي بحوث", "من يسوي تقارير", "من يسوي تلخيص", "من يسوي اختبارات", "من يسوي تقرير تدريب", "من يسوي مشروع تخرج",
    "من يسوي عروض احترافية", "من يسوي Excel", "من يسوي Access", "من يسوي APA", "من عندها رقم خدمات طلابية",
    "من عندها شخص مجرب", "من عنده شخص ثقة للخدمات الطلابية", "حد عنده حد ثقة يسوي واجبات", "حد عنده حد ثقة يسوي مشاريع",
    "حد عنده حد ثقة يسوي بحوث", "حد عنده حد ثقة يسوي سكليف", "حد عنده حد ثقة يسوي تقارير", "حد عنده مصمم فيديو",
    "حد عنده مصمم دعوات", "حد يعرف أحد يحل واجبات", "حد يعرف أحد يحل اختبارات", "حد يعرف أحد يسوي مشاريع",
    "حد يعرف أحد يسوي بحوث", "حد يعرف أحد يسوي عروض", "حد يعرف أحد يصمم فيديو", "حد يعرف أحد يصمم دعوة زواج",
    "أحد يعرف خدمات طلابية", "أحد عنده خدمات طلابية", "أحد عنده رقم وحدة تسوي بحوث", "أحد مجرب خدمات طلابية",
    "أحد يسوي واجبات", "أحد يسوي Word", "أحد يضمن الدرجة", "أحد متفرغ اليوم", "أبي حد يسوي واجبات", "أبي حد يسوي مشاريع",
    "أبي حد يسوي بحث", "أبي حد يسوي سكليف", "أبي حد يسوي تقرير", "أبي حد يسوي عرض بوربوينت", "أبي حد يسوي برزنتيشن",
    "أبي حد يسوي تكليف", "أبي أحد يسوي مشروع", "أبي أحد يسوي مشروع تخرج", "أبي أحد يسوي واجبات", "أبي أحد يسوي بحث",
    "أبي أحد يكتب بحث كامل", "أبي أحد يسوي برزنتيشن", "أبي أحد يسوي عرض بوربوينت", "أبي أحد يسوي سكليف",
    "أبي أحد يسوي تقرير", "أبي أحد يسوي مشاريع الجامعة", "أبي أحد يخلص المشروع كامل", "أبي أحد يخلص الأبحاث",
    "أبي أحد يخلص التكليف", "أبي أحد يخلص واجبات الجامعة", "أبي أحد يخلص لي الواجب", "أبي أحد يخلص لي المشروع",
    "أبي أحد يخلص لي البحث", "أبي أحد يخلص لي كل موادي", "أبي أحد يحل الكويز", "أبي أحد يحل الاختبار",
    "أبي أحد ينجز اليوم", "أبي أحد يخلص قبل الموعد", "أبي أحد شغله احترافي", "أبي أحد شغله مضمون",
    "أبي أحد أسعاره مناسبة", "أبي شخص ثقة", "أبي شخص مضمون", "أبي شغل مرتب وسريع", "أبي خدمات جامعية كاملة",
    "أبي تنسيق بحث", "أبي تدقيق لغوي", "محتاج حد يسوي لي واجبات", "محتاجة حد يسوي لي الواجب", "محتاجة حد يسوي لي مشروع",
    "محتاجة حد يسوي لي بحث", "محتاجة أحد يسوي بحث", "محتاجة أحد يخلص التكليف", "يعيال حد عنده أحد ثقة",
    "يعيال من يعرف أحد يسوي واجبات", "يعيال من يعرف أحد يسوي مشاريع", "يعيال من يعرف أحد يسوي بحوث",
    "ابغي حد يسوي بحوث", "ابغي حد يسوي برزنتيشن", "ابغي حد يسوي بوربوينت", "ابغي حد يسوي تقرير",
    "ابغي حد يسوي مشروع", "ابغي حد يسوي واجبات", "ابغي حد يسوي تكاليف", "ابغي حد يسوي سكليف",
    "ابغي حد يسوي عرض", "بغيت حد فاهم في البحوث", "بغيت حد فاهم في المشاريع", "بغيت حد فاهم في التقارير",
    "بغيت حد ثقة",
    // تصميم ومونتاج
    "ابي حد يصمم لي فيديو", "ابي حد يسوي مونتاج", "ابي حد يصمم لي مونتاج", "ابي حد يصمم لي دعوة زواج",
    "ابي حد يصمم لي دعوة", "ابي حد يصمم اعلان", "ابي حد يصمم بوستر", "ابي حد يصمم شعار", "ابي حد يصمم لوجو",
    "ابي حد يصمم هوية بصرية", "ابي حد يصمم انفوجرافيك", "ابي حد يصمم سيرة ذاتية", "ابي حد يصمم برزنتيشن",
    "ابي حد يسوي تصميم احترافي", "ابي حد يمنتج فيديو", "ابي حد يسوي موشن جرافيك", "ابي حد يصمم ريلز",
    "ابي حد يصمم سناب", "ابي حد يصمم منشورات", "ابي حد يصمم بطاقة دعوة", "من يعرف مصمم فيديو",
    "من يعرف مصمم دعوات", "من يعرف مصمم ثقة", "بنات تعرفون مصمم فيديو", "بنات تعرفون أحد يصمم دعوات",
    // Excel, Word, PowerPoint, Access
    "من يسوي اكسل", "من يسوي Excel", "أبي أحد يسوي اكسل", "أبي أحد يسوي Excel", "أبي حد يسوي اكسل",
    "أبي حد يسوي Excel", "ابغي حد يسوي اكسل", "ابغي حد يسوي Excel", "من يعرف أحد يسوي اكسل",
    "من يعرف أحد يسوي Excel", "تعرفون أحد يسوي اكسل", "تعرفون أحد يسوي Excel", "حد يسوي اكسل",
    "حد يسوي Excel", "أحد يسوي اكسل", "أحد يسوي Excel", "محتاج أحد يسوي اكسل", "محتاجة أحد يسوي اكسل",
    "بنات تعرفون أحد يسوي اكسل", "يعيال من يسوي اكسل", "من يسوي باوربوينت", "من يسوي بوربوينت",
    "أبي أحد يسوي باوربوينت", "أبي أحد يسوي بوربوينت", "ابغي حد يسوي باوربوينت", "ابغي حد يسوي بوربوينت",
    "من يعرف أحد يسوي باوربوينت", "من يعرف أحد يسوي بوربوينت", "تعرفون أحد يسوي باوربوينت",
    "تعرفون أحد يسوي بوربوينت", "من يسوي وورد", "من يسوي Word", "أبي أحد يسوي وورد", "أبي أحد يسوي Word",
    "ابغي حد يسوي وورد", "ابغي حد يسوي Word", "من يعرف أحد يسوي وورد", "تعرفون أحد يسوي وورد",
    "من يسوي اكسس", "من يسوي Access", "أبي أحد يسوي اكسس", "ابغي حد يسوي اكسس", "من يعرف أحد يسوي اكسس",
    "تعرفون أحد يسوي اكسس", "من يسوي برزنتيشن احترافي", "من يسوي بوربوينت احترافي",
    // CV
    "أبي أحد يسوي سيرة ذاتية", "من يسوي CV", "من يسوي سيفي", "أبي أحد يسوي CV", "أبي أحد يسوي سيفي",
    // كلمات إضافية للفلترة الذكية
    "ابي", "ابغي", "ابغى", "محتاج", "محتاجه", "محتاجة", "بغيت", "اريد", "من يسوي", "مين يسوي", "حد يسوي", "احد يسوي"
];

// ==================== مؤشرات الإعلانات (للاستبعاد) ====================
const adIndicators = [
    "نوفر لكم", "نقدم لكم", "نعلن عن", "خصم", "خصومات", "عرض خاص", "عرض حصري",
    "تواصل معنا", "للتواصل واتساب", "رابط الجروب", "اشترك الان", "خدماتنا", "فريقنا",
    "اسعار منافسة", "بأرخص الأسعار", "ضمان النجاح", "للتواصل على", "سارع بالحجز",
    "نحن متخصصون", "متخصصون في", "للتواصل خاص", "للتواصل عالخاص", "الدفع بعد التسليم"
];

// ==================== تهيئة الملفات ====================
if (!fs.existsSync(configPath)) {
    fs.writeJsonSync(configPath, {
        targetGroup: "",
        monitoringEnabled: true,
        adsEnabled: true,
        autoReplyEnabled: false,
        autoReplyText: "*مرحباً بك!*\n\nتواصل معنا مباشرة عبر الواتساب لتلبية طلبك بسرعة وسهولة 📥:\nhttps://wa.me/967734691582",
        keywords: defaultKeywords,
        ownerNumbers: ["967734691582", "967739172238", "966593341070"],
        smartFilter: true,
        adDelay: 2000
    });
}

if (!fs.existsSync(sessionsPath)) {
    fs.writeJsonSync(sessionsPath, []);
}

if (!fs.existsSync(groupsPath)) {
    fs.writeJsonSync(groupsPath, {
        targetGroups: [],
        excludedGroups: [],
        monitoredGroups: []
    });
}

let config = fs.readJsonSync(configPath);
let activeSessions = fs.readJsonSync(sessionsPath);
let groupsConfig = fs.readJsonSync(groupsPath);

function saveConfig() { fs.writeJsonSync(configPath, config, { spaces: 2 }); }
function saveSessions() { fs.writeJsonSync(sessionsPath, activeSessions, { spaces: 2 }); }
function saveGroups() { fs.writeJsonSync(groupsPath, groupsConfig, { spaces: 2 }); }

const logger = P({ level: 'silent' });
const socks = new Map();

// ==================== نظام الفلترة الذكية ====================
function smartDetect(text) {
    if (!text || typeof text !== 'string') return false;
    if (text.length > 150) return false;

    const urlPattern = /https?:\/\/\S+|www\.\S+|chat\.whatsapp\.com\/\S+/i;
    if (urlPattern.test(text)) return false;

    const lowerText = text.toLowerCase().trim();

    // استبعاد الإعلانات
    const isAd = adIndicators.some(adWord => lowerText.includes(adWord.toLowerCase()));
    if (isAd) return false;

    // 1. فحص الكلمات المفتاحية المباشرة
    const directMatch = config.keywords.some(k => lowerText.includes(k.toLowerCase()));
    if (directMatch) return true;

    // 2. الفلترة الذكية بالأنماط
    if (!config.smartFilter) return false;

    const patterns = [
        /(أبي|ابغي|ابغى|محتاج|محتاجه|محتاجة|بغيت|اريد)\s+.+\s+(يسوي|يصمم|يخلص|يحل|يكتب|يمنتج|يساعد|يفهم)/,
        /(من\s+يسوي|من\s+يعرف|مين\s+يسوي|مين\s+يعرف|حد\s+يعرف|أحد\s+يعرف|تعرفون)\s+/,
        /(حد\s+عنده|أحد\s+عنده)\s+/,
        /(خدمات\s+(طلابية|جامعية)|بحوث|مشاريع|واجبات|تقارير|تكاليف)/,
        /(يسوي\s+لي|يساعدني|ساعدوني|يسوي\s+لنا)/
    ];

    return patterns.some(pattern => pattern.test(lowerText));
}

// ==================== الحصول على اسم المجموعة ====================
async function getGroupName(sock, jid) {
    try {
        const metadata = await sock.groupMetadata(jid);
        return metadata.subject || "غير معروف";
    } catch (e) {
        return "غير معروف";
    }
}

// ==================== تنسيق التنبيه بنفس شكل الصورة ====================
function formatAlert(groupName, pushName, senderNumber, senderMention, phone, messageContent) {
    return `*تنبيه طلب جديد* 📢\n\n` +
           `*المجموعة:* 👥\n` +
           `${groupName}\n\n` +
           `*الاسم:* 👤\n` +
           `${senderMention}\n\n` +
           `*صاحب الرسالة:* 👤\n` +
           `${senderMention}\n\n` +
           `*عبر حساب:* 🤖\n` +
           `${phone}\n\n` +
           `*الرسالة:* 📝\n` +
           `${messageContent}`;
}

// ==================== بدء حساب ====================
async function startAccount(phone) {
    if (socks.has(phone)) return;

    const authFolder = `auth_info_${phone}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: false
    });

    socks.set(phone, sock);

    // توليد كود الربط
    if (!sock.authState.creds.registered) {
        console.log(`\n[INFO] جاري توليد كود الربط للرقم: ${phone}`);
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phone);
                console.log(`\n========================================\nالرقم: ${phone}\nكود الربط: ${code}\n========================================\n`);

                for (const [p, s] of socks.entries()) {
                    if (s.authState.creds.registered && p !== phone && config.targetGroup) {
                        await s.sendMessage(config.targetGroup, { text: `🔑 كود الربط للرقم ${phone} هو: *${code}*` });
                        break;
                    }
                }
            } catch (err) { console.error(`[ERROR] فشل توليد الكود:`, err.message); }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            if (shouldReconnect) {
                socks.delete(phone);
                startAccount(phone);
            } else {
                socks.delete(phone);
                activeSessions = activeSessions.filter(p => p !== phone);
                saveSessions();
            }
        } else if (connection === 'open') {
            console.log(`✅ الحساب ${phone} متصل!`);
            if (!activeSessions.includes(phone)) {
                activeSessions.push(phone);
                saveSessions();
            }
        }
    });

    // ==================== مراقبة الرسائل ====================
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message) continue;

            const jid = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            const pushName = msg.pushName || 'Unknown';

            // استخراج نص الرسالة
            let messageContent = '';
            if (msg.message.conversation) {
                messageContent = msg.message.conversation;
            } else if (msg.message.extendedTextMessage?.text) {
                messageContent = msg.message.extendedTextMessage.text;
            } else if (msg.message.imageMessage?.caption) {
                messageContent = msg.message.imageMessage.caption;
            } else if (msg.message.videoMessage?.caption) {
                messageContent = msg.message.videoMessage.caption;
            }
            messageContent = messageContent.trim();

            if (!messageContent) continue;

            // بيانات المرسل
            const rawParticipant = msg.key.participant || msg.participant || msg.key.remoteJid || "";
            const isLid = rawParticipant.endsWith("@lid");
            let senderNumber = "";
            let senderMention = "";
            let mentionsArray = [];

            if (isLid) {
                senderNumber = rawParticipant.split('@')[0];
                senderMention = `@${senderNumber}`;
                mentionsArray.push(rawParticipant);
            } else {
                senderNumber = rawParticipant.split('@')[0].split(':')[0];
                senderMention = `@${senderNumber}`;
                mentionsArray.push(rawParticipant);
            }

            const sender = rawParticipant;
            const isAdmin = fromMe || config.ownerNumbers.some(num => sender.includes(num));

            // ==================== أوامر الأدمن ====================
            if (isAdmin) {

                // ─── إيقاف الإعلانات الفوري ───
                if (messageContent === 'ايقاف الاعلانات' || messageContent === 'اوقف الاعلانات') {
                    isAdvertisingActive = false;
                    await sock.sendMessage(jid, { text: `🛑 تم إصدار أمر إيقاف الإعلانات. سيتم إيقاف النشر فوراً!` });
                    continue;
                }

                // ─── ربط رقم جديد ───
                if (messageContent.startsWith('ربط ')) {
                    const newPhone = messageContent.replace('ربط', '').replace(/\+/g, '').replace(/\s/g, '').trim();
                    if (newPhone.length > 8) {
                        await sock.sendMessage(jid, { text: `⏳ جاري بدء الربط للرقم ${newPhone}...` });
                        startAccount(newPhone);
                    }
                    continue;
                }

                // ─── إعلان من كل الحسابات ───
                if (messageContent.startsWith('اعلان ')) {
                    const adText = messageContent.replace('اعلان ', '').trim();
                    if (!adText) continue;

                    isAdvertisingActive = true;
                    await sock.sendMessage(jid, { text: `🚀 جاري نشر الإعلان من كافة الحسابات...\n*(لإيقافه أرسل: ايقاف الاعلانات)*` });

                    for (const [p, s] of socks.entries()) {
                        if (!isAdvertisingActive) break;
                        try {
                            const groups = await s.groupFetchAllParticipating();
                            for (const groupId in groups) {
                                if (!isAdvertisingActive) {
                                    await sock.sendMessage(jid, { text: `🛑 تم إيقاف حملة الإعلانات بنجاح.` });
                                    break;
                                }
                                if (groupsConfig.excludedGroups.includes(groupId)) continue;
                                if (groupsConfig.targetGroups.length > 0 && !groupsConfig.targetGroups.includes(groupId)) continue;

                                try {
                                    await s.sendMessage(groupId, { text: adText });
                                    await new Promise(r => setTimeout(r, config.adDelay || 2000));
                                } catch (e) {}
                            }
                        } catch (e) {}
                    }
                    if (isAdvertisingActive) {
                        await sock.sendMessage(jid, { text: `✅ تم الانتهاء من نشر الإعلان في جميع المجموعات.` });
                    }
                    isAdvertisingActive = false;
                    continue;
                }

                // ─── إعلان من حساب محدد ───
                if (messageContent.startsWith('اعلان-حساب ')) {
                    const parts = messageContent.replace('اعلان-حساب ', '').trim().split(' ');
                    if (parts.length < 2) {
                        await sock.sendMessage(jid, { text: `⚠️ الاستخدام الصحيح:\nاعلان-حساب [رقم_الحساب] [نص الإعلان]` });
                        continue;
                    }
                    const targetPhone = parts[0].replace(/\+/g, '').replace(/\s/g, '').trim();
                    const adText = parts.slice(1).join(' ');

                    const specificSock = socks.get(targetPhone);
                    if (!specificSock) {
                        await sock.sendMessage(jid, { text: `❌ الحساب ${targetPhone} غير متصل!` });
                        continue;
                    }

                    isAdvertisingActive = true;
                    await sock.sendMessage(jid, { text: `🚀 جاري نشر الإعلان من الحساب (${targetPhone}) في جميع المجموعات...\n*(لإيقافه أرسل: ايقاف الاعلانات)*` });

                    try {
                        const groups = await specificSock.groupFetchAllParticipating();
                        for (const groupId in groups) {
                            if (!isAdvertisingActive) {
                                await sock.sendMessage(jid, { text: `🛑 تم إيقاف حملة الإعلانات بنجاح.` });
                                break;
                            }
                            if (groupsConfig.excludedGroups.includes(groupId)) continue;
                            if (groupsConfig.targetGroups.length > 0 && !groupsConfig.targetGroups.includes(groupId)) continue;

                            try {
                                await specificSock.sendMessage(groupId, { text: adText });
                                await new Promise(r => setTimeout(r, config.adDelay || 2000));
                            } catch (e) {}
                        }
                        if (isAdvertisingActive) {
                            await sock.sendMessage(jid, { text: `✅ تم الانتهاء من نشر الإعلان في كافة المجموعات.` });
                        }
                    } catch (e) {}
                    isAdvertisingActive = false;
                    continue;
                }

                // ─── إعلان في مجموعة محددة من حساب محدد ───
                if (messageContent.startsWith('اعلان-مجموعة-حساب ')) {
                    const parts = messageContent.replace('اعلان-مجموعة-حساب ', '').trim().split(' ');
                    if (parts.length < 3) {
                        await sock.sendMessage(jid, { text: `⚠️ الاستخدام الصحيح:\nاعلان-مجموعة-حساب [الرقم] [اسم_المجموعة] [النص]` });
                        continue;
                    }
                    const targetPhone = parts[0];
                    const targetGroupName = parts[1];
                    const adText = parts.slice(2).join(' ');

                    const specificSock = socks.get(targetPhone);
                    if (!specificSock) {
                        await sock.sendMessage(jid, { text: `❌ الحساب ${targetPhone} غير متصل!` });
                        continue;
                    }

                    let foundAndSent = false;
                    try {
                        const groups = await specificSock.groupFetchAllParticipating();
                        for (const groupId in groups) {
                            const gName = groups[groupId].subject || "";
                            if (gName.toLowerCase().includes(targetGroupName.toLowerCase())) {
                                await specificSock.sendMessage(groupId, { text: adText });
                                foundAndSent = true;
                                await sock.sendMessage(jid, { text: `✅ تم نشر الإعلان في مجموعة: *${gName}*` });
                                break;
                            }
                        }
                    } catch (e) {}

                    if (!foundAndSent) {
                        await sock.sendMessage(jid, { text: `❌ لم يتم العثور على المجموعة بهذا الاسم.` });
                    }
                    continue;
                }

                // ─── تشغيل/إيقاف المراقبة ───
                if (messageContent === 'تشغيل مراقبة' || messageContent === 'شغل مراقبة') {
                    config.monitoringEnabled = true;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🔛 تم تشغيل المراقبة.` });
                    continue;
                }
                if (messageContent === 'ايقاف مراقبة' || messageContent === 'اوقف مراقبة') {
                    config.monitoringEnabled = false;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🔴 تم إيقاف المراقبة.` });
                    continue;
                }

                // ─── تشغيل/إيقاف الإعلانات ───
                if (messageContent === 'تشغيل اعلانات') {
                    config.adsEnabled = true;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `📢 تم تشغيل الإعلانات.` });
                    continue;
                }
                if (messageContent === 'ايقاف اعلانات') {
                    config.adsEnabled = false;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🔕 تم إيقاف الإعلانات.` });
                    continue;
                }

                // ─── تشغيل/إيقاف الفلترة الذكية ───
                if (messageContent === 'تشغيل فلترة ذكية' || messageContent === 'شغل فلترة ذكية') {
                    config.smartFilter = true;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🧠 تم تشغيل الفلترة الذكية.` });
                    continue;
                }
                if (messageContent === 'ايقاف فلترة ذكية' || messageContent === 'اوقف فلترة ذكية') {
                    config.smartFilter = false;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🧠 تم إيقاف الفلترة الذكية.` });
                    continue;
                }

                // ─── تشغيل/إيقاف الرد التلقائي ───
                if (messageContent === 'تشغيل رد تلقائي' || messageContent === 'شغل رد') {
                    config.autoReplyEnabled = true;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🤖 تم تفعيل الرد التلقائي.` });
                    continue;
                }
                if (messageContent === 'ايقاف رد تلقائي' || messageContent === 'اوقف رد') {
                    config.autoReplyEnabled = false;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `🔕 تم إيقاف الرد التلقائي.` });
                    continue;
                }

                // ─── تعيين رسالة الرد التلقائي ───
                if (messageContent.startsWith('تعيين رسالة الرد ')) {
                    const newText = messageContent.replace('تعيين رسالة الرد ', '').trim();
                    if (newText) {
                        config.autoReplyText = newText;
                        saveConfig();
                        await sock.sendMessage(jid, { text: `✅ تم تحديث رسالة الرد التلقائي بنجاح!` });
                    }
                    continue;
                }

                // ─── إدارة الكلمات المفتاحية ───
                if (messageContent.startsWith('اضف كلمة ')) {
                    const newKw = messageContent.replace('اضف كلمة ', '').trim();
                    if (newKw) {
                        if (!config.keywords.includes(newKw)) {
                            config.keywords.push(newKw);
                            saveConfig();
                            await sock.sendMessage(jid, { text: `✅ تمت إضافة الكلمة بنجاح:\n"${newKw}"` });
                        } else {
                            await sock.sendMessage(jid, { text: `⚠️ الكلمة موجودة مسبقاً.` });
                        }
                    }
                    continue;
                }
                if (messageContent.startsWith('حذف كلمة ')) {
                    const remKw = messageContent.replace('حذف كلمة ', '').trim();
                    const index = config.keywords.indexOf(remKw);
                    if (index > -1) {
                        config.keywords.splice(index, 1);
                        saveConfig();
                        await sock.sendMessage(jid, { text: `🗑️ تم حذف الكلمة: "${remKw}"` });
                    } else {
                        await sock.sendMessage(jid, { text: `❌ الكلمة غير موجودة.` });
                    }
                    continue;
                }
                if (messageContent === 'عرض الكلمات' || messageContent === 'الكلمات المفتاحية') {
                    await sock.sendMessage(jid, { text: `📊 إجمالي الكلمات المفتاحية النشطة: *${config.keywords.length}*` });
                    continue;
                }

                // ─── إدارة مجموعات النشر ───
                if (messageContent === 'اضف جروب نشر') {
                    groupsConfig.targetGroups.push(jid);
                    saveGroups();
                    await sock.sendMessage(jid, { text: `✅ تم إضافة هذه المجموعة لقائمة النشر المستهدفة.` });
                    continue;
                }
                if (messageContent === 'احذف جروب نشر') {
                    groupsConfig.targetGroups = groupsConfig.targetGroups.filter(g => g !== jid);
                    saveGroups();
                    await sock.sendMessage(jid, { text: `✅ تم حذف هذه المجموعة من قائمة النشر المستهدفة.` });
                    continue;
                }
                if (messageContent === 'جروبات النشر') {
                    if (groupsConfig.targetGroups.length === 0) {
                        await sock.sendMessage(jid, { text: `📋 لا توجد مجموعات نشر محددة (النشر في كل المجموعات).` });
                    } else {
                        let list = '';
                        for (let i = 0; i < groupsConfig.targetGroups.length; i++) {
                            const name = await getGroupName(sock, groupsConfig.targetGroups[i]);
                            list += `${i + 1}. ${name}\n`;
                        }
                        await sock.sendMessage(jid, { text: `📋 *مجموعات النشر المستهدفة:*\n\n${list}` });
                    }
                    continue;
                }

                // ─── إدارة المجموعات المستبعدة ───
                if (messageContent === 'استبعد جروب') {
                    groupsConfig.excludedGroups.push(jid);
                    saveGroups();
                    await sock.sendMessage(jid, { text: `🚫 تم استبعاد هذه المجموعة من النشر.` });
                    continue;
                }
                if (messageContent === 'الغي استبعاد جروب') {
                    groupsConfig.excludedGroups = groupsConfig.excludedGroups.filter(g => g !== jid);
                    saveGroups();
                    await sock.sendMessage(jid, { text: `✅ تم إلغاء استبعاد هذه المجموعة.` });
                    continue;
                }
                if (messageContent === 'جروبات مستبعدة') {
                    if (groupsConfig.excludedGroups.length === 0) {
                        await sock.sendMessage(jid, { text: `📋 لا توجد مجموعات مستبعدة.` });
                    } else {
                        let list = '';
                        for (let i = 0; i < groupsConfig.excludedGroups.length; i++) {
                            const name = await getGroupName(sock, groupsConfig.excludedGroups[i]);
                            list += `${i + 1}. ${name}\n`;
                        }
                        await sock.sendMessage(jid, { text: `🚫 *المجموعات المستبعدة:*\n\n${list}` });
                    }
                    continue;
                }

                // ─── إدارة مجموعات المراقبة ───
                if (messageContent === 'اضف جروب مراقبة') {
                    groupsConfig.monitoredGroups.push(jid);
                    saveGroups();
                    await sock.sendMessage(jid, { text: `👁️ تم إضافة هذه المجموعة للمراقبة.` });
                    continue;
                }
                if (messageContent === 'احذف جروب مراقبة') {
                    groupsConfig.monitoredGroups = groupsConfig.monitoredGroups.filter(g => g !== jid);
                    saveGroups();
                    await sock.sendMessage(jid, { text: `👁️ تم حذف هذه المجموعة من المراقبة.` });
                    continue;
                }
                if (messageContent === 'جروبات المراقبة') {
                    if (groupsConfig.monitoredGroups.length === 0) {
                        await sock.sendMessage(jid, { text: `📋 مراقبة كل المجموعات.` });
                    } else {
                        let list = '';
                        for (let i = 0; i < groupsConfig.monitoredGroups.length; i++) {
                            const name = await getGroupName(sock, groupsConfig.monitoredGroups[i]);
                            list += `${i + 1}. ${name}\n`;
                        }
                        await sock.sendMessage(jid, { text: `👁️ *مجموعات المراقبة:*\n\n${list}` });
                    }
                    continue;
                }

                // ─── أوامر المعلومات ───
                if (messageContent === 'الحسابات') {
                    const list = activeSessions.length > 0 ? activeSessions.map(p => `- ${p}`).join('\n') : 'لا توجد حسابات.';
                    await sock.sendMessage(jid, { text: `📱 *الحسابات المرتبطة:*\n\n${list}` });
                    continue;
                }

                // ─── تعيين جروب التنبيهات ───
                if (messageContent === 'جروب التنبيهات' || messageContent === 'مجموعة التنبيهات') {
                    config.targetGroup = jid;
                    saveConfig();
                    await sock.sendMessage(jid, { text: `✅ تم اعتماد هذه المجموعة كـ *جروب التنبيهات*.` });
                    continue;
                }

                // ─── حالة البوت ───
                if (messageContent === 'حالة') {
                    const status = `⚙️ *حالة البوت:*\n\n` +
                        `🔍 المراقبة: ${config.monitoringEnabled ? '✅ شغالة' : '❌ متوقفة'}\n` +
                        `📢 الإعلانات: ${config.adsEnabled ? '✅ مفعلة' : '❌ متوقفة'}\n` +
                        `🧠 الفلترة الذكية: ${config.smartFilter ? '✅ شغالة' : '❌ متوقفة'}\n` +
                        `🤖 الرد التلقائي: ${config.autoReplyEnabled ? '✅ مفعل' : '❌ متوقف'}\n` +
                        `📱 الحسابات: ${activeSessions.length}\n` +
                        `📝 الكلمات: ${config.keywords.length}\n` +
                        `📋 جروبات النشر: ${groupsConfig.targetGroups.length || 'الكل'}\n` +
                        `🚫 جروبات مستبعدة: ${groupsConfig.excludedGroups.length}\n` +
                        `👁️ جروبات المراقبة: ${groupsConfig.monitoredGroups.length || 'الكل'}\n` +
                        `👥 جروب التنبيهات: ${config.targetGroup ? '✅ محدد' : '❌ غير محدد'}`;
                    await sock.sendMessage(jid, { text: status });
                    continue;
                }

                // ─── مساعدة ───
                if (messageContent === 'مساعدة' || messageContent === 'اوامر' || messageContent === 'الاوامر') {
                    const helpText = `📖 *أوامر البوت:*\n\n` +
                        `*🔗 الحسابات:*\n` +
                        `• ربط [رقم] - ربط حساب جديد\n` +
                        `• الحسابات - عرض الحسابات المتصلة\n\n` +
                        `*📢 الإعلانات:*\n` +
                        `• اعلان [نص] - نشر من كل الحسابات\n` +
                        `• اعلان-حساب [رقم] [نص] - نشر من حساب محدد\n` +
                        `• اعلان-مجموعة-حساب [رقم] [اسم] [نص] - نشر في جروب معين\n` +
                        `• ايقاف الاعلانات - إيقاف فوري للإعلانات\n` +
                        `• تشغيل اعلانات / ايقاف اعلانات\n\n` +
                        `*📋 المجموعات:*\n` +
                        `• جروب التنبيهات - تعيين جروب التنبيهات\n` +
                        `• اضف جروب نشر - إضافة للنشر المستهدف\n` +
                        `• احذف جروب نشر - حذف من النشر\n` +
                        `• جروبات النشر - عرض المستهدفة\n` +
                        `• استبعد جروب - استبعاد من النشر\n` +
                        `• الغي استبعاد جروب - إلغاء الاستبعاد\n` +
                        `• جروبات مستبعدة - عرض المستبعدة\n` +
                        `• اضف جروب مراقبة - مراقبة مجموعة محددة\n` +
                        `• احذف جروب مراقبة - إيقاف المراقبة\n` +
                        `• جروبات المراقبة - عرض مجموعات المراقبة\n\n` +
                        `*👁️ المراقبة:*\n` +
                        `• تشغيل مراقبة / ايقاف مراقبة\n` +
                        `• تشغيل فلترة ذكية / ايقاف فلترة ذكية\n` +
                        `• اضف كلمة [كلمة] - إضافة كلمة\n` +
                        `• حذف كلمة [كلمة] - حذف كلمة\n` +
                        `• عرض الكلمات - عدد الكلمات\n\n` +
                        `*🤖 الرد التلقائي:*\n` +
                        `• تشغيل رد تلقائي / ايقاف رد تلقائي\n` +
                        `• تعيين رسالة الرد [نص] - تغيير الرسالة\n\n` +
                        `*⚙️ عام:*\n` +
                        `• حالة - عرض حالة البوت\n` +
                        `• مساعدة - عرض هذه القائمة`;
                    await sock.sendMessage(jid, { text: helpText });
                    continue;
                }
            }

            // ==================== نظام المراقبة والفلترة الذكية ====================
            if (config.monitoringEnabled && config.targetGroup && jid.endsWith('@g.us')) {
                const isTargetGroup = jid === config.targetGroup;

                // لا نراقب رسائل من جروب التنبيهات نفسه
                if (isTargetGroup) continue;

                // إذا كانت هناك مجموعات مراقبة محددة، تحقق
                if (groupsConfig.monitoredGroups.length > 0 && !groupsConfig.monitoredGroups.includes(jid)) {
                    continue;
                }

                // الفلترة الذكية
                const detected = smartDetect(messageContent);

                if (detected) {
                    const groupName = await getGroupName(sock, jid);

                    // تنسيق التنبيه بنفس شكل الصورة
                    const report = formatAlert(groupName, pushName, senderNumber, senderMention, phone, messageContent);

                    try {
                        await sock.sendMessage(config.targetGroup, {
                            text: report,
                            mentions: mentionsArray
                        });
                    } catch (e) {
                        console.error(`[ERROR] فشل إرسال التنبيه:`, e.message);
                    }

                    // ─── الرد التلقائي على المرسل ───
                    if (config.autoReplyEnabled && !fromMe) {
                        try {
                            await sock.sendMessage(jid, {
                                text: config.autoReplyText,
                                quoted: msg
                            });
                        } catch (e) {
                            console.error(`[ERROR] فشل الرد التلقائي:`, e.message);
                        }
                    }
                }
            }
        }
    });
}

// ==================== الدالة الرئيسية ====================
async function main() {
    console.log("[SYSTEM] Starting Ultimate Multi-Account Bot...");
    const defaultNumbers = ["967739172238", "966593341070"];
    for (const num of defaultNumbers) {
        if (!activeSessions.includes(num)) activeSessions.push(num);
    }
    saveSessions();

    for (const phone of activeSessions) {
        await startAccount(phone);
        await new Promise(r => setTimeout(r, 3000));
    }
}

main().catch(err => console.error(err));


