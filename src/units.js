function Unit(name, position, id = -1){
	this.name = name;
	this.position = position;
	this.id = id;
}


function Team(data, num, team2 = null, team3 = null){
	this.num = num;
	this.units = [];
	
	this.check = function(unit) {
		if(team2 !== null){
			if(team2[unit['name']] === true) return false;
		}
		
		if(team3 !== null){
			if(team3[unit['name']] === true) return false;
		}
		
		return true;
	}
	
	this.init = function() {
		if(num === 0) return;
		let unit = new Unit(data[0]['name'], data[0]['position'], data[0]['id']);
		if(!this.check(unit)){
			//TODO: modify this, because don't always need to know when team can't be made
			return console.log(`Cannot make team. Unit ${data[0]['name']} already in previous team.`);
		}
		this.units[0] = unit;
		this['char_' + unit['name']] = unit;
		this[unit['name']] = true;
		
		for(let i = 1; i < this.num; i++){
			let cur = new Unit(data[i]['name'], data[i]['position'], data[i]['id']);
			if(!this.check(cur)){
				return console.log(`Cannot make team. Unit ${cur['name']} already in previous team.`);
			}
			for(let j = i - 1; j >= 0; j--){
				if(this.units[j]['position'] < cur['position']){
					this.units[j+1] = this.units[j];
					if(j === 0){
						this.units[j] = cur;
						this['char_' + cur['name']] = cur;
						this[cur['name']] = cur;
					}
				}else if(this.units[j]['position'] < cur['position']){ // Invalid team
					this.num = -1
					return;
				}else{
					this.units[j + 1] = cur;
					this['char_' + cur['name']] = cur;
					this[cur['name']] = true;
					break;
				}
			}
		}
	}
	
	this.unitsStr = function(){
		return this.units.map(u => u.name).join('_');
	}
	
	this.unitsEmo = function(d_client){
		let str = "";
		for(let u in this.units){
			const emo = d_client.emojis.cache.find(emoji => emoji.name === this.units[u].name);
			str = str + emo + " ";
		}
		return str;
	}
	
	this.compareTeam = function(team){
		let count = 0;
		for(let un in team.units){
			if(this[team.units[un].name]) count = count + 1;
		}
		return count;
	}
	
	this.init();
}



// List of offensive teams
function Off_Teams(a_team){
	this.against = a_team; // This is the team that the offense is built against
	this.num = 0;
	
	this.addTeam = function(team, score, version, comment = ""){
		if(comment === null) comment = "";
		this[this.num] = {team: team, score: score, version: version, comment: comment};
		this.num++;
	}
	
	this.getDefStr = function(){
		return this.against.unitsStr();
	}
	
	this.getTeam = function(num){
		return this[num].team.unitsStr();
	}
	
	this.getScore = function(num){
		return this[num].score;
	}
	
	this.getVersion = function(num){
		return this[num].version;
	}
	
	this.getComment = function(num){
		return this[num].comment;
	}
	
	// example properties
	// this[0] = Jun_Miyako_Kuka_Ilya_Hiyori
	// this["Jun_Miyako_Kuka_Ilya_Hiyori"] = 512
	
	this.teamStr = function(num){
		let data = this[num];
		let team = data.team.split("_");
		let main = ":" + team.join(": :") + ":  " + "Score:" + data.score + " V" + data.version;
		let comm = data.comment;
		if(comm !== ""){
			main = main + "\n" + comm;
		}
		return main;
	}
	
	this.filtStr = function(){
		if(this.num == 1){
			return [this.teamStr(0)];
		}else{
			let arr = [];
	 		for(let i = 0; i < this.num; i++){
	 			arr[i] = this.teamStr(i);
	 		}
	 		return arr;
	 	}
	}
}


module.exports = { Unit: Unit, Team: Team, Off_Teams: Off_Teams };
