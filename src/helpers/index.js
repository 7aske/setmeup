const axios = require("axios");
const fs = require("fs");
const path = require("path");
const uuid = require("uuid/v1");
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

function makeBlock(spellIds, name, count = 1) {
	const block = {hideIfSummonerSpell: "", items: [], showIfSummonerSpell: "", type: name};
	for (let i = 0; i < spellIds.length; i++) {
		const id = spellIds[i];
		const spell = {count, id};
		block.items.push(spell);
	}
	return block;
}

function makeSet(champ, title, rank, {blocks, skills}, role) {
	const set = {
		associatedChampions: [champ],
		associatedMaps: [11],
		blocks: [],
		map: "any",
		mode: "any",
		preferredItemSlots: [],
		sortrank: rank,
		startedFrom: "blank",
		title: title,
		type: "custom",
		uuid: uuid(),
	};
	const skillPriority = skills.order.priority.join(" > ");
	const startSkillOrder = [];
	Object.keys(skills.order.start).sort().forEach(key => {
		startSkillOrder.push(skills.order.start[key].toUpperCase());
	});
	const startName = `${blocks.start.name} | ${startSkillOrder.join("->")} | ${skills.win_rate} (${skills.game_count})`;
	const fullName = `${blocks.full.name}|  ${skillPriority} | ${blocks.full.win_rate} (${blocks.full.game_count})`;
	const startBlock = makeBlock(blocks.start.ids, startName);
	const fullBlock = makeBlock(blocks.full.ids, fullName);
	if (role === "Jungle") {
		startBlock.showIfSummonerSpell = "SummonerSmite";
		fullBlock.hideIfSummonerSpell = "SummonerSmite";
	}
	set.blocks.push(startBlock);
	set.blocks.push(fullBlock);
	return set;
}

function verifyPath(p) {
	const lolExe = path.join(p, "LeagueClient.exe");
	const confFile = path.join(p, "Config/ItemSets.json");
	return fs.existsSync(lolExe) && fs.existsSync(confFile);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {getChampionIdMap, makeBlock, makeSet, sleep, Store, miscBlocks, verifyPath};
