const Redis = require('ioredis');
const connecting = {};

/**
 * Simple locking mechanism that doesn't rely on polling to continue execution after unlocking
 * 
 * @class Locker
 */
class Locker {
	/**
	 * Creates an instance of Locker
	 * 
	 * @param {Object} config 
	 * @memberof Locker
	 */
	constructor(config = {}) {
		this.config = config;
		this.redis = new Redis(config);
	}

	/**
	 * Unlock
	 * 
	 * @param {String} key 
	 * @param {Function} process 
	 * @param {Integer} [timeout=0] 
	 * @returns  
	 * @memberof Locker
	 */
	lock(key, process, timeout = 0) {
		if (!connecting[key]) {
			connecting[key] = [];
		}

		const blockingRedis = this.redis.duplicate();
		connecting[key].push(new Promise((resolve) => {
			blockingRedis.on('ready', resolve);
		}));

		const blpop = Promise.all(connecting[key]).then(() => {
			delete connecting[key];
			return blockingRedis.blpop(key, timeout)
				.then(() => process()
					.then(undefined, error => Promise.reject(error))
					.catch(error => Promise.reject(error))
				)
				.then((result) => this.unlock(key)
					.then(() => {
						blockingRedis.disconnect();
						return result;
					}), error => this.unlock(key)
						.then(() => {
							blockingRedis.disconnect();
							return Promise.reject(error);
						})
				
				);
		})

		this.redis.incr(`${key}:counter`)
			.then(counter => counter === 1 ? this.redis.rpush(key, 1) : null);

		return blpop;
	}

	/**
	 * Unlock
	 * 
	 * @param {String} key 
	 * @returns  
	 * @memberof Locker
	 */
	unlock(key) {
		return this.redis.decr(`${key}:counter`)
			.then((count) => count > 0 ? this.redis.rpush(key, 1) : Promise.resolve());
	}
}
module.exports = Locker;