const {dialog, getCurrentWindow} = require("electron").remote;
const ipcRenderer = require("electron").ipcRenderer;
const helpers = require("../helpers");
const sources = require("../sources");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
// if (process.env.NODE_ENV !== "development") {
// 	__dirname = path.join(__dirname, "resources/app");
// }
const configFile = path.join(__dirname, "../config/config.json");

const initialState = {
	args: [],
	leaguePath: "",
	leaguePathOk: false,
	totalTasks: 0,
	currentTasks: 0,
	running: false,
	source: "",
};
const store = new helpers.Store(initialState);

const pathPickers = document.querySelectorAll(".path-picker");
const optionPickers = document.querySelectorAll("[type='checkbox']");
const sourcePickers = document.querySelectorAll("[type='radio']");

const progressIndicator = document.querySelector("footer .progress .determinate");

const btnFetch = document.querySelector("#btn-fetch");
const outputLabel = document.querySelector("#output");
const outputInfo = document.querySelector("#output-info");

let configFileJson = {leaguePath: "", args: []};
if (fs.existsSync(configFile)) {
	configFileJson = JSON.parse(fs.readFileSync(configFile).toString());
}

store.subscribe("leaguePath", () => {
	const pathInput = document.querySelector(".file-path");
	const label = document.querySelector(".file-field .btn");
	const leaguePath = store.get("leaguePath");
	pathInput.value = leaguePath;
	if (helpers.verifyPath(leaguePath)) {
		label.classList.remove("red");
		label.classList.remove("cyan");
		label.classList.add("green");
		store.set("leaguePathOk", true);
		configFileJson.leaguePath = leaguePath;
		pathInput.focus();
		fs.writeFileSync(configFile, JSON.stringify(configFileJson));

	} else {
		label.classList.remove("green");
		label.classList.remove("cyan");
		label.classList.add("red");
		store.set("leaguePathOk", false);
	}
});

store.subscribe("currentTasks", () => {
	const tasks = store.get("currentTasks");
	const total = store.get("totalTasks");
	const ratio = total === 0 ? 0 : Math.ceil(tasks / total * 100);
	outputInfo.innerHTML = tasks;
	progressIndicator.style.width = ratio.toString(10) + "%";
});

store.subscribe("args", () => {
	configFileJson.args = store.get("args");
	fs.writeFileSync(configFile, JSON.stringify(configFileJson));
});

store.subscribe("running", () => {
	if (store.get("running")) {
		btnFetch.classList.add("disabled");
		optionPickers.forEach(p => {
			p.disabled = true;
		});
	} else {
		btnFetch.classList.remove("disabled");
		optionPickers.forEach(p => {
			p.disabled = false;
		});
	}
});


if (Object.prototype.hasOwnProperty.call(configFileJson, "leaguePath")) {
	store.set("leaguePath", configFileJson["leaguePath"]);
}

if (Object.prototype.hasOwnProperty.call(configFileJson, "args")) {
	const args = configFileJson["args"];
	if (Array.isArray(args)) {
		for (const val of args) {
			optionPickers.forEach(p => {
				const option = p.attributes["data-option"].value;
				if (option === val) {
					p.checked = true;
				}
			});
		}
		store.set("args", args);
	}
}

btnFetch.addEventListener("click", () => {
	if (store.get("leaguePathOk") && !store.get("running") && store.get("source") !== "") {
		store.set("running", true);
		const fork = cp.fork("./src/fetch.js", store.get("args"), {
			env: {LEAGUE_PATH: store.get("leaguePath"), SOURCE: store.get("source")},
			stdio: ["pipe", 1, 2, "ipc"],
		});
		fork.on("message", buffer => {
			let message;
			try {
				message = JSON.parse(buffer);
			} catch (e) {
				console.log(buffer);
				console.error(e);
				message = null;
			}
			if (message !== null) {
				if (message.type === "START") {
					store.set("currentTasks", 0);
					store.set("totalTasks", message.data);
				} else if (message.type === "DONE") {
					outputLabel.innerHTML = message.data;
					store.set("running", false);
				} else if (message.type === "INFO") {
					outputLabel.innerHTML = message.data;
				} else if (message.type === "BUILD") {
					outputLabel.innerHTML = message.data.title;
					store.set("currentTasks", store.get("currentTasks") + 1);
				} else if (message.type === "ERROR") {
					console.error(message.data);
					outputLabel.innerHTML = message.data;
				} else {
					console.log(message.data);
				}
			}
		});
	}
});

pathPickers.forEach(p => {
	p.addEventListener("click", e => {
		e.preventDefault();
		const pth = dialog.showOpenDialog({
			properties: ["openDirectory"],
		});
		if (pth !== undefined) {
			store.set("leaguePath", pth[0]);
		}
	});
});

optionPickers.forEach(p => p.addEventListener("click", () => {
	const option = p.attributes["data-option"].value;
	const value = p.checked;
	const args = store.get("args");
	if (value) {
		args.push(option);
	} else {
		args.splice(args.indexOf(option), 1);
	}
	store.set("args", args);
}));

sourcePickers.forEach(async p => {
	if (p.checked) {
		store.set("source", p.value);
	}
	sources[p.value].getPatch().then(patch => {
		p.parentElement.querySelector(".pill").innerHTML = patch;
		p.parentElement.classList.remove("hide");
		p.parentElement.parentElement.parentElement.children[0].classList.add("hide");
	}).catch(err => {
		console.error(err);
		p.disabled = true;
		if (p.checked) {
			store.set("source", "");
		}
		p.parentElement.querySelector(".pill").innerHTML = "0.0";
		p.parentElement.classList.remove("hide");
		p.parentElement.parentElement.parentElement.children[0].classList.add("hide");
	});
	p.addEventListener("click", () => {
		if (p.checked) {
			store.set("source", p.value);
		}
	});
});

document.addEventListener("keydown", e => {
	if (e.key === "Escape") {
		ipcRenderer.send("app-quit", null);
	}
});

document.addEventListener("DOMContentLoaded", function () {
	if (process.env.NODE_ENV === "development") {
		getCurrentWindow().toggleDevTools();
	}
});
