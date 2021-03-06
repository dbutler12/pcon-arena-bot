const emoji_h = require('../emojis');

// y = 25*x*(1+x) where y = exp needed and x = level
// inverse: y = -1/2 + 1/10 * sqrt(4x+25) where x = exp and y = level
async function addExp(r_client, message, tag, amount, user = false){
	const { promisify } = require('util');
	const getScore = promisify(r_client.zscore).bind(r_client);
	let exp1 = await getScore(`user_exp`, tag);
	await r_client.zincrby(`user_exp`, amount,  tag);
	let exp2 = await getScore(`user_exp`, tag);
	
	let username = (user == false) ? tag : user;
	let level = checkLevel(exp2);
	if(checkLevel(exp1) != level){
		message.channel.send(`**${username} has reached level ${level}!**`); 
		if(level == 0) message.channel.send(`Welcome to Io-Bot. Enjoy playing with the girls!`);
	}
}


function checkLevel(score){
	return Math.floor((-1.0/2.0 + 1.0/10.0*Math.sqrt(4.0*parseFloat(score) + 25.0)));
}


async function checkMyLevel(r_client, message){
	const { promisify } = require('util');
	const getScore = promisify(r_client.zscore).bind(r_client);
	let tag   = message.author.tag;
	let user  = message.author.username;
	let exp   = await getScore(`user_exp`, tag);
	let level = checkLevel(exp);
	let next  = 25.0*(level+1.0)*(1.0+(level+1.0)) - exp;
	message.channel.send(`**${user} is level ${level}**\n(${next} from level ${level+1})`); 
}


function updateVer(r_client, version){
	r_client.multi().
	get('cur_version').
	get('prev_version').
	get('dead_version').
	exec(function(err, results) {
		if(results[0] === null){
			r_client.set('cur_version', version, function(err, reply){
				console.log(`Current version set: ${reply}`);
			});
		}else if(results[1] === null){
			r_client.set('cur_version', version, function(err, reply){
				console.log(`Current version set: ${reply}`);
			});
			r_client.set('prev_version', results[0], function(err, reply){
				console.log(`Prev version set: ${reply}`);
			});
		}else{
			//TODO: Add dead version cleanup here (results[2]) if it's not null
			r_client.set('cur_version', version, function(err, reply){
				console.log(`Current version set: ${reply}`);
			});
			r_client.set('prev_version', results[0], function(err, reply){
				console.log(`Prev version set: ${reply}`);
			});
			r_client.set('dead_version', results[1], function(err, reply){
				console.log(`Dead version set: ${reply}`);
			});
		}
	});
}


function getVer(r_client, message, level = 'cur_'){
	r_client.get(level+'version', function(err, reply){
		message.channel.send(`Princess Connect Version: ${reply}`);
	});
}


function addNick(r_client, message, c_name, n_name){
	r_client.hgetall('char_nick', function(err, nick) {
		let char_str = c_name.charAt(0).toUpperCase() + c_name.substr(1).toLowerCase();
		if(!(char_str in nick)){
			message.channel.send(`Char ${char_str} unknown.`);
			return;
		}
		
		let id = nick[char_str];
		let nick_obj = {};
		nick_obj[n_name] = id;
		r_client.hmset('char_nick', nick_obj);
	});
}


async function updateAllChars(r_client, add_obj = false, del_arr = false){
	//Promisify redis, since it doesn't directly support promises			
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);

	let max_id = await getAsync('cur_char_id');
	for(let id = 0; id < max_id; id++){
		add_obj['id'] = id;
		if(add_obj !== false) r_client.hmset(`char_data_${id}`, add_obj);
		if(del_arr !== false) {
			for(let i in del_arr){
				r_client.hdel(`char_data_${id}`, del_arr[i]);
			}
		}
	}
}


function addChar(r_client, c_name, position){
	//Promisify redis, since it doesn't directly support promises			
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	
	(async function() {
		let char_id = await getAsync('cur_char_id');
		return char_id;
	})().then(id => {
		let char_obj = {
			name:c_name,
			position:position,
			pvp_rec:"0-0",
			cb_rec:"0-0",
			wifed:0,
			dated:0,
			killed:0
		};
		let nick_obj = {};
		nick_obj[c_name] = id;
		char_obj['id'] = id;
		r_client.hmset(`char_data_${id}`, char_obj);
		r_client.hmset('char_nick', nick_obj);
		r_client.incr('cur_char_id');
	});
}


function updateChar(r_client, message, args){
	r_client.hgetall('char_nick', function(err, nick) {
		let char_str = args[0].charAt(0).toUpperCase() + args[0].substr(1).toLowerCase();
		if(!(char_str in nick)){
			message.channel.send(`Char ${char_str} unknown.`);
			return;
		}
		
		let id = nick[char_str];
		let char_obj = {};
		let mod_flag = false;
		
		for(let i = 1; i < args.length; i++){
				if(i%2 === 0){
					if(args[i] === "DEL"){
						r_client.hdel(`char_data_${id}`, args[i-1], function(err, suc){
							if(err){
								console.log(err);
								return;
							}
							message.channel.send(`Deleted ${args[i-1]} from ${args[0]}'s data.`);
						});
						continue;
					}
					char_obj[args[i-1]] = args[i];
					mod_flag = true;
				}else if(i === args.length - 1){ // Dangling end
					message.channel.send(`Missing value to change to for ${args[i]}`);
				}
		}
		
		if(mod_flag){
			r_client.hmset(`char_data_${id}`, char_obj);
			message.channel.send(`Character data modified for ${args[0]}`);
		}
	});
}


function viewChar(r_client, d_client, message, args){
		r_client.hgetall('char_nick', async function(err, nick) {
			let char_str = await emoji_h.extractCharStr(args[0]);
			if(!(char_str in nick)){
				message.channel.send(`Char ${char_str} unknown.`);
				return;
			}
			
			let id = nick[char_str];
			
  		r_client.hgetall(`char_data_${id}`, function(err, data){
  			let img = emoji_h.getEmojiString(d_client,data['name']);
  			let str = `${img}`;
  			if(args.length === 1){
					for (const d in data) {
						if(d == 'name'){
							str = str + ` **${data[d]}**\n`;
							continue
						}
						str = str + `${d}: ${data[d]}\n`;
					}
				}else{
					for(let i = 1; i < args.length; i++){
						if(args[i] in data){
							str = str + `${args[i]}: ${data[args[i]]}` + "\n";
						}
					}
				}
				if(str != ""){
					message.channel.send(str);
				}
			});
		});
}


function help(message){
	let str = "**__Commands__**\n";
	for(let c in global.com_call){
		str = str + global.com_call[c] + "\n";
	}
	message.channel.send(str);
}

module.exports = { addChar, addExp, addNick, checkLevel, checkMyLevel, getVer, help, updateAllChars, updateChar, updateVer, viewChar };
