(async function () {
	const sources = require("./sources");
	const helpers = require("./helpers");
	const fs = require("fs");
	const path = require("path");
	const confJson = require("../config/config");

	if (!fs.existsSync(confJson.leaguePath)) {
		console.error("Path " + confJson.leaguePath + " does not exist");
		process.exit(1);
	}
	const leagueConfFile = path.join(confJson.leaguePath, "Config/ItemSets.json");

	let leagueFileJson = {};
	fs.readFile(leagueConfFile, (err, res) => {
		console.log(err);
		if (err) process.exit(1);
		leagueFileJson = JSON.parse(res);
	});
	const sets = await sources.champGG.getSets();
	leagueFileJson.itemSets = sets;
	fs.writeFileSync(leagueConfFile, JSON.stringify(leagueFileJson));
})();
