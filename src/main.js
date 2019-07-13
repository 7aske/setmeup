(async function () {
	const sources = require("./sources");
	const helpers = require("./helpers");
	const fs = require("fs");

	const champMap = await helpers.getChampionIdMap();

	const champions = await sources.champGG.getChampGGChampions();
	const allData = [];
	for (let j = 0; j < 3; j++) {
		const champ = champions[j];
		const champOut = {name: champ.name, builds: []};
		for (let i = 0; i < champ.roles.length; i++) {
			const role = champ.roles[i];
			const build = await sources.champGG.mustGetChampGGBuild(champ.name, role);
			if (Object.keys(build).length !== 0) {
				champOut.builds.push(build);
			}
		}
		allData.push(champOut);
	}

	const sets = [];
	for (let i = 0; i < allData.length; i++) {
		const champ = allData[i];
		champ.builds.forEach((b,i) => {
			const parsedSet = helpers.makeSet(champMap[champ.name], b.title, i, b.blocks, b.skills);
			sets.push(parsedSet);
		});
	}
	fs.writeFileSync("sets.json", JSON.stringify(sets));
})();
