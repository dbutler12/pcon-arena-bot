const redis = require('redis');
const r_client = redis.createClient(); //creates a new client
r_client.on('connect', function() {
  	console.log('Redis Connected');
});
const bat_h  = require('./battle');
const meta_h = require('./meta');
const Units  = require('../units');
const game_h = require('./game');

const devs = {
	'116696809430188032':'tester',
	'331952683579867136':'admin'
}


function com(command, args, client, message, state){
	// Live commands
	if(message.channel.id == '855264420186816513') return;
	if(command in global.commands){
		if(command === 'mfk' || command === 'mdk'){
			game_h.mfk(r_client, client, message);
		}else if(command === 'wifed'){
			game_h.love(r_client, client, message, message.author.tag, 'wifed');
		}else if(command === 'dated'){
			game_h.love(r_client, client, message, message.author.tag, 'dated');
		}else if(command === 'killed'){
			game_h.love(r_client, client, message, message.author.tag, 'killed');
		}else if(command === 'love-love'){
			game_h.love(r_client, client, message, message.author.tag);
		}else if(command === 'char'){
			meta_h.viewChar(r_client, client, message, args);
		}else if(command === 'version'){
			meta_h.getVer(r_client, message);
		}else if(command === 'help'){
			meta_h.help(message);
		}else if(command === 'level'){
			meta_h.checkMyLevel(r_client, message);
		}else if(command === 'fight'){
			if(args.length == 0) game_h.fight(r_client, client, message);
			if(args.length == 1) game_h.accept(r_client, client, message, args);
		}else if(command === 'arena'){
			game_h.resolveFight(r_client, client, message);
		}else if(command === 'fightme'){
			game_h.challenge(r_client, client, message, args);
		}
		
		//TODO: Add command to look at pending challenges
	}
	
	// Dev testing commands
	else if(command in global.dev_commands && message.author.id in devs){
		// Bot test channel commands
		if(message.channel.id == "845007607055253565"){
		}
	}
	


	// Admin specific testing
	else if(message.author.tag === 'Fengtorin#5328'){
		if(command === 'restart'){
			console.log(`${message.author.tag} is requesting restart from task-bot`);
			const channel01 = client.channels.cache.find(channel => channel.id === '833833221077860372');
			channel01.send('restart-arena');
			return;
		}else if(command == 'add-exp'){
			if(args.length == 2) meta_h.addExp(r_client, message, args[0], args[1])
		}else if(command === 'add-char'){
			if(args.length !== 2){
				return message.channel.send("Not enough arguments to add character. Need char name and position.");
			}
			meta_h.addChar(r_client, args[0], args[1]);
		}else if(command === 'mod-char'){
			meta_h.updateChar(r_client, message, args);
		}else if(command === 'update-all-chars'){
			let add_obj = {
				id:-1
			};
			
			let del_arr = false;
			meta_h.updateAllChars(r_client, add_obj, del_arr);
		}else if(command === 'add-nick'){
			if(args.length !== 2){
				return message.channel.send("Not enough arguments to add nickname. Need char name and nick name.");
			}
			meta_h.addNick(r_client, message, args[0], args[1]);
		}else if(command === 'update-version'){
			meta_h.updateVer(r_client, args[0]);
		
		
		
		
		// Original arena fight command
		}else if(command === 'old-arena' || command === 'f'){
			if(args.length === 5){ // Full party
				bat_h.battle(r_client, message, args);
			}else{ // Wrong party size
				message.channel.send("Enemy party needs 5 members.");
			}
		
		// Test functions
		}else if(command === 'test-react'){
				// Use a promise to wait for the question to reach Discord first
        message.channel.send('???? ???? | :Jun::Illya::Miyako::Kuka::Shizuru:\n' +
        '             | Score: 12%\n' +
        '???? ???? | Lifetime supplies are good.\n' +
        '???? ???? | FUCK THIS COMP\n').then((question) => {
          // Have our bot guide the user by reacting with the correct reactions
          question.react('????');
          question.react('????');
    			question.react('????');
    			question.react('????');
    			question.react('????');
          question.react('????');
    			
          // Set a filter to ONLY grab those reactions & discard the reactions from the bot
          const filter = (reaction, user) => {
            return ['????', '????', '????', '????', '????', '????'].includes(reaction.emoji.name) && user.id === message.author.id;
          };
    
          // Create the collector
          const collector = question.createReactionCollector(filter, {
          	max: 2,
            time: 15000
          });
    			
    			collector.on('collect', (collected, user) => {
    				let emoji = collected.emoji.name;
    				
    				if(emoji === '????'){
    					message.channel.send('Liking the team!');
    				}else if(emoji === '????'){
    					message.channel.send('Not liking the team!');
    				}else if(emoji === '????'){
    					message.channel.send('Not liking the random comment!');
    				}else if(emoji === '????'){
    					message.channel.send('Liking the random comment!');
    				}else if(emoji === '????'){
    					message.channel.send('Liking the top comment!');
    				}else if(emoji === '????'){
    					message.channel.send('Not liking the top comment!');
    				}
    			});
    			
          collector.on('end', (collected, reason) => {
            if (reason === 'time') {
              message.reply('Ran out of time ???...');
            } /*else {
              // Grab the first reaction in the array
              let userReaction  = collected.array()[0];
              let userReaction2 = null;
              if(collected.array().length > 1){
              	userReaction2 = collected.array()[1];
              }
              // Grab the name of the reaction (which is the emoji itself)
              let emoji = userReaction._emoji.name;
    
              // Handle accordingly
              if (emoji === '????') { //????????????????
                message.reply('Glad your reaction is ????!');
              } else if (emoji === '????') {
                message.reply('Sorry your reaction is ????');
              } else {
                // This should be filtered out, but handle it just in case
                message.reply(`I dont understand ${emoji}...`);
              }
            }*/
          });
        });
		}
	}
}


function intel(client, message){
	if (message.attachments.size > 0) {
    if (message.attachments.every(isImage)){
        meta_h.addExp(r_client, message, message.author.tag, 5);
    }
	}
}


function isImage(attachment) {
  let url = attachment.url;
  return url.indexOf("png", url.length - "png".length) !== -1 || url.indexOf("jpg", url.length - "jpg".length) !== -1;
}



module.exports = { com, intel };
