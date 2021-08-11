const Units  = require('../units');
const redis_h  = require('./redis-methods');

async function mfk(r_client, message){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	let char_id = await getAsync('cur_char_id');
	char_id = parseInt(char_id)-1;
	
	let id_arr = [];
	id_arr[0] = Math.floor(Math.random()*char_id);
	id_arr[1] = Math.floor(Math.random()*char_id);
	id_arr[2] = Math.floor(Math.random()*char_id);
	
	let lockout = 0;
	while((id_arr[0] === id_arr[1] || id_arr[0] === id_arr[2] || id_arr[1] === id_arr[2]) && lockout < 10){
		id_arr[0] = Math.floor(Math.random()*char_id);
		id_arr[1] = Math.floor(Math.random()*char_id);
		id_arr[2] = Math.floor(Math.random()*char_id);
		lockout++;
	}
	
	if(lockout > 9) return message.channel.send("Failed to randomize.");
	
	let team = await redis_h.idToTeam(r_client, id_arr);
	submitMFK(r_client, message, team);
}





function submitMFK(r_client, message, team){
	let user = m => m.author.id === message.author.id;
  message.channel.send(`Marry Date Kill:\n${team.unitsEmo()}`).then(() => {
    message.channel.awaitMessages(user, {
        max: 1,
        time: 50000,
        errors: ['time']
      })
      .then(async function(message){
      	const PREFIX = "!";
      	let raw_team = "";
      	message = message.first();
      	if(message.content.startsWith(PREFIX)){
		  		const raw_message = message.content
		  		.trim()
		  		.substring(PREFIX.length)
		  		
		  		raw_team = raw_message.split(/\s+/);

				}else{
					return;
				}		
				
				if(raw_team.length === 3 && team.compareTeam(await redis_h.charsToTeam(r_client, message, raw_team))) {
					let name = message.author.username;
					message.channel.send(`${name} would marry :${raw_team[0]}:, date ${raw_team[1]}, and murder poor ${raw_team[2]}`);
					
				}else{
					//TODO: Consider not having a return message here, or something more generic
					message.channel.send("Entered wrong units.");
				}
      })
      .catch(collected => {
      	if(collected.length > 0){
		    	console.log("submitMFK Collected:");
		      console.log(collected);
		    }
      });
  })
}


module.exports = { mfk };
