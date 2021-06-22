function Unit(name, position){
	this.name = name;
	this.position = position;
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
		let unit = new Unit(data[0]['name'], data[0]['position']);
		if(!this.check(unit)){
			//TODO: modify this, because don't always need to know when team can't be made
			return console.log(`Cannot make team. Unit ${data[0]['name']} already in previous team.`);
		}
		this.units[0] = unit;
		this[unit['name']] = true;
		
		for(let i = 1; i < this.num; i++){
			let cur = new Unit(data[i]['name'], data[i]['position']);
			if(!this.check(cur)){
				return console.log(`Cannot make team. Unit ${cur['name']} already in previous team.`);
			}
			for(let j = i - 1; j >= 0; j--){
				if(this.units[j]['position'] < cur['position']){
					this.units[j+1] = this.units[j];
					if(j === 0){
						this.units[j] = cur;
						this[cur['name']] = true;
					}
				}else if(this.units[j]['position'] < cur['position']){ // Invalid team
					this.num = -1
					return;
				}else{
					this.units[j + 1] = cur;
					this[cur['name']] = true;
					break;
				}
			}
		}
	}
	
	this.unitsStr = function(){
		return this.units.map(u => u.name).join('_');
	}
	
	this.init();
}



// List of offensive teams
function Off_Teams(a_team){
	this.against = a_team; // This is the team that the offense is built against
	this.num = 0;
	
	this.addTeam = function(team, score, version){
		this[this.num] = {team: team, score: score, version: version};
		this.num++;
	}
	
	this.getVal = function(num){
		return this[this[num]];
	}
	
	// example properties
	// this[0] = Jun_Miyako_Kuka_Ilya_Hiyori
	// this["Jun_Miyako_Kuka_Ilya_Hiyori"] = 512
	
	this.teamStr = function(num){
		let data = this[num];
		let team = data.team.split("_");
		return ":" + team.join("::") + ":  " + "Score:" + data.score + " V" + data.version;
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
