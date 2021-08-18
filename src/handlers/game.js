const Units    = require('../units');
const redis_h  = require('./redis-methods');
const emoji_h  = require('../emojis');
const meta_h   = require('./meta');


function challenge(r_client, d_client, message, args){
	if(args[0] == message.author.tag) return message.channel.send("No challenging yourself!");
	if(args.length < 6) return message.channel.send("Challenge example: !challenge Deben Jun Kuka Tamaki Misato Maho");
	let challenged = args[0];
	args.shift();
	args = redis_h.getTeamFromRaw(args);
	let team = redis_h.charsToTeam(r_client, message, args);
	if(team.num == 0) return message.channel.send("Challenge example: !challenge Deben Jun Kuka Tamaki Misato Maho");
	message.channel.guild.members.fetch({cache : false}).then(members=>{
		let check = challenged.split('#');
		let m;
		if(check.length == 1) m = members.find(member=>member.nickname === challenged);
		if(check.length == 2) m = members.find(member=>member.user.tag === challenged);
		if(m != undefined && m != null){
			let tags = m.user.tag + "_" + message.author.tag;
			let obj = {};
			obj[tags] = team.unitsStr();
			r_client.hmset('challenges', obj);
		}
	});
}


async function submitVSFight(r_client, d_client, message, challenged, challenger){
	const { promisify } = require('util');
	const hashAsync = promisify(r_client.hmget).bind(r_client);
	
	let tags = challenged+"_"+challenger;
	
	let c_team = hashAsync('challenges', tags);
	if(c_team == undefined || c_team == null) return message.channel.send("Challenge between " + challenger + " and " + challenged + " does not exist.");
	let completed = submitFight(r_client, d_client, message, c_team, challenger);
	if(completed == true){
		r_client.hdel('challenges', tags);
	}
}

// I am the challenged, accepting the fight from the challenger
function accept(r_client, d_client, message, args){
	if(args[0] == message.author.tag) return message.channel.send("No challenging yourself!");
	//if(args.length < 6) return message.channel.send("Challenge example: !challenge Deben Jun Kuka Tamaki Misato Maho");
	let challenger = args[0];
	//args.shift();
	//args = redis_h.getTeamFromRaw(args);
	//let team = redis_h.charsToTeam(r_client, message, args);
	//if(team.num == 0 || team.num < 5) return message.channel.send("Accept example: !accept Deben Jun Kuka Tamaki Misato Maho");
	message.channel.guild.members.fetch({cache : false}).then(members=>{
		let check = challenger.split('#');
		let m;
		if(check.length == 1) m = members.find(member=>member.nickname === challenger);
		if(check.length == 2) m = members.find(member=>member.user.tag === challenger);
		if(m != undefined && m != null){
			submitVSFight(r_client, d_client, message, message.author.tag, m.user.tag);
		}
	});
	//
}


// Fight game begin
async function fight(r_client, d_client, message){
	let team = await redis_h.generateRandomTeam(r_client,5);
	submitFight(r_client, d_client, message, team);
}


// Marry Date Kill game begin
async function mfk(r_client, d_client, message){
	let team = await redis_h.generateRandomTeam(r_client,3);
	submitMFK(r_client, d_client, message, team);
}


function generateRand(upTo, val1 = false, val2 = false){
	if((!val1 && !val2) || upTo == 1) return Math.floor(Math.random()*upTo);
	let count = 0;
	let val = Math.floor(Math.random()*upTo);
	
	while((val == val1 || val == val2) && count < 25) {
		val = Math.floor(Math.random()*upTo);
		count++;
	}
	return val;
}

function getPeopleKey(keys, tag, rand){
	let key = keys[rand];
	let people = key.split('_');
	if(people[0] == tag || (people.length == 2 && people[1] == tag)){
		key = false;
		let temp_key;
		for(let i = 0; i < keys.length; i++){
			temp_key = keys[i];
			people = temp_key.split('_');
			if(people[0] != tag){
				if(people.length == 2 && people[1] == tag) continue;
				key = temp_key;
				break;
			}
		}
	}
	return key;
}

// Arena game begin
async function resolveFight(r_client, d_client, message){
	const { promisify } = require('util');
	const hashAsync = promisify(r_client.hgetall).bind(r_client);
	
	let tag   = message.author.tag;
	let teams = await hashAsync('ba_teams');
	let keys  = Object.keys(teams);
	
	let h_len = keys.length;
	if(h_len === 1) return message.channel.send("No teams exist to resolve.");
	
	let rand  = generateRand((h_len-1));
	let rand2 = generateRand((h_len-1),rand);
	
	let key = getPeopleKey(keys, tag, rand);
	if(!key) return message.channel.send("No teams exist to resolve.");
	
	let people = key.split('_');
	
	let t_arr = teams[key].split('-');
	let left  = t_arr[0];
	let right = t_arr[1];

	let right_person = people[0];
	let left_person = (people.length == 2) ? people[1] : 'Io-Bot';
	
	if(rand >= rand2){
		left = t_arr[1];
		right = t_arr[0];
		let temp = right_person;
		right_person = left_person;
		left_person = temp;
	}

	submitWin(r_client, d_client, message, left, right, key, left_person, right_person);
}


async function submitWin(r_client, d_client, message, left, right, key, l_per, r_per){
	let l_team = await redis_h.charsToTeam(r_client, message, left.split('_'));
	let r_team = await redis_h.charsToTeam(r_client, message, right.split('_'));
	let l_strs = l_team.unitsEmo(d_client);
	let r_strs = r_team.unitsEmo(d_client, true);
	//1️⃣2️⃣
	message.channel.send('Which team wins?\n' +
	`1️⃣ ${l_strs[0]}  **__VS__**  ${r_strs[0]} 2️⃣\n` +
	`(${l_strs[1]})  **__VS__**  (${r_strs[1]})\n`).then((question) => {
    // Have our bot guide the user by reacting with the correct reactions
    question.react('1️⃣');
    question.react('2️⃣');
		
		const filter = (reaction, user) => {
			return ((reaction.emoji.name === '1️⃣' || reaction.emoji.name === '2️⃣') && user.id === message.author.id);
		};

		const collector = question.createReactionCollector( filter, { max:1, time: 25000 });

		collector.on('collect', (reaction, user) => {
			let win;
			let lose;
			let react = reaction.emoji.name;
			// Submitted response wins
			if(react == '1️⃣'){
				message.channel.send(`${l_per} wins over ${r_per}!`);
				if(l_per != 'Io-Bot') meta_h.addExp(r_client, message, l_per, 5);
				win = left;
				lose = right;
			}else if(react == '2️⃣'){
				message.channel.send(`${r_per} wins over ${l_per}!`);
				if(r_per != 'Io-Bot') meta_h.addExp(r_client, message, r_per, 5);
				win = right;
				lose = left;
			}

			teamWinLose(r_client, win, lose);
			
			meta_h.addExp(r_client, message, message.author.tag, 10, message.author.username);
			
			r_client.spop('ba_teams_' + key, function(err, result){
				if(result == undefined || result == null){
					r_client.hdel('ba_teams', key);
					console.log("Removed ba_teams: " + key);
				}else{
					let obj = {};
					obj[key] = result;
					r_client.hmset('ba_teams', obj);
					console.log("Added " + result + " to ba_teams");
				}
			});
		});

		collector.on('end', collected => {
			console.log(`Collected ${collected.size} items`);
		});
	});

}


function submitFight(r_client, d_client, message, team, challenger = false){
	let completed = false;
	let units_strs = team.unitsEmo(d_client);
	message.channel.send(`Create a team that beats this:\n${units_strs[0]}\n${units_strs[1]}`);

	const filter = response => {
		return response.author.id === message.author.id && response.content.charAt(0) === '!';
	};
	
	const collector = message.channel.createMessageCollector(filter, { max: 1, time: 50000, errors: ['time'] });
	collector.on('collect', async m => {
    let raw_team = "";
    
		const raw_message = m.content
		.trim()
		.substring(global.prefix.length);
		
		raw_team = raw_message.split(/\s+/);
		
		if(raw_team[0] in global.commands) return; // End session
		
		for(let i in raw_team){
			raw_team[i] = await emoji_h.extractCharStr(raw_team[i]);
		}

		let userTeam = await redis_h.charsToTeam(r_client, message, raw_team);
		if(userTeam.num == 5) {
			const { promisify } = require('util');
			const existsAsync = promisify(r_client.hexists).bind(r_client);
			let name = message.author.username;
			let tag  = message.author.tag;
			if(challenger != false) tag = tag + "_" + challenger;
			let tag_exists = await existsAsync('ba_teams', tag);
			if(tag_exists != 1){
				// Insert directly into tag
				let team_obj = {};
				team_obj[tag] = team.unitsStr() + "-" + userTeam.unitsStr();
				r_client.hmset('ba_teams', team_obj);
			}else{
				// Add to set: ba_teams_${tag}
				r_client.sadd(['ba_teams_' + tag, team.unitsStr() + "-" + userTeam.unitsStr()], function(err, reply) {
					if(err){
						console.log("ba_teams_" + tag +" err:" + err);
					}
				});
			}
			let user_units_strs = userTeam.unitsEmo(d_client);
			message.channel.send(`Team ${user_units_strs[0]} submitted!`);
			meta_h.addExp(r_client, message, message.author.tag, 10, message.author.username);
			completed = true;
		}else{
			message.channel.send("Invalid number of units.");
		}
	});

	collector.on('end', collected => {
		//console.log(`End Collected ${collected.size} items.`);
	});
	return completed;
}


function submitMFK(r_client, d_client, message, team){
	let units_strs = team.unitsEmo(d_client);
  message.channel.send(`Marry Date Kill?\n${units_strs[0]}\n${units_strs[1]}`);
  
	const filter = response => {
		return response.author.id === message.author.id && response.content.charAt(0) === '!';
	};
	const collector = message.channel.createMessageCollector(filter, { max: 1, time: 50000, errors: ['time'] });

	collector.on('collect', async m => {
    let raw_team = "";
    
		const raw_message = m.content
		.trim()
		.substring(global.prefix.length);
		
		raw_team = raw_message.split(/\s+/);
		
		if(raw_team[0] in global.commands) return; // End session
		
		for(let i in raw_team){
			raw_team[i] = await emoji_h.extractCharStr(raw_team[i]);
		}
		
		let validate = await redis_h.charsToTeam(r_client, message, raw_team);

		if(raw_team.length === 3 && team.compareTeam(validate) === 3) {
			let name = message.author.username;
			let tag  = message.author.tag;
			let marry = emoji_h.getEmojiString(d_client,raw_team[0]);
			let date  = emoji_h.getEmojiString(d_client,raw_team[1]);
			let kill  = emoji_h.getEmojiString(d_client,raw_team[2]);
			
			message.channel.send(`${name} would marry ${marry} date ${date} and murder poor ${kill}`);
			r_client.zincrby(`love_${tag}`, 3,  raw_team[0]);
			r_client.zincrby(`love_${tag}`, 1,  raw_team[1]);
			r_client.zincrby(`love_${tag}`, -4, raw_team[2]);
			r_client.hincrby(`char_data_${team['char_' + raw_team[0]]['id']}`, 'wifed',  1);
			r_client.hincrby(`char_data_${team['char_' + raw_team[1]]['id']}`, 'dated',  1);
			r_client.hincrby(`char_data_${team['char_' + raw_team[2]]['id']}`, 'killed', 1);
			meta_h.addExp(r_client, message, message.author.tag, 5, message.author.username);
		}else{
			//TODO: Consider not having a return message here, or something more generic
			message.channel.send("Entered wrong units.");
		}
	});

	collector.on('end', collected => {
		//console.log(`End Collected ${collected.size} items.`);
	});
}


function printLove(d_client, arr, love_str){
	let len = arr.length;
	let count = 0;
	let spacing = "     ";
	let space = spacing;
	for(let i = 0; i < len; i++){
		if(i%2 == 0){
			let chara = emoji_h.getEmojiString(d_client, arr[i]);
			love_str = love_str + `${chara}: **${arr[i+1]}**`
			space = spacing.slice(arr[i+1].length);
			count++;
		}
		if(count%5 != 1) love_str = love_str + space;
		if(count%5 == 1) love_str = love_str + "\n";
	}
	if((count-1)%5 != 1) love_str = love_str + "\n";
	return love_str;
}

async function love(r_client, d_client, message, usertag, choice = false){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.zrevrange).bind(r_client);
	
	let m_str = `**__${message.author.username} Love Points__**\n`;
	let loves = await getAsync(`love_${usertag}`, 0, -1, "withscores");
	m_str = printLove(d_client, loves, m_str);
	message.channel.send(m_str);
}


//TODO: Move this function if it becomes useful outside of this file scope
async function teamWinLose(r_client, win, lose){
	r_client.zincrby('winning_teams', 1, win);
	
	const { promisify } = require('util');
	const getScore = promisify(r_client.zscore).bind(r_client);
	let lose_score = await getScore(`winning_teams`, lose);
	if(lose_score != null && lose_score > 0) r_client.zincrby('winning_teams', -1, lose);
}

module.exports = { accept, challenge, fight, love, mfk, resolveFight };
