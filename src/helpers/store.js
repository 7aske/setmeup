class Store {
	constructor(initialState = {}) {
		this.state = {};
		for (const key in initialState) {
			if (Object.prototype.hasOwnProperty.call(initialState, key)) {
				Object.defineProperty(this.state, key, {value: {actions: [], value: initialState[key]}});
			}
		}
	}

	subscribe(key, cb) {
		if (!Object.prototype.hasOwnProperty.call(this.state, key)) {
			throw new Error(`Unknown key '${key}'`);
		} else {
			if (Array.isArray(cb)) {
				this.state[key].actions = cb;
			} else {
				this.state[key].actions.push(cb);
			}
		}
	}
	
	get(key) {
		if (!Object.prototype.hasOwnProperty.call(this.state, key)) {
			throw new Error(`Unknown key '${key}'`);
		} else {
			return this.state[key].value;
		}
	}

	set(key, value) {
		if (!Object.prototype.hasOwnProperty.call(this.state, key)) {
			Object.defineProperty(this.state, key, {value: {actions: [], value}});
		} else {
			this.state[key].value = value;
			this.state[key].actions.forEach(a => a());
		}
	}
}

module.exports = Store;
