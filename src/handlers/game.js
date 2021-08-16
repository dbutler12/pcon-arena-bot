const Units    = require('../units');
const redis_h  = require('./redis-methods');
const emoji_h  = require('../emojis');


async function generateRandomTeam(r_client, num){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	let char_id = await getAsync('cur_char_id');
	char_id = parseInt(char_id)-1;
	
	let id_arr = [];
	for(let i = 0; i < num; i++){
		id_arr[i] = Math.floor(Math.random()*char_id);
		for(let j = 0; j < i; j++){
			if(id_arr[i] == id_arr[j]){
				i--;
				break;
			}
		}
	}
	
	let team = await redis_h.idToTeam(r_client, id_arr);
	return team;
}


async function resolveFight(r_client, d_client, message){
	const { promisify } = require('util');
	const hashAsync = promisify(r_client.hgetall).bind(r_client);
	
	let tag   = message.author.tag;
	let teams = await hashAsync('ba_teams');
	let keys  = Object.keys(teams);
	
	let h_len = teams.length;
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
	let win_c = 1; // win condition
	
	if(rand >= rand2){
		win = 0;
		left = t_arr[1];
		right = t_arr[0];
	}
	left  = new Units.Team(left.split('_'), 5);
	right = new Units.Team(right.split('_'), 5);
	submitWin(r_client, d_client, message, left, right, keys[rand], win_c);
}


function submitWin(r_client, d_client, message, l_team, r_team, opp_tag, win_c){
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
			return (reaction.emoji.name === '1️⃣' || reaction.emoji.name === '2️⃣') && user.id === message.author.id;
		};

		const collector = message.createReactionCollector( filter, { max:1, time: 25000 });

		collector.on('collect', (reaction, user) => {
			console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
		});

		collector.on('end', collected => {
			console.log(`Collected ${collected.size} items`);
		});
	}

}


async function fight(r_client, d_client, message){
	let team = await generateRandomTeam(r_client,5);
	submitFight(r_client, d_client, message, team);
}



async function mfk(r_client, d_client, message){
	let team = await generateRandomTeam(r_client,3);
	submitMFK(r_client, d_client, message, team);
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

		if(raw_team.length === 5) {
			let userTeam = await redis_h.charsToTeam(r_client, message, raw_team);
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
				// Add to character set
				r_client.sadd(['ba_teams_' + tag, team.unitsStr() + "-" + userTeam.unitsStr()], function(err, reply) {
					if(err){
						console.log("ba_teams_" + tag +" err:" + err);
					}
				});
			}
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
			r_client.hincrby(`char_data_${team['char_' + raw_team[0]]['id']}`, 'wifed',  1);
			r_client.hincrby(`char_data_${team['char_' + raw_team[1]]['id']}`, 'dated',  1);
			r_client.hincrby(`char_data_${team['char_' + raw_team[2]]['id']}`, 'killed', 1);
			r_client.hincrby(`${tag}_wifed`, raw_team[0],1);
			r_client.hincrby(`${tag}_dated`, raw_team[1],1);
			r_client.hincrby(`${tag}_killed`,raw_team[2],1);
		}else{
			//TODO: Consider not having a return message here, or something more generic
			message.channel.send("Entered wrong units.");
		}
	});

	collector.on('end', collected => {
		//console.log(`End Collected ${collected.size} items.`);
	});
}


function printLove(d_client, obj, love_str){
	let count = 1;
	let len = Object.keys(obj).length;
	for(let o in obj){
		let chara = emoji_h.getEmojiString(d_client, o);
		love_str = love_str + `${chara}: **${obj[o]}**`;
		if(count != len && count%5 != 0) love_str = love_str + "     ";
		if(count%5 == 0) love_str = love_str + "\n";
		count = count + 1;
	}
	if((count-1)%5 != 0) love_str = love_str + "\n";
	return love_str;
}

async function love(r_client, d_client, message, usertag, choice = false){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.hgetall).bind(r_client);
	
	let wifed  = (choice == false || choice == 'wifed')  ? await getAsync(`${usertag}_wifed`)  : false;
	let dated  = (choice == false || choice == 'dated')  ? await getAsync(`${usertag}_dated`)  : false;
	let killed = (choice == false || choice == 'killed') ? await getAsync(`${usertag}_killed`) : false;
	
	let title = `**__${message.author.username}`;
	
	let count = 0;
	let len = Object.keys(wifed).length;
	if(choice === false || choice === 'wifed'){
		let m_str = title + " Wifed__**\n";
		m_str = printLove(d_client, wifed, m_str);
		await message.channel.send(m_str);
	}

	if(choice === false || choice === 'dated'){
		let m_str = title + " Dated__**\n";
		m_str = printLove(d_client, dated, m_str);
		await message.channel.send(m_str);
	}
	
	if(choice === false || choice === 'killed'){
		let m_str = title + " Killed__**\n";
		m_str = printLove(d_client, killed, m_str);
		await message.channel.send(m_str);
	}
}



/*
 * Original mfk submission function, saved for reference
 * TODO: Remove this comment and the code later
 *
 *
function submitMFK(r_client, d_client, message, team){
	let units_strs = team.unitsEmo(d_client);
	let user = m => m.author.id === message.author.id;
  message.channel.send(`Marry Date Kill:\n${units_strs[0]}\n${units_strs[1]}`).then(() => {
    message.channel.awaitMessages(user, {
        max: 1,
        time: 50000,
        errors: ['time']
      })
      .then(async function(message){
      	const PREFIX = global.prefix;
      	let raw_team = "";
      	message = message.first();
      	if(message.content.startsWith(PREFIX)){
		  		const raw_message = message.content
		  		.trim()
		  		.substring(PREFIX.length);
		  		
		  		raw_team = raw_message.split(/\s+/);
		  		
		  		if(raw_team[0] in global.commands) return; // End session
		  		
					for(let i in raw_team){
						raw_team[i] = await emoji_h.extractCharStr(raw_team[i]);
					}
				}else{
					return;
				}		
				
				let validate = await redis_h.charsToTeam(r_client, message, raw_team);

				if(raw_team.length === 3 && team.compareTeam(validate) === 3) {
					let name = message.author.username;
					let tag  = message.author.tag;
					let marry = emoji_h.getEmojiString(d_client,raw_team[0]);
					let date  = emoji_h.getEmojiString(d_client,raw_team[1]);
					let kill  = emoji_h.getEmojiString(d_client,raw_team[2]);
					
					message.channel.send(`${name} would marry ${marry} date ${date} and murder poor ${kill}`);
					r_client.hincrby(`char_data_${team['char_' + raw_team[0]]['id']}`, 'wifed',  1);
					r_client.hincrby(`char_data_${team['char_' + raw_team[1]]['id']}`, 'dated',  1);
					r_client.hincrby(`char_data_${team['char_' + raw_team[2]]['id']}`, 'killed', 1);
					r_client.hincrby(`${tag}_wifed`, raw_team[0],1);
					r_client.hincrby(`${tag}_dated`, raw_team[1],1);
					r_client.hincrby(`${tag}_killed`,raw_team[2],1);
				}else{
					//TODO: Consider not having a return message here, or something more generic
					message.channel.send("Entered wrong units.");
				}
      })
      .catch(collected => {
      	if(collected.length > 0){
		    	console.log("submitMFK Collected:");
		      console.log(collected);
		    }
      });
  })
}
*/

module.exports = { mfk, love, fight, resolveFight };
