const redis = require('redis');
const r_client = redis.createClient(); //creates a new client
r_client.on('connect', function() {
  	console.log('Redis Connected');
});
const bat_h  = require('battle');
const meta_h = require('meta');

function com(command, args, client, message, state){
	if(message.author.tag === 'Fengtorin#5328'){
		if(command === 'restart'){
			console.log(`${message.author.tag} is requesting restart from task-bot`);
			const channel01 = client.channels.cache.find(channel => channel.id === '833833221077860372');
			channel01.send('restart-arena');
			return;
		}else if(command === 'add-char'){
			meta_h.addChar(r_client, args[0], args[1]);
		}else if(command === 'init'){
			r_client.set("cur_char_id", 0);
			var life = r_client.get("cur_char_id");
			message.channel.send(`cur id set to ${life}`);
		}
	}
	
	if(command === 'fight' || command === 'f'){
		if(args.length == 0){ // Fight who?
			
		}else if(args.length >= 5){ // Full party
			bat_h.battle(args, client, r_client, message);
		}else{ // Less than full party, default to 0 until handled
		
		}
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
			if(object === null) return;
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
