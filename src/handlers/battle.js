function battle(r_client, message, args){
	r_client.hgetall('char_nick', function(err, nick) {
		let id_arr = [];
		for(let i = 0; i < args.length; i++){
			let char_str = args[i].charAt(0).toUpperCase() + args[i].substr(1).toLowerCase();
			if(!(char_str in nick)){
				return message.channel.send(`Char ${char_str} unknown.`);
			}
			id_arr.push(nick[char_str]);
		}
		r_client.multi().
		hgetall(`char_data_${id_arr[0]}`).
		hgetall(`char_data_${id_arr[1]}`).
		hgetall(`char_data_${id_arr[2]}`).
		hgetall(`char_data_${id_arr[3]}`).
		hgetall(`char_data_${id_arr[4]}`).
		exec(function(err,results){
			console.log(results);
			let debug = "";
			for(let i = 0; i < results.length; i++){
				if('position' in results[i]){
					debug = debug + i + " " + results[i]['name'] + " at " + results[i]['position'] + "\n";
				}else{
					message.channel.send(`Position not in result ${i}`);
				}
			}
			message.channel.send(debug);
			let char_arr = [];
			char_arr[0] = results[0];
			for(let i = 1; i < results.length; i++){
				let cur = results[i];
				for(let j = i-1; j >= 0; j--){
					if(char_arr[j]['position'] < cur['position']){
						char_arr[j+1] = char_arr[j];
						char_arr[j] = cur;
					}
				}
			}
			
			str = "Battle Against: \n";
			for(let i = 1; i < char_arr.length; i++){
				str = str + char_arr[i]['name'] + " at " + char_arr[i]['position'] + "\n";
			}
			message.channel.send(str);
		});
	});
	
	/*
 message.channel.send(`Battling `);
	r_client.multi().
	hgetall('char_data_0').
	hgetall('char_data_1').
	exec(function(err, results){
		message.channel.send(results[0]['position']);
	});
 for(var i = 0; i < args.length; i++){
 	message.channel.send(`${args[i]} `);
 }
 */
}

module.exports = { battle };
