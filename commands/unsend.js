
const handleUnsend = async (bot, msg) => {
    try {
        if (msg.reply_to_message) {
            await bot.deleteMessage(msg.chat.id, msg.reply_to_message.message_id);
            await bot.deleteMessage(msg.chat.id, msg.message_id);
        }
    } catch (error) {
        console.error('Error unsending message:', error);
    }
};

module.exports = { handleUnsend };
