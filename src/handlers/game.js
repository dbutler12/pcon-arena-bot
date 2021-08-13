const Units  = require('../units');
const redis_h  = require('./redis-methods');

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

function printLove(obj, love_str){
	let count = 1;
	let len = Object.keys(obj).length;
	for(let o in obj){
		love_str = love_str + `${o}:${obj[o]}`;
		if(count != len && count%5 != 0) love_str = love_str + "  ";
		if(count%5 == 0) love_str = love_str + "\n";
		count = count + 1;
	}
	return love_str;
}

async function love(r_client, message, usertag, args){
	const { promisify } = require('util');
	const getAsync = promisify(r_client.hgetall).bind(r_client);
	
	let wifed  = await getAsync(`${usertag}_wifed`);
	let dated  = await getAsync(`${usertag}_dated`);
	let killed = await getAsync(`${usertag}_killed`);
	
	let m_str = message.author.username;
	
	let count = 0;
	let len = Object.keys(wifed).length;
	m_str = m_str + "\nWifed:\n";
	m_str = printLove(wifed, m_str);
	
	m_str = m_str +"\nDated:\n";
	m_str = printLove(dated, m_str);

	m_str = m_str + "\nKilled:\n";
	m_str = printLove(killed, m_str);
	
	console.log(m_str);
	message.channel.send(m_str);
}


function submitMFK(r_client, d_client, message, team){
	let user = m => m.author.id === message.author.id;
  message.channel.send(`Marry Date Kill:\n${team.unitsEmo(d_client)}`).then(() => {
    message.channel.awaitMessages(user, {
        max: 1,
        time: 50000,
        errors: ['time']
      })
      .then(async function(message){
      	const PREFIX = "!";
      	let raw_team = "";
      	message = message.first();
      	if(message.content.startsWith(PREFIX)){
		  		const raw_message = message.content
		  		.trim()
		  		.substring(PREFIX.length)
		  		
		  		raw_team = raw_message.split(/\s+/);

				}else{
					return;
				}		
				
				let validate = await redis_h.charsToTeam(r_client, message, raw_team);

				if(raw_team.length === 3 && team.compareTeam(validate) === 3) {
					let name = message.author.username;
					let tag  = message.author.tag;
					let marry = d_client.emojis.cache.find(emoji => emoji.name === raw_team[0]);
					let date  = d_client.emojis.cache.find(emoji => emoji.name === raw_team[1]);
					let kill  = d_client.emojis.cache.find(emoji => emoji.name === raw_team[2]);
					console.log(marry);
					console.log(date);
					console.log(kill):
					message.channel.send(`${name} would marry :${marry}:  date :${date}:  and murder poor :${kill}:`);
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


module.exports = { mfk, love };
