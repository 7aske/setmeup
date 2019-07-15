const sources = require("./sources");
const helpers = require("./helpers");
const PROC_ID = process.env.PROC_ID ? process.env.PROC_ID : "";
let waiting = true;
if (PROC_ID === "") {
	process.stderr.write("Error starting forked process");
	process.exit(1);
}

class Task {
	constructor(source, action, champ, role) {
		this.source = source;
		this.action = action;
		this.champ = champ;
		this.role = role;
	}
}

class TaskQueue {
	constructor(queue = []) {
		this.ready = true;
		this.queue = queue;
	}

	async doTask() {
		if (this.queue.length > 0 && this.ready) {
			const task = this.queue.pop();
			if (task === undefined) {
				return null;
			}
			this.ready = false;
			const fun = sources[task.source][task.action];
			const res = await fun(task.champ, task.role);
			this.ready = true;
			return res;
		}
		return null;
	}

	addTask(task) {
		this.queue.push(task);
	}
}

const taskQueue = new TaskQueue();

(async function () {
	process.send(JSON.stringify({procId: PROC_ID, type: "INFO", data: "Fork started on pid " + process.pid}));
	process.on("message", data => {
		if (waiting) waiting = false;
		console.log("PROC", PROC_ID, data.toString());
		const params = data.toString().split(" ");
		if (params[0] === "QUEUE") {
			taskQueue.addTask(new Task(params[1], params[2], params[3], params[4]));
		} else if (params[0] === "KILL") {
			process.exit(0);
		}
	});
	let running = true;
	while (running) {
		const result = await taskQueue.doTask();
		if (result !== null) {
			process.send(JSON.stringify({procId: PROC_ID, type: "BUILD", data: result}));
		}
		if (waiting) {
			await helpers.sleep(100);
		} else if (taskQueue.queue.length === 0) {
			process.send(JSON.stringify({procId: PROC_ID, type: "INFO", data: "Tasks completed - exiting"}));
			running = false;
		}
	}
})();

