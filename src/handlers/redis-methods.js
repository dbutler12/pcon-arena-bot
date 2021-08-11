const Units  = require('../units');

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
async function charsToTeam(r_client, message, chars){
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


async function idToTeam(r_client, id_arr){
		const { promisify } = require('util');
		const hashAsync = promisify(r_client.hgetall).bind(r_client);
		
		let results = [];
		for(let i = 0; i < id_arr.length; i++){
			results.push(await hashAsync(`char_data_${id_arr[i]}`));
		}
		
		return new Units.Team(results, results.length);
}

module.exports = { createIDArray, charsToTeam, idToTeam };