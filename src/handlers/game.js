const Units    = require('../units');
const redis_h  = require('./redis-methods');
const emoji_h  = require('../emojis');
const meta_h   = require('./meta');


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


// Arena game begin
async function resolveFight(r_client, d_client, message){
	const { promisify } = require('util');
	const hashAsync = promisify(r_client.hgetall).bind(r_client);
	
	let tag   = message.author.tag;
	let teams = await hashAsync('ba_teams');
	let keys  = Object.keys(teams);
	
	let h_len = keys.length;
	if(h_len === 1) return message.channel.send("No teams exist to resolve.");
	
	let rand  = Math.floor(Math.random()*(h_len-1));
	let rand2 = Math.floor(Math.random()*(h_len-1));
	if(rand == rand2){
		if(rand2 == h_len-1){ rand2-- }
		else{ rand2++ }
	}
	
	if(keys[rand] == tag) rand = rand2;
	
	let t_arr = teams[keys[rand]].split('-');
	let left  = t_arr[0];
	let right = t_arr[1];
	let win_c = 2; // win condition
	
	if(rand >= rand2){
		win_c = 1;
		left = t_arr[1];
		right = t_arr[0];
	}

	submitWin(r_client, d_client, message, left, right, keys[rand], win_c);
}


async function submitWin(r_client, d_client, message, left, right, opp_tag, win_c){
	let l_team = await redis_h.charsToTeam(r_client, message, left.split('_'));
	let r_team = await redis_h.charsToTeam(r_client, message, right.split('_'));
	let l_strs = l_team.unitsEmo(d_client);
	let r_strs = r_team.unitsEmo(d_client);
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
			let react = reaction.emoji.name;
			// Submitted response wins
			if((react == '1️⃣' && win_c == 1) || (react == '2️⃣' && win_c == 2)){
				message.channel.send(`${opp_tag} wins!`);
				meta_h.addExp(r_client, opp_tag, 5);
			}else{ // Submitted response loses
				message.channel.send(`${user.tag} wins!`);
			}
			let win  = left;
			let lose = right;
			if(react == '2️⃣'){
				win  = right;
				lose = left;
			}
			
			r_client.zincrby('winning_teams', 1, win);
			r_client.zincrby('winning_teams', -1, lose);
			
			meta_h.addExp(r_client, message.author.tag, 10, message.author.username);
			
			r_client.spop('ba_teams_' + opp_tag, function(err, result){
				if(result == undefined || result == null){
					r_client.hdel('ba_teams', opp_tag);
					console.log("Removed ba_teams: " + opp_tag);
				}else{
					let obj = {};
					obj[opp_tag] = result;
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


function submitFight(r_client, d_client, message, team){
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
			meta_h.addExp(r_client, message.author.tag, 10, message.author.username);
		}else{
			message.channel.send("Invalid number of units.");
		}
	});

	collector.on('end', collected => {
		//console.log(`End Collected ${collected.size} items.`);
	});
}


function submitMFK(r_client, d_client, message, team){
	let units_strs = team.unitsEmo(d_client);
  message.channel.send(`Marry Date Kill:\n${units_strs[0]}\n${units_strs[1]}`);
  
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
			meta_h.addExp(r_client, message.author.tag, 5, message.author.username);
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


module.exports = { mfk, love, fight, resolveFight };
