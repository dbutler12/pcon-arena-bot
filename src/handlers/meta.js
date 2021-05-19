
function addChar(r_client, c_name, position){
	//Promisify redis, since it doesn't directly support promises			
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	
	(async function() {
		let char_id = await getAsync('cur_char_id');
		return char_id;
	})().then(id => {
		var char_obj = {
			name:c_name,
			position:position,
			rec:"0-0",
			def:0,
			att:0
		};
		var nick_obj = {};
		nick_obj[c_name] = id;
		r_client.hmset(`char_data_${id}`, char_obj);
		r_client.hmset('char_nick', nick_obj);
		r_client.incr('cur_char_id');
	});
}


function viewChar(r_client, message, args){
		r_client.hgetall('char_nick', function(err, nick) {
			if(err){
				message.channel.send(`Character ${args[0]} doesn't exist.`);
				return;
			}
			
			let id = nick[args[0]];
	 		
  		r_client.hgetall(`char_data_${id}`, function(err, data){
  			var str = "";
  			if(args.length === 1){
					for (const d in data) {
						str = str + `${d}: ${data[d]}` + "\n";
					}
				}else{
					for(var i = 1; i < args.length; i++){
						if(args[i] in data){
							str = str + `${args[i]}: ${data[args[i]]}` + "\n";
						}
					}
				}
				message.channel.send(str);
			});
		});
		
		/*
		r_client.multi().
		hgetall('char_data_0').
		hgetall('char_data_1').
		exec(function(err, results){
			message.channel.send(results[0]['position']);
		});
		*/
}

module.exports = { addChar, viewChar };
