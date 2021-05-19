
function addChar(r_client, c_name, position){
	var char_obj = {
		name:c_name,
		position:position,
		rec:"0-0",
		def:0,
		att:0
	};
	//Promisify redis, since it doesn't directly support promises			
	const { promisify } = require('util');
	const getAsync = promisify(r_client.get).bind(r_client);
	
	(async function() {
		let char_id = await getAsync('cur_char_id');
		return char_id;
	})().then(id => {
		var nick_obj = {};
		nick_obj[c_name] = id;
		r_client.hmset(`char_data_${id}`, char_obj);
		r_client.hmset('char_nick', nick_obj);
		r_client.incr('cur_char_id');
	});
}


module.exports = { addChar };
