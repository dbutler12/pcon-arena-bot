const redis = require('redis');
const r_client = redis.createClient(); //creates a new client
r_client.on('connect', function() {
  	console.log('Redis Connected');
});
const bat_h  = require('./battle');
const meta_h = require('./meta');

function com(command, args, client, message, state){
	if(message.author.tag === 'Fengtorin#5328'){
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
		}else if(command === 'add-nick'){
			if(args.length !== 2){
				return message.channel.send("Not enough arguments to add nickname. Need char name and nick name.");
			}
			meta_h.addNick(r_client, message, args[0], args[1]);
		}else if(command === 'update-version'){
			meta_h.updateVer(r_client, args[0]);
		}else if(command === 'add-sort'){
			r_client.zadd('lifetime', 100*Math.random(), args[0]);
		}else if(command === 'test-sort'){
			r_client.zrangebyscore("lifetime", args[0], args[1], function(err, rep) { 		
				message.channel.send(rep); 
				console.log(rep);
			}); 
		}else if(command === 'test-range'){ // Get the highest scored item in the set
			r_client.zrange("lifetime", -1, -1, function(err,rep){
				message.channel.send(rep);
				console.log(rep);
			});
		}else if(command === 'test-react'){
				// Use a promise to wait for the question to reach Discord first
        message.channel.send('👍👎:Jun::Illya::Miyako::Kuka::Shizuru:\n' +
        '     | Score: 12%' +
        '😏😒| Lifetime supplies are good.' +
        '👿😈| FUCK THIS COMP').then((question) => {
          // Have our bot guide the user by reacting with the correct reactions
          question.react('👍');
          question.react('👎');
    
          // Set a filter to ONLY grab those reactions & discard the reactions from the bot
          const filter = (reaction, user) => {
            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
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
	
	if(command === 'fight' || command === 'f'){
		if(args.length === 5){ // Full party
			bat_h.battle(r_client, message, args);
		}else{ // Wrong party size
			message.channel.send("Enemy party needs 5 members.");
		}
	}else if(command === 'char'){
		meta_h.viewChar(r_client, message, args);
	}else if(command === 'version'){
		meta_h.getVer(r_client, message);
	}
	
	/*
	// Example Hello script to show various tools
	if(command === 'Hello' || command === 'hello'){
		var author = message.author.tag;
		message.channel.send(`Hello ${author}`);
		if(args.length != 0){
			var obj = {};
			for(var i = 0; i < args.length; i++){
				if(i === args.length - 1 && i%2 === 0){ // Last value, with no partner
					obj[args[i]] = "";
				}else if(i%2 == 1){
					obj[args[i-1]] = args[i];
				}
			}
			r_client.hmset(author+'hellos', obj);
		}
			
		r_client.incr(author);
		r_client.get(author, (err, reply) => {
			if(err) console.log(err);
			message.channel.send(`You have said hello ${reply} times`);
		});
		
		r_client.hgetall(author+'hellos', function(err, object) {
			message.channel.send("You've hello'd in these ways:");
   		var str = "";
    	for (const property in object) {
    		str = str + `${property}: ${object[property]}` + "\n";
			}
			message.channel.send(str);
		});
	}
	*/
}

module.exports = { com };
