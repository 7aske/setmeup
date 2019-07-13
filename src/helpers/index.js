const axios = require("axios");
const uuid = require("uuid/v1");

async function getChampionIdMap() {
	const out = {};
	const url = "http://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/champion.json";
	const res = await axios.get(url);
	const data = res.data.data;
	for (const champ in data) {
		out[champ] = parseInt(data[champ].key);
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

function makeSet(champ, title, rank, {blocks, skills}) {
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
	const skillOrder = skills.order.join(" > ");
	const startName = `${blocks.start.name} | ${skillOrder} | ${skills.win_rate} (${skills.game_count})`;
	const fullName = `${blocks.full.name} | ${blocks.full.win_rate} (${blocks.full.game_count})`;
	const startBlock = makeBlock(blocks.start.ids, startName);
	const fullBlock = makeBlock(blocks.full.ids, fullName);

	set.blocks.push(startBlock);
	set.blocks.push(fullBlock);
	return set;
}

module.exports = {getChampionIdMap, makeBlock, makeSet};
