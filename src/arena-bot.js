const { Client } = require('discord.js');
const client  = new Client();
const PREFIX = "!";
require('dotenv').config();
const com_h = require('./handlers/command');

global.commands = {
	mfk: "!mfk or !mdk: Marry date kill game. Bot will list 3 characters that you can choose to marry, date, or kill.(Example: Jun Yukari Io)\nAfterwards, use ! and tell the bot in order of !Marry Date Kill the characters.(Example: !Io Jun Yukari)",
	mdk: "Marry date kill game",
	"love-love": "Lists personal stats for mdk game",
	wifed: "Lists all wifed characters for mdk game",
	dated: "Lists all dated characters for mdk game",
	killed: "Lists all murdered characters for mdk game",
	char: "Use !char name to Get character information. Will accept nicknames.",
	version: "!version will show current version of Priconne the bot supports"
}

global.com_call = {
	mfk: "!mfk or !mdk, then !name name name in order of !marry date kill",
	"love-love": "!love-love",
	wifed: "!wifed",
	dated: "!dated",
	killed: "!killed",
	char: "!char name",
	version: "!version"
}

global.prefix = '!';

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
