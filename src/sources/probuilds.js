const axios = require("axios");
const cheerio = require("cheerio");
const uuid = require("uuid/v1");

async function getBuild(champ, role = "General", args = []) {
	const url = `https://www.probuilds.net/champions/details/${champ}`;
	const res = await axios.get(url);
	const html = res.data;
	const $ = cheerio.load(html);

	const freqBuildTitle = "Most Frequent Items";

	const itemsSelector = ".popular .popular-section:nth-child(1)";
	const statsSelector = ".champion-info .stats-header-flex";
	const itemsTag = $(itemsSelector);
	const statsTag = $(statsSelector);

	const freqFullBuild = {
		name: freqBuildTitle,
		items: itemsTag[0].children.filter(c => Object.prototype.hasOwnProperty.call(c, "attribs") && c.attribs["class"].indexOf("bigData") !== -1).map(c => c.children[3].children[1].attribs["alt"]),
		ids: itemsTag[0].children.filter(c => Object.prototype.hasOwnProperty.call(c, "attribs") && c.attribs["class"].indexOf("bigData") !== -1).map(c => c.children[3].attribs["data-id"]),
		win_rate: statsTag[0].children[5].children[1].children[0].data,
		game_count: statsTag[0].children[1].children[1].children[0].data,
	};
	const freqBoots = {
		name: freqBuildTitle,
		items: itemsTag[1].children.filter(c => Object.prototype.hasOwnProperty.call(c, "attribs") && c.attribs["class"].indexOf("bigData") !== -1).map(c => c.children[3].children[1].attribs["alt"]),
		ids: itemsTag[1].children.filter(c => Object.prototype.hasOwnProperty.call(c, "attribs") && c.attribs["class"].indexOf("bigData") !== -1).map(c => c.children[3].attribs["data-id"]),
	};
	return {
		champ,
		role,
		title: `${champ} Most Frequent`,
		sets: [{
			blocks: {
				name: freqBuildTitle,
				boots: freqBoots,
				full: freqFullBuild,
			},
		}],
	};
}

async function mustGetBuild(champ, role = "", rank = 0, args = []) {
	return getBuild(champ, role, rank, args);
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

function makeSet(champ, title, rank, {blocks}) {
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

	const fullName = `${blocks.full.name}| ${blocks.full.win_rate} (${blocks.full.game_count})`;
	const startBlock = makeBlock(blocks.boots.ids, blocks.boots.name);
	const fullBlock = makeBlock(blocks.full.ids, fullName);
	set.blocks.push(startBlock);
	set.blocks.push(fullBlock);
	return set;
}

async function getPatch() {
	return new Date().toLocaleDateString();
}

(async function () {
	console.log(await getBuild("Tryndamere"));
})();
module.exports = {getBuild, mustGetBuild, makeSet, makeBlock, getPatch};
