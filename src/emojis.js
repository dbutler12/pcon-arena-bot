function getEmojiString(d_client, character){
	let str = d_client.emojis.cache.find(emoji => emoji.name === character);
	return (str == undefined) ? character : str.toString();
}

function extractCharStr(d_client, str){
	if(str.charAt(0) == '<'){
		str = str.split(':')[1];
	}
	return str;
}

module.exports = { getEmojiString, extractCharStr };
