const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// التوكن بتاعك زي ما هو
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

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
            '--single-process', // عشان الرامات في السيرفر الجديد ترتاح أكتر
            '--disable-gpu'
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

whatsappClient.on('qr', qr => {
    console.log('سجل دخول يا نمر من الكيو آر كود ده:');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('✅ السيرفر الجديد (8GB) جاهز! البوت شغال دلوقتي طلقة 🚀');
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
        // تعديل مهم: هنجيب الجروبات مرة واحدة بره اللوب لسرعة الأداء
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
                // 1- إرسال الميديا (صورة أو فيديو)
                if (media) {
                    await whatsappClient.sendMessage(group.id._serialized, media);
                } 
                
                // 2- إرسال النص مع الكلمة المتغيرة (كده هيظهر تحت الصورة كرسالة منفصلة)
                if (msg.text || msg.caption) {
                    const baseText = msg.text || msg.caption || "";
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    
                    await whatsappClient.sendMessage(group.id._serialized, baseText + randomSuffix);
                }

                // وقت انتظار بسيط (نص ثانية) عشان الواتساب ميحسش بحاجة
                await new Promise(r => setTimeout(r, 500)); 
            } catch (err) {
                console.log(`❌ تخطي جروب: ${group.name}`);
            }
        }
    } catch (e) {
        console.log('⚠️ تنبيه: السيرفر بيحمل البيانات، استنى ثواني..');
    }

    isProcessing = false;
    processQueue(); 
}

whatsappClient.initialize();
