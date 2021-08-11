const Units  = require('../units');
const redis  = require('redis-methods');

function mfk(r_client, message){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	let char_id = await getAsync('cur_char_id');
	char_id = parseInt(char_id)-1;
	
	let id_arr = [];
	id_arr[0] = Math.random()*char_id;

	while((id_arr[1] = Math.random()*char_id) != id_arr[0]);
	while((id_arr[2] = Math.random()*char_id) != id_arr[1] && id_arr[2] != id_arr[0]);
	
	let team = redis.redisIDToTeam(r_client, message, id_arr);
	message.channel.send(team.unitsEmo());
}



/*

function submitTeam(r_client, message, version, def_team, add_team_comment = ""){
	let user = m => m.author.id === message.author.id;
  message.channel.send(`${add_team_comment}If you want to add a team: Submit 5 units to add a new team.\nExample: !add Io Shinobu Suzume Ilya Aoi.`).then(() => {
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
		  		
		  		let [command, ...raw] = raw_message.split(/\s+/);
		  		raw_team = raw;
		  		if(command !== 'add'){
		  			return;
		  		}
				}else{
					return;
				}		
				
				if(raw_team.length === 5) {
					let off_team = await redisPullTeam(r_client, message, raw_team);
					redisAddTeam(r_client, message, def_team, off_team, version)
					
					message.channel.send("Team added!");
					
					// TODO: Modularize this, so comments can just be added at any point
					message.channel.send(`If you would like to add a comment to this team, use !com Comment\nExample: !com Team only works with 4*+ Io.`).then(() => {
						addComment(r_client, message, version, user, def_team, off_team);
					})
				}else{
					//TODO: Consider not having a return message here, or something more generic
					message.channel.send("Invalid team.");
				}
      })
      .catch(collected => {
      	if(collected.length > 0){
		    	console.log("First time add team collected:");
		      console.log(collected);
		    }
      });
  })
}
*/

module.exports = { game };
