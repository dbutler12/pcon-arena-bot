const redis = require('redis');

function getRedis() {
  if (!getRedis._instance) {
    getRedis._instance = redis.createClient();
    getRedis._instance.on('connect', function() {
    	console.log('Redis Connected');
		});
  }
  
  getRedis.getInstance = function () {
    return this._instance;
  };  
  
  return getRedis._instance;
}

module.exports = { getRedis };
