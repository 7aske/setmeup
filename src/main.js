const sources = require("./sources");
const helpers = require("./helpers");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const confJson = require("../config/config");
const PROC_COUNT = process.env.PROC_COUNT ? parseInt(process.env.PROC_COUNT) : 4;

(async function () {
	if (!fs.existsSync(confJson.leaguePath)) {
		console.error("Path " + confJson.leaguePath + " does not exist");
		process.exit(1);
	}

	const allData = [];
	const forks = [];

	const champMap = await helpers.getChampionIdMap();
	const champions = await sources.champGG.getChampions();

	let remainingTasks = 0;

	champions.forEach(c => {
		remainingTasks += c.roles.length;
	});

	for (let i = 0; i < PROC_COUNT; i++) {
		const f = cp.fork("./src/fork.js", [], {
			env: {PROC_ID: i},
			stdio: ["pipe", 1, 2, "ipc"],
		});
		f.on("message", buffer => {
			let message;
			try {
				message = JSON.parse(buffer);
			} catch (e) {
				console.log(buffer);
				console.error(e);
				message = null;
			}

			if (message !== null) {
				console.log(message.type, message.procId);
				if (message.type === "BUILD") {
					const build = message.data;
					console.log(build);
					if (Object.keys(build).length !== 0) {
						const index = allData.findIndex(c => c.name === build.champ);
						allData[index].builds.push(build);
					}
					remainingTasks--;
				}else if (message.type === "ERROR"){
					console.error(message.data);
				} else {
					console.log(message.data);
				}
			}
		});
		forks.push(f);
	}

	while (champions.length > 0 || remainingTasks > 0) {
		await helpers.sleep(100);
		console.log(champions.length, remainingTasks);
		let currProc = 0;
		for (let j = 0; j < champions.length; j++) {
			const champ = champions[j];
			const champOut = {name: champ.name, builds: []};
			allData.push(champOut);
			// build
			for (let i = 0; i < champ.roles.length; i++) {
				const role = champ.roles[i];
				forks[currProc].send(`QUEUE champGG mustGetBuild ${champ.name} ${role}`);
				currProc = currProc === forks.length - 1 ? 0 : currProc + 1;
			}
			champions.splice(j, 1);
		}
	}
	const sets = [];
	for (let i = 0; i < allData.length; i++) {
		const champ = allData[i];
		const champName = champMap[champ.name];
		if (champName != null) {
			champ.builds.forEach((b, i) => {
				b.sets.forEach(bl => {
					const title = champ.name + " " + b.role + " " + bl.blocks.name;
					const parsedSet = helpers.makeSet(champName, title, i, bl, b.role);
					sets.push(parsedSet);
				});
			});
		}
	}
	console.log("Sets", sets.length);
	for (const fork of forks){
		fork.kill();
	}
	process.exit(0);

	const leagueConfFile = path.join(confJson.leaguePath, "Config/ItemSets.json");
	if (!fs.existsSync(leagueConfFile)) {
		console.error("Please create at least one set with the game client so that config file gets created.");
		process.exit(1);
	}

	// let leagueFileJson = {};
	// fs.readFile(leagueConfFile, (err, res) => {
	// 	if (err) process.exit(1);
	// 	leagueFileJson = JSON.parse(res);
	// });

	// fs.writeFileSync(leagueConfFile + ".bak", JSON.stringify(leagueFileJson));

	// delete leagueConfFile.itemSets;
	// leagueFileJson.itemSets = sets;

	// fs.writeFileSync("sets.json", JSON.stringify(leagueFileJson));
	// fs.writeFileSync(leagueConfFile, JSON.stringify(leagueFileJson));
})();
