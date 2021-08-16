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
	'Mars#0849':'tester',
	'Fengtorin#5328':'admin'
}

function com(command, args, client, message, state){
	// Live commands
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
		}
	}
	

	
	
	
	
	// Admin specific testing
	else if(message.author.tag === 'Fengtorin#5328'){
		if(command === 'restart'){
			console.log(`${message.author.tag} is requesting restart from task-bot`);
			const channel01 = client.channels.cache.find(channel => channel.id === '833833221077860372');
			channel01.send('restart-arena');
			return;
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
		

		}else if(command === 'arena'){
			game_h.resolveFight(r_client, client, message);
		
		
		
		
		
		// Original arena fight command
		}else if(command === 'arena' || command === 'f'){
			if(args.length === 5){ // Full party
				bat_h.battle(r_client, message, args);
			}else{ // Wrong party size
				message.channel.send("Enemy party needs 5 members.");
			}
		
		
		
		
		// Test functions
		}else if(command === 'add-sort'){
			r_client.zadd('lifetime', 100*Math.random(), args[0]);
		}else if(command === 'test-sort'){
			r_client.zrevrangebyscore("lifetime", args[1], args[0], "withscores", function(err, rep){ 	
				if(rep.length === 0){
					message.channel.send("Empty");
				}else{
					message.channel.send(rep); 
					console.log(rep);
				}
			}); 
		}else if(command === 'test-range'){ // Get the highest scored item in the set
			r_client.zrange("lifetime", -1, -1, function(err,rep){
				message.channel.send(rep);
				console.log(rep);
			});
		}else if(command === 'test-asyn'){
			tester(r_client, args);
		}else if(command === 'test-react'){
				// Use a promise to wait for the question to reach Discord first
        message.channel.send('👍 👎 | :Jun::Illya::Miyako::Kuka::Shizuru:\n' +
        '             | Score: 12%\n' +
        '😏 😒 | Lifetime supplies are good.\n' +
        '😈 👿 | FUCK THIS COMP\n').then((question) => {
          // Have our bot guide the user by reacting with the correct reactions
          question.react('👍');
          question.react('👎');
    			question.react('😏');
    			question.react('😒');
    			question.react('😈');
          question.react('👿');
    			
          // Set a filter to ONLY grab those reactions & discard the reactions from the bot
          const filter = (reaction, user) => {
            return ['👍', '👎', '😏', '😒', '😈', '👿'].includes(reaction.emoji.name) && user.id === message.author.id;
          };
    
          // Create the collector
          const collector = question.createReactionCollector(filter, {
          	max: 2,
            time: 15000
          });
    			
    			collector.on('collect', (collected, user) => {
    				let emoji = collected.emoji.name;
    				
    				if(emoji === '👍'){
    					message.channel.send('Liking the team!');
    				}else if(emoji === '👎'){
    					message.channel.send('Not liking the team!');
    				}else if(emoji === '👿'){
    					message.channel.send('Not liking the random comment!');
    				}else if(emoji === '😈'){
    					message.channel.send('Liking the random comment!');
    				}else if(emoji === '😏'){
    					message.channel.send('Liking the top comment!');
    				}else if(emoji === '😒'){
    					message.channel.send('Not liking the top comment!');
    				}
    			});
    			
          collector.on('end', (collected, reason) => {
            if (reason === 'time') {
              message.reply('Ran out of time ☹...');
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
              if (emoji === '👍') { //👿😈😏😒
                message.reply('Glad your reaction is 👍!');
              } else if (emoji === '👎') {
                message.reply('Sorry your reaction is 👎');
              } else {
                // This should be filtered out, but handle it just in case
                message.reply(`I dont understand ${emoji}...`);
              }
            }*/
          });
        });
		}
	}
	
	
	
	
	// Tester commands
	else if(message.author.tag in devs){
		if(command === 'fight'){
			game_h.fight(r_client, client, message);
		}
	}
	
	
	
	
	
		// Bot test channel commands
	else if(message.channel.id == "845007607055253565" || message.channel.id == "845007583060426794"){
		if(command === 'mfk_t'){
			message.channel.send("mfk has been updated to mfk_t");
				// Fight game
		}
	}
}


async function tester(r_client, args){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.hgetall).bind(r_client);
	
	let nick = await getAsync('char_nick');
	
	let args2 = ["arisa", "saren", "ninon", "tamaki", "jun"];

	let id_arr = [];
	let id_arr2 = [];
	for(let i = 0; i < args.length; i++){
		let char_str = args[i].charAt(0).toUpperCase() + args[i].substr(1).toLowerCase();
		let char_str2 = args2[i].charAt(0).toUpperCase() + args2[i].substr(1).toLowerCase();
		if(!(char_str in nick)){
			return message.channel.send(`Char ${char_str} unknown.`);
		}
		id_arr.push(nick[char_str]);
		id_arr2.push(nick[char_str2]);
	}

	const units = [];
	const units2 = [];
	
	for(let i = 0; i < 5; i++){
		units.push(await getAsync(`char_data_${id_arr[i]}`));
		units2.push(await getAsync(`char_data_${id_arr2[i]}`));
	}

	let a_team = new Units.Team(units, units.length);
	if(a_team.num === -1) return message.channel.send("Invalid team: can't have duplicate characters.");
	let b_team = new Units.Team(units2, units2.length, a_team);
	
	console.log(a_team);
	console.log(b_team);
}

module.exports = { com };
