const sources = require("./sources");
const helpers = require("./helpers");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const confJson = require("./config/config");
const PROC_COUNT = process.env.PROC_COUNT ? parseInt(process.env.PROC_COUNT) : 4;
const LEAGUE_PATH = process.env.LEAGUE_PATH;
const SOURCE = process.env.SOURCE;
// if (process.env.NODE_ENV !== "development") {
// 	__dirname = path.join(__dirname, "resources/app");
// }

async function main() {
	if (!fs.existsSync(confJson.leaguePath)) {
		console.error("Path " + confJson.leaguePath + " does not exist");
		process.exit(1);
	}

	const allData = [];
	const forks = [];
	console.log(sources, SOURCE);
	console.log(sources[SOURCE].getChampions);
	const champMap = await helpers.getChampionIdMap();
	const champions = await sources[SOURCE].getChampions();
	const patch = await sources[SOURCE].getPatch();

	let remainingTasks = 0;

	champions.forEach(c => {
		remainingTasks += c.builds.length;
	});

	for (let PROC_ID = 0; PROC_ID < PROC_COUNT; PROC_ID++) {
		const f = cp.fork("./src/fork.js", process.argv.slice(2), {
			env: {PROC_ID: PROC_ID + 1},
			stdio: ["pipe", 1, 2, "ipc"],
		});
		f.on("message", buffer => {
			process.send(buffer);
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

	process.send(JSON.stringify({type: "START", procId: 0, data: remainingTasks}));
	while (champions.length > 0 || remainingTasks > 0) {
		await helpers.sleep(100);
		console.log(champions.length, remainingTasks);
		let currProc = 0;
		champions.forEach((champ, j) => {
			const champOut = {name: champ.name, builds: []};
			allData.push(champOut);
			champ.builds.forEach(role => {
				forks[currProc].send(`QUEUE ${SOURCE} mustGetBuild ${champ.name} ${role}`);
				currProc = currProc === forks.length - 1 ? 0 : currProc + 1;
			});
			champions.splice(j, 1);
		});
	}

	const sets = [];
	allData.forEach(champ => {
		if (Object.prototype.hasOwnProperty.call(champMap, champ.name)) {
			const champId = champMap[champ.name];
			champ.builds.forEach((build, rank) => {
				build.sets.forEach(set => {
					const title = `${champ.name} ${build.role} ${set.blocks.name} ${patch}`;
					const parsedSet = sources[SOURCE].makeSet(champId, title, rank, set, build.role);
					if (process.argv.indexOf("consumables") !== -1) {
						parsedSet.blocks.push(helpers.miscBlocks.getDefaultConsumables());
					}
					if (process.argv.indexOf("trinkets") !== -1) {
						parsedSet.blocks.push(helpers.miscBlocks.getDefaultTrinkets());
					}
					sets.push(parsedSet);
				});
			});
		}
	});

	for (const fork of forks) {
		fork.kill();
	}


	const leagueConfFile = path.join(LEAGUE_PATH, "Config/ItemSets.json");
	if (!fs.existsSync(leagueConfFile)) {
		const message = "Please create at least one set with the game client so that config file gets created.";
		process.send(JSON.stringify({type: "INFO", procId: 0, data: message}));
		console.error(message);
		process.exit(1);
	}
	let leagueFileJson = JSON.parse(fs.readFileSync(leagueConfFile).toString());

	fs.writeFileSync(leagueConfFile + ".bak", JSON.stringify(leagueFileJson));

	delete leagueFileJson.itemSets;
	// Object.defineProperty(leagueFileJson, "itemSets", {value:sets});
	leagueFileJson.itemSets = sets;

	fs.writeFileSync(leagueConfFile, JSON.stringify(leagueFileJson));
	fs.writeFileSync(path.join(__dirname, "data/sets.json"), JSON.stringify(leagueFileJson));

	process.send(JSON.stringify({type: "INFO", procId: 0, data: `Sets exported to successfully.`}));

	process.send(JSON.stringify({type: "DONE", procId: 0, data: "Done."}));
}

(async function () {
	await main();
})();
