const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

let lastQr = "";

// 1. نظام الكلمات المتغيرة (SpinTax)
function spintax(text) {
    return text.replace(/{([^{}]+)}/g, (match, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

// 2. خادم الويب (ده اللي هيخلي اللينك يفتح معاك)
app.get('/', (req, res) => {
    if (lastQr) {
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1 style="color:#25D366;">QR Code جاهز يا عبد الله</h1>
                <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(lastQr)}&size=300x300" style="border:10px solid #fff; box-shadow:0 0 10px #ccc;"/>
                <p style="font-size:1.2em; margin-top:20px;">افتح الواتساب وصور الكود ده فوراً</p>
                <script>setTimeout(() => { location.reload(); }, 15000);</script>
            </div>
        `);
    } else {
        res.send('<div style="text-align:center; padding:50px;"><h2>جاري توليد الكود.. استنى 10 ثواني واعمل Refresh</h2></div>');
    }
});

// تشغيل السيرفر على 0.0.0.0 عشان Fly.io يشوفه
app.listen(port, '0.0.0.0', () => {
    console.log('Server is online on port', port);
});

// 3. إعداد البوت مع المسار اللي بيحل مشكلة الـ Crash
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        executablePath: '/usr/bin/chromium' 
    }
});

client.on('qr', (qr) => {
    lastQr = qr;
    qrcode.generate(qr, { small: true });
    console.log('QR RECEIVED - CHECK THE WEB LINK');
});

client.on('ready', () => {
    console.log('BOT IS READY!');
    lastQr = ""; 
});

// 4. الرد التلقائي (اسم الجروب + كلمات متغيرة)
client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) {
        const chat = await msg.getChat();
        const groupName = chat.name;

        if (msg.body.includes('سعر') || msg.body.includes('تفاصيل')) {
            const reply = spintax(`{يا هلا|مرحباً|أهلاً بك} في جروب *${groupName}*.. {طلبك وصل|استفسارك تحت المراجعة} وهنرد عليك حالاً!`);
            msg.reply(reply);
        }
    }
});

client.initialize();
