const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');

// Load config with error handling
let config;
try {
    config = require('./config.json');
    if (!config.telegram_bot_token || !config.admin || !Array.isArray(config.admin)) {
        throw new Error('Invalid config structure');
    }
} catch (error) {
    console.error('Error loading config:', error);
    process.exit(1);
}

const bot = new TelegramBot(config.telegram_bot_token, { polling: true });
const ADMIN_CHAT_ID = config.admin[0] || '';

const helpCommand = require('./commands/help.js');
const startCommand = require('./commands/start.js');
const uidCommand = require('./commands/uid.js');

helpCommand(bot);
startCommand(bot);
uidCommand(bot);

function getIpData() {
    try {
        if (!fs.existsSync('UserIp.json')) {
            fs.writeFileSync('UserIp.json', '[]', 'utf8');
            return [];
        }
        const data = fs.readFileSync('UserIp.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading IP data:', error);
        return [];
    }
}

function updateIpData(ipInfo) {
    try {
        let ipData = getIpData();
        const existingIndex = ipData.findIndex(entry => entry.query === ipInfo.query);

        if (existingIndex !== -1) {
            ipData[existingIndex] = { ...ipData[existingIndex], ...ipInfo };
        } else {
            ipData.push(ipInfo);
        }

        fs.writeFileSync('UserIp.json', JSON.stringify(ipData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error updating IP data:', error);
        return false;
    }
}

async function sendIpInfoToAdmin(ipInfo, msg) {
    try {
        if (!ADMIN_CHAT_ID) {
            console.error('Admin chat ID not found');
            return false;
        }

        // Check if IP was already messaged
        const messageData = JSON.parse(fs.readFileSync('messageIp.json', 'utf8') || '[]');
        const alreadyMessaged = messageData.find(item => item.ip === ipInfo.query);
        if (alreadyMessaged) {
            console.log(`Already Message in user: ${ipInfo.query}`);
            return true;
        }

        console.log(`IP detected: ${ipInfo.query}`);

        let message = '🔔 IP Access Detected!\n\n';
        message += `🌐 IP: ${ipInfo.query}\n`;
        message += `📍 Location: ${ipInfo.city || 'Unknown'}, ${ipInfo.country || 'Unknown'}\n`;
        message += `🏢 ISP: ${ipInfo.isp || 'Unknown'}\n`;
        message += `📮 ZIP: ${ipInfo.zip || 'Unknown'}\n`;
        message += `⏰ Time: ${moment().format("YYYY-MM-DD HH:mm:ss")}\n`;
        message += `🌍 Region: ${ipInfo.regionName || 'Unknown'}\n`;

        if (ipInfo.linkClicked) {
            message += `🔗 Link Click: Yes\n`;
            message += `⚡ Access Type: Direct Link\n`;
        }

        if (ipInfo.keyType) {
            message += `🔑 Key Type: ${ipInfo.keyType}\n`;
            message += `🔐 Device Type: ${ipInfo.keyType === 'All device' ? 'All device' : '1key device'}\n`;
            message += `📝 Status: ${ipInfo.status || 'Unknown'}\n`;
            message += `⚡ Access: ${ipInfo.appAccess ? 'Granted' : 'Denied'}\n`;
        }

        if (ipInfo.executeData) {
            message += `\n📝 Script Status: ${ipInfo.executeData.message}\n`;
            message += `📍 ZIP Code: ${ipInfo.executeData.zipCode}\n`;
            message += `🔐 Device Type: ${ipInfo.executeData.type}\n`;
            message += `📱 Device Count: ${ipInfo.executeData.deviceCount}\n`;
            message += `📌 Note: ${ipInfo.executeData.details}\n`;
        }

        const sent = await bot.sendMessage(ADMIN_CHAT_ID, message);
        if (sent) {
            ipInfo.notifiedBot = true;
            ipInfo.lastNotification = moment().format("YYYY-MM-DD HH:mm:ss");
            updateIpData(ipInfo);

            // Update messageIp.json
            if (!fs.existsSync('messageIp.json')) {
                fs.writeFileSync('messageIp.json', '[]', 'utf8');
            }
            
            let messageData;
            try {
                const fileContent = fs.readFileSync('messageIp.json', 'utf8');
                messageData = JSON.parse(fileContent || '[]');
                if (!Array.isArray(messageData)) {
                    messageData = [];
                }
            } catch (error) {
                messageData = [];
            }

            const newMessage = {
                ip: ipInfo.query,
                time: moment().format("YYYY-MM-DD HH:mm:ss"),
                username: msg?.from?.username || 'Unknown',
                telegram_id: msg?.from?.id?.toString() || 'Unknown',
                first_name: msg?.from?.first_name || 'Unknown'
            };

            messageData.push(newMessage);
            fs.writeFileSync('messageIp.json', JSON.stringify(messageData, null, 2), 'utf8');
        }
        return Boolean(sent);
    } catch (error) {
        console.error('Error sending IP info to admin:', error);
        return false;
    }
}

async function trackIpVisit(userIp) {
    try {
        const ipResponse = await axios.get(`http://ip-api.com/json/${userIp}`);
        if (ipResponse.data && ipResponse.data.status === 'success') {
            const ipInfo = {
                ...ipResponse.data,
                query: userIp,
                status: "Active",
                time: moment().format("YYYY-MM-DD HH:mm:ss"),
                linkClicked: true,
                type: "Web Visit"
            };

            await sendIpInfoToAdmin(ipInfo);

        }
    } catch (error) {
        console.error("Error tracking IP visit:", error);
    }
}

bot.onText(/\/admin (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== ADMIN_CHAT_ID) {
        await bot.sendMessage(msg.chat.id, '❌ You are not authorized to use admin commands');
        return;
    }

    const command = match[1].toLowerCase();
    try {
        if (command.startsWith('add')) {
            const uid = command.split(' ')[1];
            if (!uid) {
                await bot.sendMessage(msg.chat.id, '❌ Please provide a user ID');
                return;
            }

            let admins = config.admin;
            if (!admins.includes(uid)) {
                admins.push(uid);
                fs.writeFileSync('config.json', JSON.stringify({ ...config, admin: admins }, null, 2));
                await bot.sendMessage(msg.chat.id, `✅ Added ${uid} to admin list`);
            } else {
                await bot.sendMessage(msg.chat.id, '❌ User is already an admin');
            }
        }
        else if (command.startsWith('remove')) {
            const uid = command.split(' ')[1];
            if (!uid) {
                await bot.sendMessage(msg.chat.id, '❌ Please provide a user ID');
                return;
            }

            let admins = config.admin.filter(id => id !== uid);
            if (admins.length === config.admin.length) {
                await bot.sendMessage(msg.chat.id, '❌ User ID not found in admin list');
                return;
            }

            fs.writeFileSync('config.json', JSON.stringify({ ...config, admin: admins }, null, 2));
            await bot.sendMessage(msg.chat.id, `✅ Removed ${uid} from admin list`);
        }
        else if (command === 'list') {
            const admins = config.admin;
            let message = '👑 Admin List:\n\n';
            admins.forEach((admin, index) => {
                message += `${index + 1}. ${admin}\n`;
            });
            await bot.sendMessage(msg.chat.id, message);
        }
        else {
            await bot.sendMessage(msg.chat.id, '❌ Invalid admin command. Available commands:\n/admin add <uid>\n/admin remove <uid>\n/admin list');
        }
    } catch (error) {
        console.error('Error in admin command:', error);
        await bot.sendMessage(msg.chat.id, '❌ An error occurred while processing the command');
    }
});

bot.onText(/\/getips/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID) {
        await bot.sendMessage(chatId, 'You are not authorized to use this command.');
        return;
    }

    const ipData = getIpData();
    let message = 'Tracked IPs:\n\n';
    ipData.forEach((entry, index) => {
        message += `${index + 1}. IP: ${entry.query}\n`;
        message += `   Location: ${entry.city || 'Unknown'}, ${entry.country || 'Unknown'}\n`;
        message += `   ISP: ${entry.isp || 'Unknown'}\n`;
        message += `   Time: ${entry.time || 'Unknown'}\n\n`;
    });
    await bot.sendMessage(chatId, message);
});

bot.onText(/\/clearcache/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        try {
            fs.writeFileSync('UserIp.json', '[]', 'utf8');
            await bot.sendMessage(msg.chat.id, '✅ UserIp.json cache cleared successfully!');
        } catch (error) {
            console.error('Error clearing cache:', error);
            await bot.sendMessage(msg.chat.id, '❌ Error clearing cache.');
        }
    } else {
        await bot.sendMessage(msg.chat.id, 'You are not authorized to use this command.');
    }
});

bot.onText(/\/unsend/, async (msg) => {
    if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
        if (msg.reply_to_message) {
            try {
                await bot.deleteMessage(msg.chat.id, msg.reply_to_message.message_id);
                await bot.deleteMessage(msg.chat.id, msg.message_id);
            } catch (error) {
                console.error('Error deleting message:', error);
                await bot.sendMessage(msg.chat.id, '❌ Failed to delete message');
            }
        } else {
            await bot.sendMessage(msg.chat.id, '❌ Please reply to a message to unsend it');
        }
    } else {
        await bot.sendMessage(msg.chat.id, 'You are not authorized to use this command.');
    }
});

bot.onText(/\/ipdetected (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== ADMIN_CHAT_ID) {
        await bot.sendMessage(msg.chat.id, '❌ You are not authorized to use this command');
        return;
    }

    const userIp = match[1];
    try {
        const ipData = getIpData();
        let userIpData = ipData.find(entry => entry.query === userIp);

        if (!userIpData) {
            userIpData = {
                query: userIp,
                zip: 'Unknown',
                status: "Active",
                time: moment().format("YYYY-MM-DD HH:mm:ss")
            };
        }

        const ipInfo = {
            ...userIpData,
            linkClicked: true,
            status: "Active",
            time: moment().format("YYYY-MM-DD HH:mm:ss")
        };

        await sendIpInfoToAdmin(ipInfo, msg);
        await bot.sendMessage(msg.chat.id, '✅ IP information processed successfully');
    } catch (error) {
        console.error("Error processing IP information:", error);
        await bot.sendMessage(msg.chat.id, '❌ Error processing IP information');
    }
});

module.exports = { sendIpInfoToAdmin, getIpData, updateIpData, trackIpVisit };

// Set up interval for IP checking with error handling
const ipCheckInterval = Math.max(30, config.ipCheckInterval || 30);
setInterval(async () => {
    try {
        const ipData = getIpData();
        if (ipData.length > 0) {
            // Send notification for each unnotified IP
            for (const entry of ipData) {
                if (!entry.notifiedBot) {
                    try {
                        const sent = await sendIpInfoToAdmin(entry);
                        if (sent) {
                            entry.notifiedBot = true;
                            entry.lastNotification = moment().format("YYYY-MM-DD HH:mm:ss");
                            updateIpData(entry);
                        }
                    } catch (err) {
                        console.error('Error sending notification:', err);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in IP checking interval:', error);
    }
}, ipCheckInterval * 1000);

// Schedule cache cleanup based on config
const setupCronSchedule = () => {
    let cronExpression;

    if (config.cacheClearInterval === '1 hour') {
        cronExpression = '0 * * * *';  // Every hour
    } else if (config.cacheClearInterval === '2 hour') {
        cronExpression = '0 */2 * * *';  // Every 2 hours
    } else if (config.cacheClearInterval === 'next8am') {
        cronExpression = '0 8 * * *';  // Every day at 8 AM
    } else {
        cronExpression = config.cacheClearInterval || '0 * * * *';  // Default to hourly
    }

    cron.schedule(cronExpression, () => {
        try {
            fs.writeFileSync('UserIp.json', '[]', 'utf8');
            console.log('UserIp.json cache cleared automatically at:', moment().format('YYYY-MM-DD HH:mm:ss'));

        if (ADMIN_CHAT_ID) {
            bot.sendMessage(ADMIN_CHAT_ID, '🗑️ UserIp.json cache has been automatically cleared.');
        }
    } catch (error) {
        console.error('Error in automated cache cleanup:', error);
        if (ADMIN_CHAT_ID) {
            bot.sendMessage(ADMIN_CHAT_ID, '❌ Error during automated cache cleanup.');
        }
    }
    });
};

console.log('Telegram IP Tracking Bot is running...');