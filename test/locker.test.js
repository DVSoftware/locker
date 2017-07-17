const Locker = require('../');
const Redis = require('ioredis');

const redis = new Redis();

beforeEach(() => redis.del('locker:lock1', 'locker:lock2', 'locker:lock1:counter', 'locker:lock2:counter'));

describe('Locker tests', () => {
	it('should be a constructor', () => {
		expect(typeof Locker).toBe('function');
	});

	it('should have the lock function', () => {
		const locker = new Locker();
		expect(typeof locker.lock).toBe('function');
	});

	it('should have the unlock function', () => {
		const locker = new Locker();
		expect(typeof locker.unlock).toBe('function');
	});

	it('should call unlock after processing', () => {
		const locker = new Locker();
		locker.unlock = jest.fn(locker.unlock);
		return locker.lock('locker:lock1', () => {
			return Promise.resolve({});
		}).then(() => {
			expect(locker.unlock).toBeCalled();
		});
		
	});

	it('should not unlock second lock before first lock', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		const unlock = jest.fn(() => Promise.resolve());
		return Promise.all([
			locker.lock('locker:lock1', () => {
				return new Promise(resolve => {
					setTimeout(() => {
						expect(unlock).not.toBeCalled();
					}, 500);
					setTimeout(() => {
						resolve();
					}, 1000);
				})
			}),
			locker.lock('locker:lock1', resolve).then(unlock)
		]);
	});

	it('should not process second call until the first is unlocked', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		return Promise.all([
			locker.lock('locker:lock1', () => {
				return new Promise(res => {
					setTimeout(() => {
						expect(resolve).not.toBeCalled();
					}, 500);
					setTimeout(() => {
						res();
					}, 1000);
				}).then(resolve);
			}),
			locker.lock('locker:lock1', resolve).then(() => {
				expect(resolve.mock.calls.length).toBe(2);
			})
		]);
	});

	it('should unlock both locks', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		const unlock = jest.fn(() => Promise.resolve());

		return Promise.all([
			locker.lock('locker:lock1', resolve).then(unlock),
			locker.lock('locker:lock1', resolve).then(unlock),
		])
			.then(() => {
				expect(unlock.mock.calls.length).toBe(2);
			})
		
	});

	it('should not block another key', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		const unlock = jest.fn(() => Promise.resolve());

		return Promise.all([
			locker.lock('locker:lock1', () => {
				return new Promise(res => {
					setTimeout(() => {
						expect(unlock).toBeCalled();
					}, 500);
					setTimeout(() => {
						res();
					}, 1000);
				})
			}),
			locker.lock('locker:lock2', resolve).then(unlock)
		]);
	});

	it('should unlock in sequence', () => {
		const locker = new Locker();
		const unlock = jest.fn(() => Promise.resolve());
		const unlock1 = jest.fn(() => Promise.resolve());
		const unlock2 = jest.fn(() => Promise.resolve());

		const process = jest.fn((timeout) => () => new Promise(resolve => {
			setTimeout(resolve, timeout);
		}));
		
		setTimeout(() => { 
			expect(unlock).toBeCalled()
			expect(unlock1).not.toBeCalled()
			expect(unlock2).not.toBeCalled()
		}, 1100);
		setTimeout(() => { 
			expect(unlock).toBeCalled()
			expect(unlock1).toBeCalled()
			expect(unlock2).not.toBeCalled()
		}, 2100);
		setTimeout(() => { 
			expect(unlock).toBeCalled()
			expect(unlock1).toBeCalled()
			expect(unlock2).toBeCalled()
		}, 3100);

		locker.lock('locker:lock1', process(1000)).then(unlock);
		locker.lock('locker:lock1', process(1001)).then(unlock1);
		locker.lock('locker:lock1', process(1002)).then(unlock2);

		return new Promise((resolve) => {
			setTimeout(resolve, 3200);
		})
	
	});

	it('should unlock in lock order', () => {
		const locker = new Locker();
		const resolve = jest.fn((id) => {
			return Promise.resolve(id)
		});
		const unlock = jest.fn(() => Promise.resolve());
		return Promise.all([
			locker.lock('locker:lock1', resolve.bind(null, 1)).then(unlock),
			locker.lock('locker:lock1', resolve.bind(null, 2)).then(unlock),
			locker.lock('locker:lock1', resolve.bind(null, 3)).then(unlock),
		]).then(() => {
			expect(unlock.mock.calls[0][0]).toBe(1);
			expect(unlock.mock.calls[1][0]).toBe(2);
			expect(unlock.mock.calls[2][0]).toBe(3);
		});
	});

	it('should pass the result to the promise', () => {
		const locker = new Locker();
		return locker.lock('locker:lock1', () => {
			return Promise.resolve('test');
		}).then((result) => {
			expect(result).toBe('test');
		});
	});

	it('should not reject on resolved process', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		const reject = jest.fn(() => Promise.resolve());
		
		locker.lock('locker:lock1', () => {
			return Promise.resolve();
		}).then(resolve, reject);
		
		return new Promise((res) => {
			setTimeout(() => {
				expect(reject).not.toBeCalled();
				res();
			}, 100);
		});
	});

	it('should not resolve on exception', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		const reject = jest.fn(() => Promise.resolve());

		locker.lock('locker:lock1', () => {
			throw new Error('Error');
		}).then(resolve, reject);

		return new Promise((res) => {
			setTimeout(() => {
				expect(resolve).not.toBeCalled();
				res();
			}, 100);
		});
	});

	it('should not resolve on rejected process', () => {
		const locker = new Locker();
		const resolve = jest.fn(() => Promise.resolve());
		const reject = jest.fn(() => Promise.resolve());

		locker.lock('locker:lock1', () => {
			return Promise.reject('error');
		}).then(resolve, reject);

		return new Promise((res) => {
			setTimeout(() => {
				expect(resolve).not.toBeCalled();
				res();
			}, 100);
		});
	});
});