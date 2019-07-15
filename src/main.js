const sources = require("./sources");
const helpers = require("./helpers");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const confJson = require("../config/config");
const PROC_COUNT = process.env.PROC_COUNT ? parseInt(process.env.PROC_COUNT) : 4;


async function main() {
	if (!fs.existsSync(confJson.leaguePath)) {
		console.error("Path " + confJson.leaguePath + " does not exist");
		process.exit(1);
	}

	const allData = [];
	const forks = [];

	const champMap = await helpers.getChampionIdMap();
	const champions = await sources.champGG.getChampions();
	const patch = await sources.champGG.getPatch();

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
				} else if (message.type === "ERROR") {
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
		champions.forEach((champ, j)=> {
			const champOut = {name: champ.name, builds: []};
			allData.push(champOut);
			champ.roles.forEach(role => {
				forks[currProc].send(`QUEUE champGG mustGetBuild ${champ.name} ${role}`);
				currProc = currProc === forks.length - 1 ? 0 : currProc + 1;
			});
			champions.splice(j, 1);
		});
	}

	const sets = [];
	allData.forEach(champ => {
		if (Object.prototype.hasOwnProperty.call(champMap,champ.name)) {
			const champId = champMap[champ.name];
			champ.builds.forEach((build, rank) => {
				build.sets.forEach(set => {
					const title = champ.name + " " + build.role + " " + set.blocks.name + " " + patch;
					const parsedSet = helpers.makeSet(champId, title, rank, set, build.role);
					sets.push(parsedSet);
				});
			});
		}
	});

	console.log("Sets", sets.length);
	for (const fork of forks) {
		fork.kill();
	}
	process.exit(0);

	const leagueConfFile = path.join(confJson.leaguePath, "Config/ItemSets.json");
	if (!fs.existsSync(leagueConfFile)) {
		console.error("Please create at least one set with the game client so that config file gets created.");
		process.exit(1);
	}

	let leagueFileJson = {};
	fs.readFile(leagueConfFile, (err, res) => {
		if (err) process.exit(1);
		leagueFileJson = JSON.parse(res);
	});

	fs.writeFileSync(leagueConfFile + ".bak", JSON.stringify(leagueFileJson));

	delete leagueConfFile.itemSets;
	leagueFileJson.itemSets = sets;

	fs.writeFileSync("sets.json", JSON.stringify(leagueFileJson));
	fs.writeFileSync(leagueConfFile, JSON.stringify(leagueFileJson));
}

(async function () {
	await main();
})();
