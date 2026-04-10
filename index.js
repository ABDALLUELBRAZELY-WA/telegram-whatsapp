const express = require('express');
const app = express();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// --- سيرفر ويب وهمي عشان Render ميقفلش البوت ---
app.get('/', (req, res) => res.send('🚀 النمر بوت شغال وبأقصى سرعة!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`سيرفر الاستضافة شغال على بورت ${PORT}`));

// --- إعدادات التليجرام والواتساب ---
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.x.html',
    },
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

const randomWords = [
    "🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن", 
    "💎 ثقة وأمان", "👑 خامات للتميز", "🌟 تابعونا للجديد", 
    "✅ خدمة ممتازة", "🔝 الأفضل دائما"
];

let messageQueue = [];
let isProcessing = false;

// --- معالجة الـ QR ---
whatsappClient.on('qr', qr => {
    console.log('اربط الواتساب بالـ QR ده يا نمر:');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => console.log('✅ السيستم السريع والمنظم جاهز يا نمر!'));

// --- استلام الرسائل من تليجرام ---
telegramBot.on('message', (msg) => {
    messageQueue.push(msg);
    if (!isProcessing) processQueue();
});

async function processQueue() {
    if (messageQueue.length === 0) {
        isProcessing = false;
        return;
    }
    
    isProcessing = true;
    const msg = messageQueue.shift();

    try {
        const chats = await whatsappClient.getChats();
        // بنفلتر الجروبات عشان نبعت للكل مرة واحدة
        const groups = chats.filter(chat => chat.isGroup);
        
        console.log(`📥 جاري معالجة موديل جديد لـ ${groups.length} جروب...`);

        let media = null;
        const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : (msg.document ? msg.document.file_id : null));
        
        if (fileId) {
            const link = await telegramBot.getFileLink(fileId);
            media = await MessageMedia.fromUrl(link);
        }

        for (const group of groups) {
            try {
                if (media) {
                    // بيبعت الصورة وبتحتها الكلام (Caption) عشان الترتيب يكون 100%
                    await whatsappClient.sendMessage(group.id._serialized, media, { 
                        caption: msg.caption || "" 
                    });
                } 
                else if (msg.text) {
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await whatsappClient.sendMessage(group.id._serialized, msg.text + randomSuffix);
                }
                console.log(`🚀 تم الإرسال لـ: ${group.name}`);
                
                // انتظار 800 مللي ثانية (أقل من ثانية) عشان نكون أسرع مع الحفاظ على الأمان
                await new Promise(r => setTimeout(r, 800)); 
            } catch (err) {
                console.log(`❌ فشل في جروب ${group.name}`);
            }
        }
    } catch (e) {
        console.log('❌ خطأ في المعالجة:', e.message);
    }

    processQueue(); // ادخل في اللي بعده فوراً
}

whatsappClient.initialize();
