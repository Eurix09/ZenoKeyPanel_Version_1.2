
const startCommand = (bot) => {
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const message = `🤖 Welcome to ZenoBot!\n\n` +
            `Available commands:\n` +
            `🔹 /help - Show all commands\n` +
            `🔹 /getips - View tracked IPs (Admin)\n` +
            `🔹 /unsend - Delete a message (Admin)\n` +
            `🔹 /clearcache - Clear IP cache (Admin)\n` +
            `🔹 /admin - Admin management\n\n` +
            `For support, contact: @ZenoOnTop`;

        bot.sendMessage(chatId, message);
    });
};

module.exports = startCommand;
