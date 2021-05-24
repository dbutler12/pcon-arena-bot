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
			let char_arr = [];
			let char_obj = {};
			char_obj['name'] = results[0]['name'];
			char_obj['position'] = results[0]['position'];
			char_arr[0] = char_obj;
			
			for(let i = 1; i < results.length; i++){
				let cur = {};
				cur['name'] = results[i]['name'];
				cur['position'] = results[i]['position'];
				
				for(let j = i-1; j >= 0; j--){
					if(char_arr[j]['position'] < cur['position']){
						char_arr[j+1] = char_arr[j];
						if(j === 0){
							char_arr[j] = cur;
						}
					}else{
						char_arr[j+1] = cur;
						break;
					}
				}
			}
		/*
		//This example works for a basic response option
		let user = m => m.author.id === message.author.id
    message.channel.send(`Are you sure to delete all data? \`YES\` / \`NO\``).then(() => {
      message.channel.awaitMessages(user, {
          max: 1,
          time: 10000,
          errors: ['time']
        })
        .then(message => {
          message = message.first()
          if (message.content.toUpperCase() == 'YES' || message.content.toUpperCase() == 'Y') {
            message.channel.send(`Deleted`)
          } else if (message.content.toUpperCase() == 'NO' || message.content.toUpperCase() == 'N') {
            message.channel.send(`Terminated`)
          } else {
            message.channel.send(`Terminated: Invalid Response`)
          }
        })
        .catch(collected => {
            message.channel.send('Timeout');
        });
    })
			*/
			str = "Battle Against: \n";
			for(let i = 0; i < char_arr.length; i++){
				str = str + i + " " + char_arr[i]['name'] + " at " + char_arr[i]['position'] + "\n";
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
