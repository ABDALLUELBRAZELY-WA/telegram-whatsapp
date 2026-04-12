const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

// متغير لتخزين رابط الـ QR لفتحه كصورة
let latestQr = "";

// --- إعداد سيرفر الويب لحل مشكلة الـ Health Check وعرض الـ QR ---
app.get('/', (req, res) => {
    if (latestQr) {
        // إذا كان هناك كود QR، سيعرضه كصورة واضحة في المتصفح
        res.send(`
            <html>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                    <h2>سجل دخول يا نمر - النمر للأبواب</h2>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(latestQr)}&size=300x300" />
                    <p>صور الكود ده من الواتساب في موبايلك</p>
                    <script>setTimeout(() => location.reload(), 30000);</script>
                </body>
            </html>
        `);
    } else {
        res.send('<h1>البوت شغال.. جاري تجهيز الكود أو تم الربط بنجاح ✅</h1>');
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ السيرفر يعمل على المنفذ ${port}`);
});

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
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        executablePath: '/usr/bin/chromium' 
    }
});

const randomWords = ["🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن", "💎 ثقة وأمان", "👑 خامات للتميز"];
let messageQueue = [];
let isProcessing = false;

// --- معالجة الـ QR Code ---
whatsappClient.on('qr', qr => {
    latestQr = qr; // تخزين الكود لعرضه في الرابط
    console.log('\n--------------------------------------------');
    console.log('⚠️ الكود مبعثر؟ افتح الرابط ده في متصفحك وصور منه:');
    console.log(`https://telegram-whatsapp-v9oz5w.fly.dev/`); 
    console.log('--------------------------------------------\n');
    
    // محاولة طباعته مصغراً أيضاً في السجلات
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    latestQr = ""; // مسح الكود بعد الربط
    console.log('\n✅✅✅ تم الربط بنجاح! البوت جاهز للعمل 🚀\n');
});

// باقي منطق معالجة الرسائل كما هو في كودك الأصلي
telegramBot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;
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
            const link = await telegramBot.getFileLink(fileId);
            media = await MessageMedia.fromUrl(link);
        }

        for (const group of groups) {
            try {
                if (media) {
                    await whatsappClient.sendMessage(group.id._serialized, media, { caption: msg.caption || "" });
                } else if (msg.text) {
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await whatsappClient.sendMessage(group.id._serialized, msg.text + randomSuffix);
                }
                await new Promise(r => setTimeout(r, 3000)); 
            } catch (err) { console.log(`❌ خطأ في جروب: ${group.name}`); }
        }
    } catch (e) { console.log('⚠️ خطأ في القائمة'); }
    isProcessing = false;
    if (messageQueue.length > 0) processQueue();
}

whatsappClient.initialize();
