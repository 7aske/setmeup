const sources = require("./sources");
const helpers = require("./helpers");
const fs = require("fs");
const net = require("net");
const path = require("path");
const cp = require("child_process");
const confJson = require("../config/config");

async function poolWait(ps, fp) {
	let count = 0;
	while (ps > 0) {
		await helpers.sleep(5);
		for (const fork of fp) {
			if (fork.exitCode !== null) {
				fp.splice(fp.indexOf(fork), 1);
				ps--;
				count++;
			}
		}
	}
	return count;
}

(async function () {



	const SOCK_ADDR = path.join(process.cwd(), "smuctl.sock");

	process.on("exit", () => {
		if (fs.existsSync(SOCK_ADDR)) {
			fs.unlinkSync(SOCK_ADDR);
		}
	});

	if (fs.existsSync(SOCK_ADDR)) {
		fs.unlinkSync(SOCK_ADDR);
	}

	if (!fs.existsSync(confJson.leaguePath)) {
		console.error("Path " + confJson.leaguePath + " does not exist");
		process.exit(1);
	}

	const champMap = await helpers.getChampionIdMap();

	const allData = [];
	const connections = [];

	net.createServer((conn) => {
		connections.push(conn);
		conn.on("data", data => {
			const b = JSON.parse(data.toString());
			if (Object.keys(b).length !== 0) {
				const cName = b.title.split(" ")[0];
				const index = allData.findIndex((champData) => champData.name === cName);
				allData[index].builds.push(b);
			}
		});

		conn.on("close", () => {
			connections.splice(connections.indexOf(conn), 1);
		});

	}).listen(SOCK_ADDR);

	const champions = await sources.champGG.getChampions();

	let remainingTasks = 0;
	champions.forEach(c => {
		remainingTasks += c.roles.length;
	});

	const maxPoolSize = parseInt(process.env.PROC_COUNT) | 1 ;
	let poolSize = 0;
	const forkPool = [];

	for (let j = 0; j < champions.length; j++) {
		const champ = champions[j];
		const champOut = {name: champ.name, builds: []};
		allData.push(champOut);
		for (let i = 0; i < champ.roles.length; i++) {
			const role = champ.roles[i];
			if (poolSize === maxPoolSize) {
				const tasksDone = await poolWait(poolSize, forkPool);
				poolSize -= tasksDone;
				remainingTasks -= tasksDone;
			}
			const f = cp.fork("./src/fork.js", ["champGG", "mustGetBuild", champ.name, role], {
				env: {SOCK_ADDR},
			});
			forkPool.push(f);
			poolSize++;
		}
	}

	const tasksDone = await poolWait(poolSize, forkPool);
	poolSize -= tasksDone;
	remainingTasks -= tasksDone;

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

	const leagueConfFile = path.join(confJson.leaguePath, "Config/ItemSets.json");
	if (!fs.existsSync(leagueConfFile)){
		console.error("Please create at least one set with the game client so that config file gets created.")
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

	process.exit(0);
})();
