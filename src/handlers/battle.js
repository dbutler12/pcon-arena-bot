const Units  = require('../units');

function addComment(r_client, message, version, user, def_team, off_team){
	message.channel.awaitMessages(user, {
			max: 1,
			time: 50000,
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
				comment = comment.join(" ").substring(0,200);
				
				if(command === 'com'){
					let usr_tag = message.author.tag;
					let redis_str = new RedisDefOffStr(def_team, off_team, version)
					let tag_str = redis_str.toStr("", "tags");
					r_client.zadd(tag_str, 100, usr_tag); // Add user tag to comments
					
					let com_str = redis_str.toStr(usr_tag, "comment");
					r_client.set(com_str, comment, function(err, reply){
						if(!err){
							message.channel.send("Comment set.");
						}
					});
				}
			}
		})
		.catch(collected => {
			if(collected.length > 0){
				console.log("Comment collected:");
				console.log(collected);
			}
		});
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

// Returns a Team object comprised of the characters given in the 'chars' array
// chars is an array of strings
async function redisPullTeam(r_client, message, chars){
		const { promisify } = require('util');
		const hashAsync = promisify(r_client.hgetall).bind(r_client);
		
		let nick = await hashAsync('char_nick');
		let {error, id_arr} = createIDArray(chars, nick);
		if(error){
			message.channel.send(error);
			return new Units.Team([], 0);
		}
		
		let results = [];
		for(let i = 0; i < id_arr.length; i++){
			results.push(await hashAsync(`char_data_${id_arr[i]}`));
		}
		
		return new Units.Team(results, results.length);
}

// Object to convert def/off teams into Redis datastructure strings
// Instantiate with a def team, off team, and version
// def/off teams can be strings or a Team object
// Use the toStr method with desired prefix/suffix for desired data
function RedisDefOffStr(def_team, off_team, version){
	this.version = version;
	
	this.init = function(){
		if(typeof off_team === 'string' || off_team instanceof String){
			this.off_str = off_team;
		}else{
			this.off_str = off_team.unitsStr();
		}
		
		if(typeof def_team === 'string' || def_team instanceof String){
			this.def_str = def_team;
		}else{
			this.def_str = def_team.unitsStr();
		}
	}
	
	this.toStr = function(prefix = "", suffix = ""){
		if(prefix !== "") prefix = prefix + "-";
		if(suffix !== "") suffix = "-" + suffix;
		return prefix + this.version + "-" + this.def_str + "-" + this.off_str + suffix; 
	}
	
	this.init();
}

// When a team is from an older version, this function updates its version
function redisUpdateTeamVersion(r_client, message, score_str, def_str, off_str, team_vers, version, score, tag){
	// Update version	
	r_client.set(def_str + "-" + off_str, version, function(err, reply){
		console.log(`Version updated: ${def_str}-${off_str}:${reply}`);
	});
	
	// Delete all user data for previous scoring
	r_client.del(team_vers + "-" + def_str + "-" + off_str + "-score");
	
	// Add user data to current scoring
	r_client.sadd([score_str, "y-" + message.author.tag], function(err, reply) {
		if(err){
			console.log("Add team scoring sadd err:" + err);
		}
	});
	
	// Update score to reflect updating to new version
	let new_score = 1;
	if(score >= 1000){
		new_score = 99;
	}else{
		new_score = (score * 14) / 1000 + 85
	} 
	r_client.zadd(def_str, new_score, off_str);
	
	// Remove team from previous version set
	r_client.srem(team_vers, def_str + "-" + off_str);
	
	// Add team to current version set
	r_client.sadd([version, def_str + "-" + off_str], function(err, reply){
		if(err){
			console.log("Update team version sadd err:" + err);
		}
	});
	
	// Remove from previous version-master set
	r_client.srem(team_vers+'-master', score_str);
	
	// Add to current version-master set
	r_client.sadd([version+'-master', score_str], function(err, reply) {
		if(err){
			console.log("Add team version master sadd err:" + err);
		}
	});
}


async function redisAddTeam(r_client, message, def_team, off_team, version){
	//Add to sorted set chars_defense_team: chars_offense_team
	let off_str = off_team.unitsStr();
	let def_str = def_team.unitsStr();
	
	let redis_str = new RedisDefOffStr(def_team, off_team, version);
	let score_str = redis_str.toStr("", "score");
	
	r_client.zscore(def_str, off_str, async function(err, score){
		if(err){
			return;
		}
		
		if(score === null){ // Team doesn't exist
			// Add team to sorted set
			r_client.zadd(def_str, 100, off_str);
			
			// Add version data for team to string
			r_client.set(def_str + "-" + off_str, version, function(err, reply){
				console.log(`New team set: ${def_str}-${off_str}:${reply}`);
			});
			
			// Add score to version-defense-offense-score: [y or n]-user_tag
			r_client.sadd([score_str, "y-" + message.author.tag], function(err, reply) {
				if(err){
					console.log("Add team scoring sadd err:" + err);
				}
			}); // User tag added for scoring purposes
			
			// Add team to version data
			r_client.sadd([version, def_str + "-" + off_str], function(err, reply){
				if(err){
					console.log("Add team version sadd err:" + err);
				}
			});
			
			// Add to version-master set
			r_client.sadd([version+'-master', score_str], function(err, reply) {
				if(err){
					console.log("Add team version master sadd err:" + err);
				}
			});
		}else{ // Team does exist
			// TODO: A lot of this will be reused with team updooting, so will be switched to an updoot function
			score = parseFloat(score);
			const { promisify } = require('util');
			const getAsync = promisify(r_client.get).bind(r_client);
			const setMemAsync = promisify(r_client.sismember).bind(r_client);
			
			let team_vers = await getAsync(def_str + "-" + off_str);
			if(team_vers === version){ // Same version as known team
				let yes = setMemAsync(version + "-" + def_str + "-" + off_str + "-score", "y-" + message.author.tag);
				if(yes){
					return;
				}
				let no  = setMemAsync(version + "-" + def_str + "-" + off_str + "-score", "n-" + message.author.tag);
				let upd_score = 1000/score + 1;
				if(no){
					upd_score = (score-1)/2 + Math.sqrt(Math.pow(score,2) - 2*score - 3999);
					upd_score = 1000/upd_score + 1;
				}
				r_client.zincrby(def_str, upd_score, off_str);
			}else{ // Known team was an outdated version
				redisUpdateTeamVersion(r_client, message, score_str, def_str, off_str, team_vers, version, score, message.author.tag);
			}
		}
	});
}


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


// Display the results of the selected teams that beat the given team
function displayAttackResults(message, off_team){
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
async function battle(r_client, message, args){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);

	let version = await getAsync('cur_version');
	let def_team = await redisPullTeam(r_client, message, args);
	let team_str = def_team.unitsStr();

		// Examples:
		//Fengtorin#5328-2.5.0-Aoi_Suzume_Io_Illya_Shinobu-Aoi_Suzume_Io_Illya_Shinobu-comment"
		//zrevrangebyscore 2.5.0-Aoi_Suzume_Io_Illya_Shinobu-Aoi_Suzume_Io_Illya_Shinobu-tags 1000 0
		//"Fengtorin#5328"

	r_client.zrevrangebyscore(team_str, 1000, 0, "withscores", async function(err, results){
		if(err){
			return console.log("Error in battle defense team scores:" + err);
		}
		if(results === null || results.length === 0){ // No teams exist!
			submitTeam(r_client, message, version, def_team, "No teams exist to defeat that team. ");
		}else{ // Teams exist!
			const setsAsync = promisify(r_client.zrevrangebyscore).bind(r_client);
			let tot_cnt = results.length;					
			let off_teams = new Units.Off_Teams(def_team);
			let top_cnt = 2;
			
			for(let i = 0; i < tot_cnt && i < 2*top_cnt; i+=2){
				let team_version = await getAsync(team_str+"-"+results[i]);
				let redis_str = new RedisDefOffStr(team_str, results[i], team_version)
				let tag = await setsAsync(redis_str.toStr("", "tags"), 1000, 0);
				let comment = await getAsync(redis_str.toStr(tag[0],"comment"));
				off_teams.addTeam(results[i], results[i+1], team_version, comment);
			}
			
			if(tot_cnt > 2*top_cnt){
				let rand = Math.floor(((tot_cnt - 2*top_cnt)/2)*Math.random() + 2*top_cnt);
				off_teams.addTeam(results[rand], results[rand+1], await getAsync(team_str+"-"+results[rand]));
			}
			displayAttackResults(message, off_teams);
			submitTeam(r_client, message, version, def_team);
		}
	});
}



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




module.exports = { battle };
