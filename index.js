const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

let latestQr = "";

// إعداد خادم الويب لعرض الكيو آر كصورة واضحة
app.get('/', (req, res) => {
    if (latestQr) {
        res.send(`
            <html>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:#f4f4f9;">
                    <div style="background:white;padding:40px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.1);text-align:center;">
                        <h2 style="color:#128c7e;">سجل دخول يا نمر - النمر للأبواب 🦁</h2>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(latestQr)}&size=300x300" style="border:10px solid #fff;border-radius:10px;" />
                        <p style="color:#666;margin-top:20px;">افتح الواتساب من موبايلك وصور الكود ده</p>
                    </div>
                    <script>setTimeout(() => location.reload(), 30000);</script>
                </body>
            </html>
        `);
    } else {
        res.send('<h1 style="text-align:center;margin-top:50px;font-family:sans-serif;">✅ البوت شغال.. جاري تجهيز الكود أو تم الاتصال</h1>');
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ السيرفر يعمل على المنفذ ${port}`);
});

// إعدادات التليجرام
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// إعدادات واتساب
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote', '--disable-gpu'],
        executablePath: '/usr/bin/chromium' 
    }
});

// الكلمات المتغيرة (التي أرسلتها أنت في الكود)
const randomWords = ["🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن", "💎 ثقة وأمان", "👑 خامات للتميز"];

let messageQueue = [];
let isProcessing = false;

whatsappClient.on('qr', qr => {
    latestQr = qr;
    qrcode.generate(qr, { small: true });
    console.log('⚠️ كود QR جديد متاح.. افتح رابط السيرفر للمسح.');
});

whatsappClient.on('ready', () => {
    latestQr = "";
    console.log('✅ تم الربط بنجاح! البوت جاهز للإرسال.');
});

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
                // اختيار كلمة عشوائية من القائمة التي حددتها أنت
                const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                
                // دمج اسم الجروب (لزيادة التخصيص ومنع الحظر)
                const groupInfo = `\n📌 الجروب: *${group.name}*`;

                if (media) {
                    const captionText = (msg.caption || "") + randomSuffix + groupInfo;
                    await whatsappClient.sendMessage(group.id._serialized, media, { caption: captionText });
                } else if (msg.text) {
                    const messageText = msg.text + randomSuffix + groupInfo;
                    await whatsappClient.sendMessage(group.id._serialized, messageText);
                }

                console.log(`✅ تم الإرسال لـ: ${group.name}`);
                
                // تأخير بسيط بين الإرسال لكل جروب (حماية إضافية)
                await new Promise(r => setTimeout(r, 4000));

            } catch (err) {
                console.log(`❌ فشل في جروب: ${group.name}`);
            }
        }
    } catch (e) {
        console.log('⚠️ خطأ عام في المعالجة');
    }

    isProcessing = false;
    if (messageQueue.length > 0) processQueue();
}

whatsappClient.initialize();
