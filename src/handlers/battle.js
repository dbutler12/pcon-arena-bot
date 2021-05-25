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


function A_Teams(version){
	this.version = version;
	this.num = 0;
	
	this.addTeam = function(team, y_n){
		this[num] = team;
		this[team] = y_n;
		this.num++;
	}
	
	this.getVal = function(value, on){
		if(on === 'ratio'){
			return parseInt(value[0])/parseInt(value[2]);
		}else if(on === 'y'){
			return parseInt(value[0]);
		}
	}
	
	// example properties
	// this[0] = Jun_Miyako_Kuka_Ilya_Hiyori
	// this["Jun_Miyako_Kuka_Ilya_Hiyori"] = 5_12
	
	this.filt_str = function(on){
		if(this.num == 1){
			let y_n = this[this[0]].split("_");
			let team = this[0].split("_");
			return ":" + team.join("::") + ":  " + "YES:" + y_n[0] + " NO:" + y_n[1];
		}else{
			let arr = [];
			let value = this.getVal(this[this[0]],on);
	 		arr[0] = { team:this[0], val:value };
	 		for(let i = 1; i < this.num; i++){
	 			let cur_val = this.getVal(this[this[i]],on);
				let cur = { team:this[i], val:cur_val };
				
				for(let j = i - 1; j >= 0; j--){
					if(arr[j].val < cur.val){
						arr[j + 1] = arr[j];
						if(j === 0){
							arr[j] = cur;
						}
					}else{
						arr[j + 1] = cur;
						break;
					}
				}
			}
		}
		let str = "";
		for(let i = 0; i < this.num; i++){
			let team = arr[i].team.split("_");
			let y_n = this[arr[i].team];
			str = str + ":" + team.join("::") + ":  " + "YES:" + y_n[0] + " NO:" + y_n[1] + "\n";
		}
		return str;
	}
}


function submitFirstTeam(r_client, message, nick, d_team, version){
	let user = m => m.author.id === message.author.id
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

// Add support to get a count for results
// Add support to view all
// Add support to view only unpopular results
function battle(r_client, message, args){
	let tot_cnt = 10;
	r_client.hgetall('char_nick', function(err, nick) {
		let id_arr = [];
		for(let i = 0; i < args.length; i++){
			let char_str = args[i].charAt(0).toUpperCase() + args[i].substr(1).toLowerCase();
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
		get('version').
		exec(function(err,results){
			let version = results[results.length - 1];
			let team = new Team(results, results.length - 1);
			if(team.num === -1) return message.channel.send("Invalid team: can't have duplicate characters.");
		
			r_client.hgetall(team.units_str(), function(err, results){
				if(results === null){ // No teams exist!
					submitFirstTeam(r_client, message, nick, team, version);
				}else{ // Teams exist!
					let cur_ver = new A_Team(version);
					
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
