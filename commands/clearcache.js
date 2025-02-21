
const fs = require('fs');

const clearCacheCommand = (bot, ADMIN_CHAT_ID) => {
    bot.onText(/\/clearcache (.+)/, async (msg, match) => {
        if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
            const option = match[1].toLowerCase();
            try {
                if (option === 'userip') {
                    fs.unlinkSync('UserIp.json');
                    await bot.sendMessage(msg.chat.id, '✅ UserIp.json deleted successfully!');
                } 
                else if (option === 'messageip') {
                    fs.unlinkSync('messageIp.json');
                    await bot.sendMessage(msg.chat.id, '✅ messageIp.json deleted successfully!');
                }
                else if (option === 'all') {
                    fs.unlinkSync('UserIp.json');
                    fs.unlinkSync('messageIp.json');
                    await bot.sendMessage(msg.chat.id, '✅ All files deleted successfully!');
                }
                else {
                    await bot.sendMessage(msg.chat.id, '❌ Invalid option. Use: userip, messageip, or all');
                }
            } catch (error) {
                console.error('Error clearing cache:', error);
                await bot.sendMessage(msg.chat.id, '❌ Error clearing cache.');
            }
        } else {
            await bot.sendMessage(msg.chat.id, 'You are not authorized to use this command.');
        }
    });

    // Keep the original command for backward compatibility
    bot.onText(/^\/clearcache$/, async (msg) => {
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
};

module.exports = clearCacheCommand;
