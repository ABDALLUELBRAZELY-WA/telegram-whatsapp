const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

let latestQr = "";

// 1. خادم الويب لعرض الكيو آر كصورة واضحة في المتصفح
app.get('/', (req, res) => {
    if (latestQr) {
        res.send(`
            <html>
                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:#f4f4f9;margin:0;">
                    <div style="background:white;padding:40px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.1);text-align:center; max-width: 400px;">
                        <h2 style="color:#128c7e;">لوحة التحكم - تسجيل دخول 🛍️</h2>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(latestQr)}&size=300x300" style="border:10px solid #fff;border-radius:10px;" />
                        <p style="color:#666;margin-top:20px;line-height:1.6;">افتح الواتساب من موبايلك واعمل مسح (Scan) للكود عشان تبدأ الإرسال التلقائي.</p>
                    </div>
                    <script>setTimeout(() => location.reload(), 30000);</script>
                </body>
            </html>
        `);
    } else {
        res.send('<h1 style="text-align:center;margin-top:50px;font-family:sans-serif;color:#128c7e;">✅ البوت يعمل بنجاح ومستعد للإرسال</h1>');
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ السيرفر يعمل على المنفذ ${port}`);
});

// 2. دالة الـ SpinTax الاحترافية
function applySpinTax(text) {
    return text.replace(/{([^{}]+)}/g, function(match, options) {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

// إعدادات التليجرام
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// إعدادات واتساب مع معالجة المتصفح للسيرفر
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-gpu',
            '--no-zygote'
        ],
        executablePath: '/usr/bin/chromium' 
    }
});

let messageQueue = [];
let isProcessing = false;

whatsappClient.on('qr', qr => {
    latestQr = qr;
    qrcode.generate(qr, { small: true });
    console.log('⚠️ كود QR جديد متاح.. افتح الرابط للمسح.');
});

whatsappClient.on('ready', () => {
    latestQr = "";
    console.log('✅ تم الربط بنجاح! البوت جاهز لإرسال المنتجات.');
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

        // --- جمل متغيرة خاصة بالملابس والأحذية والشنط ---
        const introSpin = "{🔥 تشكيلة جديدة وصلت الآن|✨ شياكتك عندنا بأعلى كواليتي|🚀 أقوى كوليكشن ملابس وأحذية|💎 خامات أوريجينال وتقفيل ممتاز|🌟 التميز في كل قطعة بنقدملكم}";

        for (const group of groups) {
            try {
                const randomIntro = applySpinTax(introSpin);
                const groupTag = `\n\n📌 *عملاء جروب: ${group.name}*`;
                
                if (media) {
                    const captionText = `${randomIntro}\n\n${msg.caption || ""}${groupTag}`;
                    await whatsappClient.sendMessage(group.id._serialized, media, { caption: captionText });
                } else if (msg.text) {
                    const messageText = `${randomIntro}\n\n${msg.text}${groupTag}`;
                    await whatsappClient.sendMessage(group.id._serialized, messageText);
                }

                console.log(`✅ تم إرسال المنتج لجروب: ${group.name}`);
                
                // تأخير عشوائي للحماية من الحظر (بين 4 لـ 8 ثواني)
                const delay = Math.floor(Math.random() * (8000 - 4000 + 1) + 4000);
                await new Promise(r => setTimeout(r, delay));

            } catch (err) {
                console.log(`❌ فشل الإرسال لجروب: ${group.name}`);
            }
        }
    } catch (e) {
        console.log('⚠️ خطأ في معالجة الرسالة');
    }

    isProcessing = false;
    if (messageQueue.length > 0) processQueue();
}

whatsappClient.initialize();
