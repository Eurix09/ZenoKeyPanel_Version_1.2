const helpCommand = (bot) => {
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        const message = `Available commands:\n` +
            `🔹 /start - Start the bot\n` +
            `🔹 /help - Show this help message\n` +
            `🔹 /getips - View tracked IPs (Admin)\n` +
            `🔹 /unsend - Delete a message (Admin)\n` +
            `🔹 /clearcache - Clear IP cache (Admin)\n` +
            `🔹 /admin - Admin management`;
        bot.sendMessage(chatId, message);
    });
};

module.exports = helpCommand;