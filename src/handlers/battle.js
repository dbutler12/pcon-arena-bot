
function battle(args, client, r_client, message){
 message.channel.send(`Battling `);
 for(var i = 0; i < args.length; i++){
 	message.channel.send(`${args[i]} `);
 }
}

module.exports = { battle };
