
const fs = require('fs');
const { exec } = require('child_process');

const clearCacheCommand = (bot, ADMIN_CHAT_ID) => {
    bot.onText(/\/clearcache (.+)/, async (msg, match) => {
        if (msg.chat.id.toString() === ADMIN_CHAT_ID) {
            const option = match[1].toLowerCase();
            try {
                if (option === 'userip') {
                    fs.writeFileSync('UserIp.json', '[]', 'utf8');
                    await bot.sendMessage(msg.chat.id, '✅ UserIp.json cache cleared successfully! Restarting...');
                    exec('kill 1');
                } 
                else if (option === 'messageip') {
                    fs.writeFileSync('messageIp.json', '[]', 'utf8');
                    await bot.sendMessage(msg.chat.id, '✅ messageIp.json cache cleared successfully! Restarting...');
                    exec('kill 1');
                }
                else if (option === 'all') {
                    fs.writeFileSync('UserIp.json', '[]', 'utf8');
                    fs.writeFileSync('messageIp.json', '[]', 'utf8');
                    await bot.sendMessage(msg.chat.id, '✅ All cache files cleared successfully! Restarting...');
                    exec('kill 1');
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
