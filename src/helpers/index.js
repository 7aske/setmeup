const axios = require("axios");
const fs = require("fs");
const path = require("path");
const miscBlocks = require("./miscBlocks");
const Store = require("./store");

async function getChampionIdMap() {
	const out = {};
	const url = "http://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/champion.json";
	const res = await axios.get(url);
	const data = res.data.data;
	for (const champ in data) {
		if (Object.prototype.hasOwnProperty.call(data, champ)) {
			out[champ] = parseInt(data[champ].key);
		}
	}
	return out;
}


function verifyPath(p) {
	const lolExe = path.join(p, "LeagueClient.exe");
	const confFile = path.join(p, "Config/ItemSets.json");
	return fs.existsSync(lolExe) && fs.existsSync(confFile);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {getChampionIdMap, sleep, Store, miscBlocks, verifyPath};
