const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// التوكن الخاص بك
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        // الإعدادات الهامة للعمل على سيرفر Fly.io
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
        // هذا السطر هو مفتاح الحل: يوجه الكود للمتصفح المثبت في السيرفر
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

whatsappClient.on('qr', qr => {
    console.log('سجل دخول يا نمر من الكيو آر كود ده:');
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
                    await whatsappClient.sendMessage(group.id._serialized, media);
                } 
                
                if (msg.text || msg.caption) {
                    const baseText = msg.text || msg.caption || "";
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await whatsappClient.sendMessage(group.id._serialized, baseText + randomSuffix);
                }

                // انتظار بسيط لتجنب الحظر
                await new Promise(r => setTimeout(r, 1000)); 
            } catch (err) {
                console.log(`❌ تخطي جروب: ${group.name}`);
            }
        }
    } catch (e) {
        console.log('⚠️ تنبيه: حدث خطأ أثناء معالجة القائمة، سيتم المحاولة لاحقاً..');
    }

    isProcessing = false;
    processQueue(); 
}

whatsappClient.initialize();
