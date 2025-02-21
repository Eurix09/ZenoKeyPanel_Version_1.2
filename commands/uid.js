
const fs = require('fs');
const path = require('path');

const uidCommand = (bot) => {
    bot.onText(/\/uid/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username || 'No username';
        const firstName = msg.from.first_name || 'No first name';
        const lastName = msg.from.last_name || 'No last name';

        const message = `👤 User Information:\n\n` +
            `🆔 User ID: ${userId}\n` +
            `👤 Username: @${username}\n` +
            `📝 First Name: ${firstName}\n` +
            `📝 Last Name: ${lastName}\n` +
            `💭 Chat ID: ${chatId}`;

        bot.sendMessage(chatId, message);
    });
};

module.exports = uidCommand;
