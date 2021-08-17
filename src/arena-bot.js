const { Client } = require('discord.js');
const client  = new Client();
const PREFIX = "!";
require('dotenv').config();
const com_h = require('./handlers/command');

global.commands = {
	arena: "!arena to see battles other people have added teams for. Choose which is correct to resolve the fight",
	level: "!level to check level and next exp amount",
	char: "Use !char name to Get character information. Will accept nicknames.",
	fight: "!fight to see an arena team. Add your own team to beat it! (Example: !Jun Kaori Makoto Misato Yori)",
	help: "Use !help to get command help",
	mfk: "!mfk or !mdk: Marry date kill game. Bot will list 3 characters that you can choose to marry, date, or kill.(Example: Jun Yukari Io)\nAfterwards, use ! and tell the bot in order of !Marry Date Kill the characters.(Example: !Io Jun Yukari)",
	mdk: "Marry date kill game",
	"love-love": "Lists personal stats for mdk game",
	version: "!version will show current version of Priconne the bot supports"
}

global.com_call = {
	level: "!level",
	mfk: "!mfk or !mdk, then !name name name in order of !marry date kill",
	"love-love": "!love-love",
	help: "!help",
	char: "!char name",
	version: "!version"
}

global.dev_commands = {
	fight: "!fight",
	arena: "!arena"
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
