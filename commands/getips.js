
const fs = require('fs');

const getIpsCommand = (bot, ADMIN_CHAT_ID) => {
    bot.onText(/\/getips/, async (msg) => {
        const chatId = msg.chat.id;
        if (chatId.toString() !== ADMIN_CHAT_ID) {
            bot.sendMessage(chatId, 'You are not authorized to use this command.');
            return;
        }
        
        const ipData = JSON.parse(fs.readFileSync('UserIp.json', 'utf8'));
        let message = 'Tracked IPs:\n\n';
        ipData.forEach((entry, index) => {
            message += `${index + 1}. IP: ${entry.query}\n`;
            message += `   Location: ${entry.city}, ${entry.country}\n`;
            message += `   ISP: ${entry.isp}\n`;
            message += `   Time: ${entry.time}\n\n`;
        });
        bot.sendMessage(chatId, message);
    });
};

module.exports = getIpsCommand;
