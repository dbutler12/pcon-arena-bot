function getEmojiString(d_client, character){
	let str = d_client.emojis.cache.find(emoji => emoji.name === character);
	return (str == undefined) ? character : str.toString();
}

module.exports = { getEmojiString };
