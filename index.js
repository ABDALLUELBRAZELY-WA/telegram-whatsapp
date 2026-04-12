const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const fs = require('fs');

const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const randomWords = [
    "🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن",
    "💎 ثقة وأمان", "👑 خامات للتميز", "🌟 تابعونا للجديد",
    "✅ خدمة ممتازة", "🔝 الأفضل دائما"
];

let messageQueue = [];
let isProcessing = false;
let sock = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;
            console.log('❌ الاتصال انقطع، جاري إعادة الاتصال:', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ الواتساب جاهز! البوت شغال 🚀');
        }
    });
}

telegramBot.on('message', (msg) => {
    messageQueue.push(msg);
    processQueue();
});

async function processQueue() {
    if (isProcessing || messageQueue.length === 0 || !sock) return;

    isProcessing = true;
    const msg = messageQueue.shift();

    try {
        // جيب كل الجروبات
        const groups = Object.keys(await sock.groupFetchAllParticipating());

        const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id
            : msg.video ? msg.video.file_id
            : msg.document ? msg.document.file_id
            : null;

        let mediaBuffer = null;
        let mimetype = null;

        if (fileId) {
            const link = await telegramBot.getFileLink(fileId);
            const res = await fetch(link);
            mediaBuffer = await res.buffer();
            mimetype = msg.photo ? 'image/jpeg' : msg.video ? 'video/mp4' : 'application/octet-stream';
        }

        for (const groupId of groups) {
            try {
                if (mediaBuffer) {
                    await sock.sendMessage(groupId, {
                        [msg.photo ? 'image' : 'video']: mediaBuffer,
                        mimetype,
                        caption: ''
                    });
                    console.log(`🖼️ ميديا وصلت`);
                }

                if (msg.text || msg.caption) {
                    const baseText = msg.text || msg.caption || "";
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await sock.sendMessage(groupId, { text: baseText + randomSuffix });
                    console.log(`📝 النص وصل`);
                }

                await new Promise(r => setTimeout(r, 800));
            } catch (err) {
                console.log(`❌ فشل في جروب: ${err.message}`);
            }
        }
    } catch (e) {
        console.log('❌ خطأ في المعالجة:', e.message);
    }

    isProcessing = false;
    processQueue();
}

connectToWhatsApp();
