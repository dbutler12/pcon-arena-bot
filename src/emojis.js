function getEmojiString(d_client, character){
	let str = d_client.emojis.cache.find(emoji => emoji.name === character);
	return (str == undefined) ? character : str.toString();
}

async function extractCharStr(str){
	let c = str.charAt(0);
	if(c == '<' || c == ':'){ // The two current options for an emoji
		str = str.split(':')[1];
	}
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = { getEmojiString, extractCharStr };
