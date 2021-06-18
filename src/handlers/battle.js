const units  = require('../units');

function addComment(r_client, message, version, def_team, off_team, user){

}


function createIDArray(chars, nick){
	let id_arr = [];
	let id_dup = {}; // Duplicate character checker, to avoid calling redis if invalid team
	for(let i = 0; i < chars.length; i++){
		let char_str = chars[i].charAt(0).toUpperCase() + chars[i].substr(1).toLowerCase();
		if(!(char_str in nick)){
			return message.channel.send(`Char ${char_str} unknown.`);
		}
		let id = nick[char_str];
		if(id_dup[id]){
			return message.channel.send(`Invalid team: can't have duplicate character ${char_str}.`);
		}
		id_dup[id] = true;
		id_arr.push(id);
	}
	return id_arr;
}


function submitFirstTeam(r_client, message, nick, d_team, version){
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
				
				if(raw_team.length === 5) {
					let id_arr = createIDArray(raw_team, nick);

					r_client.multi().
					hgetall(`char_data_${id_arr[0]}`).
					hgetall(`char_data_${id_arr[1]}`).
					hgetall(`char_data_${id_arr[2]}`).
					hgetall(`char_data_${id_arr[3]}`).
					hgetall(`char_data_${id_arr[4]}`).
					exec(function(err,results){
						let off_team = new units.Team(results, results.length);
						let version_entry = version + "-" + off_team.units_str();
						
						//TODO: Add to sorted set
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
      })
      .catch(collected => {
          message.channel.send('Timeout');
      });
  })
}

// Layered functions:
// First is nicknames to generate array of ids
// Second is 
// Add support to get a count for results
// Add support to view all
// Add support to view only unpopular results
function battle(r_client, message, args){
	let tot_cnt = 10;
	r_client.hgetall('char_nick', async function(err, nick) {
		const { promisify } = require('util');
		const getAsync = promisify(r_client.get).bind(r_client);
	
		let ver = [];
		ver[0] = await getAsync('cur_version');
		ver[1] = await getAsync('prev_version');
		ver[2] = await getAsync('dead_version');
	
		let id_arr = createIDArray(args, nick);
		
		r_client.multi().
		hgetall(`char_data_${id_arr[0]}`).
		hgetall(`char_data_${id_arr[1]}`).
		hgetall(`char_data_${id_arr[2]}`).
		hgetall(`char_data_${id_arr[3]}`).
		hgetall(`char_data_${id_arr[4]}`).
		exec(function(err,results){
			let team = new units.Team(results, results.length - 1);
		
			r_client.hgetall(team.units_str(), function(err, results){
				if(results === null){ // No teams exist!
					submitFirstTeam(r_client, message, nick, team, ver[0]);
				}else{ // Teams exist!
					let cur_ver = new Off_Teams(ver);
					
					for(const r in results){ // All the submitted teams
						const c = r.charAt(0);
						if(c >= '0' && c <= '9'){ // y_n data
							continue;
						}else{ // Version data
							let versions = results[r].split("_");
							if(versions[0] === version){ // Current version
								let y_n = results[versions[0]+"_"+r]
								cur_ver.addTeam(r,y_n);
							}else{ // Old version, //TODO: Deal with when new version arrives
							
							}
						}
					}
					let str = cur_ver.filt_str('y');
					message.channel.send(str);
				}
			});
		/*
		//This example works for a basic response option
		//Make something similar to this for adding a new team, upvoting a team, or downvoting a team
		let user = m => m.author.id === message.author.id
    message.channel.send(`Are you sure to delete all data? \`YES\` / \`NO\``).then(() => {
      message.channel.awaitMessages(user, {
          max: 1,
          time: 10000,
          errors: ['time']
        })
        .then(message => {
          message = message.first()
          if (message.content.toUpperCase() == 'YES' || message.content.toUpperCase() == 'Y') {
            message.channel.send(`Deleted`)
          } else if (message.content.toUpperCase() == 'NO' || message.content.toUpperCase() == 'N') {
            message.channel.send(`Terminated`)
          } else {
            message.channel.send(`Terminated: Invalid Response`)
          }
        })
        .catch(collected => {
            message.channel.send('Timeout');
        });
    })
			*/
		});
	});
}

module.exports = { battle };
