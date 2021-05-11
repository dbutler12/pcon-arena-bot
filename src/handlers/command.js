const redis = require('redis');
const r_client = redis.createClient(); //creates a new client
r_client.on('connect', function() {
  	console.log('Redis Connected');
});

//TODO: Decide if a singleton makes sense in this case
//      Hard to say since multiple calls to this function don't seem to instantiate new connections anyway
/*
const r_wrap   = require('../onboard/redis_wrap');
const r_client = r_wrap.getRedis();
*/

function com(command, args, client, message, state){
	if(command === 'restart' && message.author.tag === 'Fengtorin#5328'){
		console.log(`${message.author.tag} is requesting restart from task-bot`);
		const channel01 = client.channels.cache.find(channel => channel.id === '833833221077860372');
		channel01.send('restart-hyoid');
		/*
		client.users.fetch('833809693960962138').then(user => {
			message.channel.send(user.tag);
			console.log(`Sending restart message to ${user.tag}`);
			user.send('restart-hyoid');
		}, reason => {
			console.log(`Something went wrong with task-bot: ${reason}`);
			message.channel.send(`Something went wrong with task-bot: ${reason}`);
		});
		*/
		return;
	}
	
	if(command === 'life'){
		message.channel.send("and oceans, wowsors!");
		return;
	}
	if(command === 'Hello' || command == 'hello'){
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
}

module.exports = { com };
