const redis = require('redis');
const r_client = redis.createClient(); //creates a new client
r_client.on('connect', function() {
  	console.log('Redis Connected');
});
const bat_h  = require('./battle');
const meta_h = require('./meta');


function Unit(name, position){
	this.name = name;
	this.position = position;
}


function Team(data, num){
	this.num = num;
	this.units = [];
	
	this.init = function() {
		let unit = new Unit(data[0]['name'], data[0]['position']);
		this.units[0] = unit;
		
		for(let i = 1; i < this.num; i++){
			let cur = new Unit(data[i]['name'], data[i]['position']);
			
			for(let j = i - 1; j >= 0; j--){
				if(this.units[j]['position'] < cur['position']){
					this.units[j+1] = this.units[j];
					if(j === 0){
						this.units[j] = cur;
					}
				}else if(this.units[j]['position'] < cur['position']){ // Invalid team
					this.num = -1
					return;
				}else{
					this.units[j + 1] = cur;
					break;
				}
			}
		}
	}
	
	this.units_str = function(){
		return this.units.map(u => u.name).join('_');
	}
	
	this.init();
}

/*
async function makeTeam(r_client, message, nick, raw_team, version){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	
	if(raw_team.length === 5) {
		let id_arr = [];
		for(let i = 0; i < raw_team.length; i++){
			let char_str = raw_team[i].charAt(0).toUpperCase() + raw_team[i].substr(1).toLowerCase();
			if(!(char_str in nick)){
				return message.channel.send(`Char ${char_str} unknown.`);
			}
			id_arr.push(nick[char_str]);
		}
		r_client.multi().
		hgetall(`char_data_${id_arr[0]}`).
		hgetall(`char_data_${id_arr[1]}`).
		hgetall(`char_data_${id_arr[2]}`).
		hgetall(`char_data_${id_arr[3]}`).
		hgetall(`char_data_${id_arr[4]}`).
		exec(function(err,results){
			let a_team = new Team(results, results.length);
			if(a_team.num === -1) return message.channel.send("Invalid team: can't have duplicate characters.");
			let entry = a_team.units_str();
			let version_entry = version + "_" + entry;
			let team_obj = { [entry]:version , [version_entry]:"1_0" };
			//TODO: Add check to see if team exists, if so just make yes go up.
			r_client.hmset(d_team.units_str(), team_obj, function(err, reply){
				if(err){
					console.log(err);
					return message.channel.send("Unknown error. Please let an admin know what you did.");
				}
				message.channel.send("Team added!");
			});
		});
	}else{
		message.channel.send("Invalid team.");
	}
*/

/*
// Get user input method
	let user = m => m.author.id === message.author.id;
  message.channel.send(`No teams exist to defeat that team. Submit 5 units to add a new team.`).then(() => {
    message.channel.awaitMessages(user, {
        max: 1,
        time: 25000,
        errors: ['time']
      })
      .then(message => {
      	const PREFIX = "!";
      	message = message.first();
      	if(message.content.startsWith(PREFIX)){
		  		const raw_team = message.content
		  		.trim()
		  		.substring(PREFIX.length)
		  		.split(/\s+/);
				}
				

      })
      .catch(collected => {
          message.channel.send('Timeout');
      });
  })
}
*/


async function tester(r_client, args){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.hgetall).bind(r_client);
	
	let nick = await getAsync('char_nick');
	
	let args2 = ["arisa", "saren", "ninon", "tamaki", "jun"];
	let id_arr = [];
	for(let i = 0; i < args.length; i++){
		let char_str = args[i].charAt(0).toUpperCase() + args[i].substr(1).toLowerCase();
		let char_str2 = args2[i].charAt(0).toUpperCase() + args[i].substr(1).toLowerCase();
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
	let a_team = new Team(units, units.length);
	if(a_team.num === -1) return message.channel.send("Invalid team: can't have duplicate characters.");
	let b_team = new Team(units2, units2.length);
	
	console.log(a_team);
	console.log(b_team);
}


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
