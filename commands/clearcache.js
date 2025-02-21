
const fs = require('fs');

const clearCacheCommand = (bot, ADMIN_CHAT_ID) => {
    bot.onText(/\/clearcache/, async (msg) => {
        if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
            try {
                fs.writeFileSync('UserIp.json', '[]');
                await bot.sendMessage(msg.chat.id, '✅ UserIp.json cache cleared successfully!');
            } catch (error) {
                console.error('Error clearing cache:', error);
                await bot.sendMessage(msg.chat.id, '❌ Error clearing cache.');
            }
        } else {
            bot.sendMessage(msg.chat.id, 'You are not authorized to use this command.');
        }
    });
};

module.exports = clearCacheCommand;
