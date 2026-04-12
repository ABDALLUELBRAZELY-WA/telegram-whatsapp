const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

let lastQr = "";

// 1. وظيفة الكلمات المتغيرة (SpinTax)
// بتختار كلمة عشوائية من اللي بين { | }
function spintax(text) {
    return text.replace(/{([^{}]+)}/g, (match, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

// 2. خادم الويب لعرض الكيو آر وتجنب إغلاق السيرفر
app.get('/', (req, res) => {
    if (lastQr) {
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px; background:#f0f2f5; height:100vh;">
                <div style="background:white; display:inline-block; padding:30px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.1);">
                    <h2 style="color:#075e54;">يا عبد الله امسح الكود من هنا</h2>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(lastQr)}&size=300x300" />
                    <p style="margin-top:20px; color:#666;">افتح الواتساب -> الأجهزة المرتبطة -> ربط جهاز</p>
                </div>
            </div>
            <script>setTimeout(() => { location.reload(); }, 20000);</script>
        `);
    } else {
        res.send('<div style="text-align:center; padding:50px;"><h2>✅ البوت شغال ومتصل يا بطل</h2></div>');
    }
});

app.listen(port, '0.0.0.0', () => console.log(`Server is running on port ${port}`));

// 3. إعداد البوت مع مسار Chromium الصحيح للسيرفر
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: '/usr/bin/chromium'
    }
});

client.on('qr', (qr) => {
    lastQr = qr;
    qrcode.generate(qr, { small: true });
    console.log('>>> New QR Code generated. Check the web link! <<<');
});

client.on('ready', () => {
    console.log('>>> SUCCESS: WhatsApp Bot is Ready! <<<');
    lastQr = ""; 
});

// 4. نظام الرد الاحترافي (اسم الجروب + كلمات متغيرة)
client.on('message', async (msg) => {
    // الرد فقط في الجروبات
    if (msg.from.endsWith('@g.us')) {
        const chat = await msg.getChat();
        const groupName = chat.name;

        // الكلمات اللي لو موجودة في الرسالة البوت يرد
        const keywords = ['سعر', 'تفاصيل', 'استفسار', 'بكام', 'متاح'];
        const userMessage = msg.body.toLowerCase();

        if (keywords.some(word => userMessage.includes(word))) {
            
            // هنا الكلمات المتغيرة.. تقدر تعدلهم براحتك
            const replyTemplate = `{أهلاً بك|مرحباً بك|يا هلا وغلا} في جروب *${groupName}*.. {طلبك وصل|استفسارك وصلنا} وهيرد عليك المسؤول حالاً! 🚀`;
            
            const finalMessage = spintax(replyTemplate);
            await msg.reply(finalMessage);
            
            console.log(`Done: Replied to group [${groupName}]`);
        }
    }
});

client.initialize();
