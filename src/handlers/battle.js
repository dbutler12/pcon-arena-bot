const Units  = require('../units');

function addComment(r_client, message, version, def_team, off_team, user){

}


function createIDArray(chars, nick){
	let id_arr = [];
	let error = null;
	let id_dup = {}; // Duplicate character checker, to avoid calling redis if invalid team
	for(let i = 0; i < chars.length; i++){
		let char_str = chars[i].charAt(0).toUpperCase() + chars[i].substr(1).toLowerCase();
		if(!(char_str in nick)){
			error = `Char ${char_str} unknown.`;
			return {error, id_arr};
		}
		let id = nick[char_str];
		if(id_dup[id]){
			error = `Invalid team: can't have duplicate character ${char_str}.`;
			return {error, id_arr};
		}
		id_dup[id] = true;
		id_arr.push(id);
	}
	return {error, id_arr};
}



function createScoreStr(def_str, off_str, version){
	return version + "-" + def_str + "-" + off_str + "-score";
}


function submitFirstTeam(r_client, message, nick, def_team, version){
	let user = m => m.author.id === message.author.id;
  message.channel.send(`No teams exist to defeat that team. If you want to add a team: Submit 5 units to add a new team. Example: !add Io Shinobu Suzume Ilya Aoi.`).then(() => {
    message.channel.awaitMessages(user, {
        max: 1,
        time: 25000,
        errors: ['time']
      })
      .then(message => {
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
					let {error, id_arr} = createIDArray(raw_team, nick);
					if(error){
						return message.channel.send(error);
					}
					r_client.multi().
					hgetall(`char_data_${id_arr[0]}`).
					hgetall(`char_data_${id_arr[1]}`).
					hgetall(`char_data_${id_arr[2]}`).
					hgetall(`char_data_${id_arr[3]}`).
					hgetall(`char_data_${id_arr[4]}`).
					exec(function(err,results){
						let off_team = new Units.Team(results, results.length);
						let version_entry = version + "-" + off_team.unitsStr();
						
						//TODO: Remake data structures
						//Add to sorted set chars_defense_team: chars_offense_team
						let off_str = off_team.unitsStr();
						let def_str = def_team.unitsStr();
						let score_str = createScoreStr(def_str, off_str, version);
						
						r_client.zadd(def_str, 100, off_str); // Team added to sorted set
						
						// Add version data for team to string
						r_client.set(off_str + "-" + def_str, version, function(err, reply){
							console.log(`New team set: ${off_str}-${def_str}:${reply}`);
						});
						
						// Add to version-defense-offense-score: [y or n]-user_tag
						r_client.sadd([score_str, "y-" + message.author.tag], function(err, reply) {
							if(err){
								console.log("First team scoring sadd err:" + err);
							}
						}); // User tag added for scoring purposes
						
						// Add to version-master set
						r_client.sadd([version+'-master', score_str], function(err, reply) {
							if(err){
								console.log("First team version master sadd err:" + err);
							}
						});
						
						message.channel.send("Team added!");
						
						
						
						message.channel.send(`If you would like to add a comment to this team, use !com Comment Example: !com Team only works with 4*+ Io.`).then(() => {
						message.channel.awaitMessages(user, {
								max: 1,
								time: 25000,
								errors: ['time']
							})
							.then(message => {
								const PREFIX = "!";
								message = message.first();
								if(message.content.startsWith(PREFIX)){
									const raw_comment = message.content
									.trim()
									.substring(PREFIX.length);
									
									let [command, ...comment] = raw_comment.split(/\s+/);
									comment = comment.join(/\s+/);
									
									if(command === 'com'){
										console.log("Adding comment (test):" + comment);
									}
								}
							})
							.catch(collected => {
								console.log("First time comment collected: " + collected);
							});
						})
					})
				}else{
					//TODO: Consider not having a return message here, or something more generic
					message.channel.send("Invalid team.");
				}
      })
      .catch(collected => {
      	console.log("First time add team collected:" + collected);
        //message.channel.send('Timeout');
      });
  })
}


// Display the results of the selected teams that beat the given team
function displayAttackResults(off_team, vers){
	for(let i = 0; i < off_team.num; i++){
		message.channel.send(off_team.teamStr(i));
	}
}



// Layered functions:
// First is nicknames to generate array of ids
// Second is 
// Add support to get a count for results
// Add support to view all
// Add support to view only unpopular results
function battle(r_client, message, args){
	r_client.hgetall('char_nick', async function(err, nick) {
		const { promisify } = require('util');
		const getAsync = promisify(r_client.get).bind(r_client);
	
		let vers = [];
		vers[0] = await getAsync('cur_version');
		vers[1] = await getAsync('prev_version');
		vers[2] = await getAsync('dead_version');
	
		let {error, id_arr} = createIDArray(args, nick);
		if(error){
			return message.channel.send(error);
		}
		r_client.multi().
		hgetall(`char_data_${id_arr[0]}`).
		hgetall(`char_data_${id_arr[1]}`).
		hgetall(`char_data_${id_arr[2]}`).
		hgetall(`char_data_${id_arr[3]}`).
		hgetall(`char_data_${id_arr[4]}`).
		exec(function(err,results){
			if(err){
				return console.log("Error in battle raw defense team:" + err);
			}
			let def_team = new Units.Team(results, results.length);
			let team_str = def_team.unitsStr();
			
			r_client.zrevrangebyscore(team_str, 1000, 0, "withscores", async function(err, results){
				if(err){
					return console.log("Error in battle defense team scores:" + err);
				}
				if(results === null || results.length === 0){ // No teams exist!
					submitFirstTeam(r_client, message, nick, def_team, vers[0]);
				}else{ // Teams exist!
					let tot_cnt = results.length;					
					let off_teams = new Units.Off_Teams(def_team);
					let top_cnt = 2;
					
					for(let i = 0; i < tot_cnt && i < 2*top_cnt; i+2){
						off_teams.addTeam(results[i], results[i+1], await getAsync(team_str+"-"+results[i]));
					}
					
					if(tot_cnt > 2*top_cnt){
						let rand = Math.floor(((tot_cnt - 2*top_cnt)/2)*Math.random() + 2*top_cnt);
						off_teams.addTeam(results[rand], results[rand+1], await getAsync(team_str+"-"+results[rand]));
					}
					displayAttackResults(off_teams, vers);
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
