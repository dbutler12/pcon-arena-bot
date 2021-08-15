const Units    = require('../units');
const redis_h  = require('./redis-methods');
const emoji_h  = require('../emojis');



async function mfk(r_client, d_client, message){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	let char_id = await getAsync('cur_char_id');
	char_id = parseInt(char_id)-1;
	
	let id_arr = [];
	id_arr[0] = Math.floor(Math.random()*char_id);
	id_arr[1] = Math.floor(Math.random()*char_id);
	id_arr[2] = Math.floor(Math.random()*char_id);
	
	let lockout = 0;
	while((id_arr[0] === id_arr[1] || id_arr[0] === id_arr[2] || id_arr[1] === id_arr[2]) && lockout < 10){
		id_arr[0] = Math.floor(Math.random()*char_id);
		id_arr[1] = Math.floor(Math.random()*char_id);
		id_arr[2] = Math.floor(Math.random()*char_id);
		lockout++;
	}
	
	if(lockout > 9) return message.channel.send("Failed to randomize.");
	
	let team = await redis_h.idToTeam(r_client, id_arr);
	submitMFK(r_client, d_client, message, team);
}


function submitMFK(r_client, d_client, message, team){
	let units_strs = team.unitsEmo(d_client);
  message.channel.send(`Marry Date Kill:\n${units_strs[0]}\n${units_strs[1]}`);
  
	const filter = response => {
		return response.author.id === message.author.id && response.content.charAt(0) === '!';
		// return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
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

async function love(r_client, d_client, message, usertag, args){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.hgetall).bind(r_client);
	
	let wifed  = await getAsync(`${usertag}_wifed`);
	let dated  = await getAsync(`${usertag}_dated`);
	let killed = await getAsync(`${usertag}_killed`);
	
	let m_str = `**${message.author.username}**`;
	
	let count = 0;
	let len = Object.keys(wifed).length;
	m_str = m_str + "\n**__Wifed__**\n";
	m_str = printLove(d_client, wifed, m_str);
	
	m_str = m_str +"\n**__Dated__**\n";
	m_str = printLove(d_client, dated, m_str);

	m_str = m_str + "\n**__Killed__**:\n";
	m_str = printLove(d_client, killed, m_str);

	message.channel.send(m_str);
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

module.exports = { mfk, love };
