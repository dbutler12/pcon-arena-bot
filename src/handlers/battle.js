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


function submitFirstTeam(r_client, message, nick, d_team){
	let user = m => m.author.id === message.author.id
  message.channel.send(`No teams exist to defeat that team. Submit 5 units to add a new team.`).then(() => {
    message.channel.awaitMessages(user, {
        max: 1,
        time: 25000,
        errors: ['time']
      })
      .then(message => {
      	message = message.first();
      	const raw_team = message.content.trim().split(/\s+/);
				
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
					get(`version`).
					exec(function(err,results){
						let version = results['version'];
						delete results['version'];
						let a_team = new Team(results, results.length);
						if(a_team.num === -1) return message.channel.send("Invalid team: can't have duplicate characters.");
						let entry = a_team.units_str();
						let version_entry = version + "_" + entry;
						let team_obj = { entry:version , version_entry:"1_0" };
						r_client.hmset(d_team.unit_str(), team_obj);
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


function battle(r_client, message, args){
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
		exec(function(err,results){
			let team = new Team(results, results.length);
			if(team.num === -1) return message.channel.send("Invalid team: can't have duplicate characters.");
			// message.channel.send(team.units_str());
		
			r_client.hgetall(team.units_str(), function(err, results){
				if(results === null){ // No teams exist!
					submitFirstTeam(r_client, message, nick, team);
				}else{
					let str = "";
					for(const r in results){
						str = str + r + " " + results[r];
					}
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
