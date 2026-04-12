const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// --- إعداد سيرفر وهمي لإبقاء Fly.io سعيداً ---
const app = express();
const port = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is Running!'));
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Health check listening on port ${port}`);
});

// --- إعدادات التليجرام ---
// تأكد أن هذا التوكن هو الأحدث لديك
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
    console.log('\n--- سجل دخول يا نمر من الكيو آر كود ده ---');
    console.log('ملاحظة: إذا ظهر الكود مبعثراً، صغر زوم المتصفح (Ctrl مع -)\n');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('\n✅✅✅ السيرفر جاهز! البوت شغال دلوقتي بنجاح 🚀\n');
});

telegramBot.on('message', (msg) => {
    // تجاهل الأوامر مثل /start
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
            try {
                const link = await telegramBot.getFileLink(fileId);
                media = await MessageMedia.fromUrl(link);
            } catch (mediaError) {
                console.log('❌ خطأ في تحميل الميديا من تليجرام');
            }
        }

        console.log(`⏳ جاري الإرسال إلى ${groups.length} مجموعة...`);

        for (const group of groups) {
            try {
                if (media) {
                    await whatsappClient.sendMessage(group.id._serialized, media, { caption: msg.caption || "" });
                } else if (msg.text) {
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await whatsappClient.sendMessage(group.id._serialized, msg.text + randomSuffix);
                }
                // انتظار 3 ثوانٍ بين كل مجموعة لتجنب الحظر
                await new Promise(r => setTimeout(r, 3000)); 
            } catch (err) {
                console.log(`❌ تخطي جروب: ${group.name}`);
            }
        }
        console.log('✅ تم الانتهاء من إرسال الرسالة الحالية.');
    } catch (e) {
        console.log('⚠️ تنبيه: حدث خطأ أثناء معالجة القائمة');
    }

    isProcessing = false;
    // التحقق من وجود رسائل أخرى في القائمة
    if (messageQueue.length > 0) processQueue();
}

// التعامل مع أخطاء التليجرام لمنع الانهيار
telegramBot.on('polling_error', (error) => {
    if (error.code === 'ETELEGRAM' && error.message.includes('conflict')) {
        console.log('⚠️ تنبيه: البوت يعمل في مكان آخر (Conflict). تأكد من إغلاق أي نسخة مفتوحة في Codespaces.');
    }
});

whatsappClient.initialize();
