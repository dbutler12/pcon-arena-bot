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
	
	this.units_str = function(){
		return this.units.map(u => u.name).join('_');
	}
	
	this.init();
}



// List of offensive teams
function Off_Teams(version){
	this.version = version;
	this.num = 0;
	
	this.addTeam = function(team, y_n){
		this[this.num] = team;
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


module.exports = { Unit: Unit, Team: Team, Off_Teams: Off_Teams };
