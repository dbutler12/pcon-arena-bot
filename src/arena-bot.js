const { Client } = require('discord.js');
const client  = new Client();
const PREFIX = "!";
require('dotenv').config();
const com_h = require('./handlers/command');

client.once('ready', () => {
	console.log("Bot ready to go");
});

client.on('message', message => {
  if(message.author.bot) return;
  if(message.content.startsWith(PREFIX)){
    const [CMD_NAME, ...args] = message.content
    .trim()
    .substring(PREFIX.length)
    .split(/\s+/);

    com_h.com(CMD_NAME, args, client, message, 0);
  }
});

client.login(process.env.DISCORDJS_BOT_TOKEN);
