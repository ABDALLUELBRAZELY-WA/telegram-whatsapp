const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express'); // أضفنا هذا لتجنب إيقاف السيرفر

// --- إعداد سيرفر وهمي لإبقاء Fly.io سعيداً ---
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is Running!'));
app.listen(port, '0.0.0.0', () => console.log(`Health check listening on port ${port}`));

// --- إعدادات التليجرام ---
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// --- إعدادات واتساب ---
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu'
        ],
        executablePath: '/usr/bin/chromium' 
    }
});

const randomWords = [
    "🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن", 
    "💎 ثقة وأمان", "👑 خامات للتميز", "🌟 تابعونا للجديد", 
    "✅ خدمة ممتازة", "🔝 الأفضل دائما"
];

let messageQueue = [];
let isProcessing = false;

// عرض QR Code في الـ Logs
whatsappClient.on('qr', qr => {
    console.log('--- سجل دخول يا نمر من الكيو آر كود ده ---');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('✅ السيرفر جاهز! البوت شغال دلوقتي بنجاح 🚀');
});

telegramBot.on('message', (msg) => {
    messageQueue.push(msg);
    processQueue();
});

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    
    isProcessing = true;
    const msg = messageQueue.shift();

    try {
        const chats = await whatsappClient.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        let media = null;
        let fileId = null;

        if (msg.photo) fileId = msg.photo[msg.photo.length - 1].file_id;
        else if (msg.video) fileId = msg.video.file_id;
        else if (msg.document) fileId = msg.document.file_id;

        if (fileId) {
            try {
                const link = await telegramBot.getFileLink(fileId);
                media = await MessageMedia.fromUrl(link);
            } catch (mediaError) {
                console.log('❌ خطأ في تحميل الميديا من تليجرام');
            }
        }

        for (const group of groups) {
            try {
                if (media) {
                    await whatsappClient.sendMessage(group.id._serialized, media, { caption: msg.caption || "" });
                } else if (msg.text) {
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await whatsappClient.sendMessage(group.id._serialized, msg.text + randomSuffix);
                }
                // انتظار بسيط لتجنب الحظر (3 ثوانٍ أفضل للأمان)
                await new Promise(r => setTimeout(r, 3000)); 
            } catch (err) {
                console.log(`❌ تخطي جروب: ${group.name}`);
            }
        }
    } catch (e) {
        console.log('⚠️ تنبيه: حدث خطأ أثناء معالجة القائمة');
    }

    isProcessing = false;
    processQueue(); 
}

// التعامل مع أخطاء التليجرام (polling errors) لمنع الانهيار
telegramBot.on('polling_error', (error) => {
    if (error.code === 'ETELEGRAM' && error.message.includes('conflict')) {
        console.log('⚠️ تنبيه: البوت يعمل في مكان آخر، يرجى إغلاق النسخة القديمة.');
    }
});

whatsappClient.initialize();
