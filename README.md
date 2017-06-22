# Locker
Simple Redis locking that doesn't use polling

## How it works
This library implements "reverse" locking, so instead of setting the lock key, the lock is acquired immediately upon calling the lock function by using [BLPOP](https://redis.io/commands/blpop). The critical process is started by pushing an item to the list defined as a lock key and the lock is released when the critical process promise is resolved. The promise is then resolved, and the next locked process continues execution.

## Installation

```bash
npm install node-locker
```

## Usage

```javascript
const Locker = require('node-locker');
const locker = new Locker({ /* redis config */ });

locker.lock('myLockKey', () => {
	// Some critical code here
	// E.g. financial transactions
	return Promise.resolve( /* result */ ); // Resolve the promise to release the lock
}).then((result) => {
	// Lock is released here
});
```

## License
```
MIT License

Copyright (c) 2017 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

