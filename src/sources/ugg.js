const axios = require("axios");
const cheerio = require("cheerio");
const champGG = require("./championgg");
const helpers = require("../helpers");
const uuid = require("uuid/v1");

let items;
const itemsUrl = "https://static.u.gg/assets/lol/riot_static/9.14.1/data/en_US/item.json";
(async function () {
	items = (await axios.get(itemsUrl)).data;
})();

function getSkillUps(parent) {
	return parent.children[2].children.filter(c => c.children[0].children.length !== 0).map(c => parseInt(c.children[0].children[0].data));
}

function getItemsFromContainer(cont) {
	return cont.map(c => {
		const style = c.children[0].children[0].children[0].attribs["style"];
		const attribs = style.split(";");
		const pageIndex = parseInt(attribs[2].match(/item[\d]+/)[0].substring(4));
		const pageOffsetCoords = attribs[4].split(":")[1].split(" ").map(n => parseInt(n) / 48 * -1);
		const itemOffset = pageOffsetCoords[1] * 10 + pageOffsetCoords[0];
		const id = Object.keys(items.data)[itemOffset + pageIndex * 100];
		return {
			id,
			name: items.data[id].name,
		};
	});
}

async function getBuild(champ, role = "", league, args = []) {
	const url = `https://u.gg/lol/champions/${helpers.capitalize(champ)}/build?role=${role.toLowerCase()}`;
	const res = await axios.get(url);
	const html = res.data;
	const $ = cheerio.load(html);

	const itemsStartSelector = "#content > div > div > div.champion-profile-page > div > div._grid-3._grid-columns > div.grid-block.starting-items > div.grid-block-content > div > div.items";
	const itemsCoreSelector = "#content > div > div > div.champion-profile-page > div > div._grid-3._grid-columns > div.grid-block.final-items > div.grid-block-content > div > div.items";
	const itemFourSelector = "#content > div > div > div.champion-profile-page > div > div._grid-3._grid-columns > div.grid-block.item-options-1 > div.grid-block-content > div";
	const itemFiveSelector = "#content > div > div > div.champion-profile-page > div > div._grid-3._grid-columns > div.grid-block.item-options-2 > div.grid-block-content > div";
	const itemSixSelector = "#content > div > div > div.champion-profile-page > div > div._grid-3._grid-columns > div.grid-block.item-options-3 > div.grid-block-content > div";

	const itemsTag = $(itemsStartSelector)[0];
	const itemsCoreTag = $(itemsCoreSelector)[0];
	const itemFourTag = $(itemFourSelector)[0];
	const itemFiveTag = $(itemFiveSelector)[0];
	const itemSixTag = $(itemSixSelector)[0];

	if (itemsTag === undefined ||
		itemsCoreTag === undefined ||
		itemFourTag === undefined ||
		itemFiveTag === undefined ||
		itemSixTag === undefined) {
		return {};
	}

	const itemsBlockStartItems = getItemsFromContainer(itemsTag.children);
	const itemsCore = getItemsFromContainer(itemsCoreTag.children.filter(c => c.name === "div"));
	const itemFour = getItemsFromContainer(itemFourTag.children.map(c => c.children[0]));
	const itemFive = getItemsFromContainer(itemFiveTag.children.map(c => c.children[0]));
	const itemSix = getItemsFromContainer(itemSixTag.children.map(c => c.children[0]));

	const skillOrderSelector = "#content > div > div > div.champion-profile-page > div > div._grid-2._grid-columns > div.grid-block.skill-path-block > div.grid-block-content > div > div > div";
	const skillOrderTag = $(skillOrderSelector)[0];

	if (skillOrderTag === undefined) {
		return {};
	}

	const skillOrderQ = getSkillUps(skillOrderTag.children[0]);
	const skillOrderW = getSkillUps(skillOrderTag.children[1]);
	const skillOrderE = getSkillUps(skillOrderTag.children[2]);
	const skillOrderR = getSkillUps(skillOrderTag.children[3]);

	console.log(skillOrderQ);
	console.log(skillOrderW);
	console.log(skillOrderE);
	console.log(skillOrderR);

	const skillPrioritySelector = "#content > div > div > div.champion-profile-page > div > div._grid-2._grid-columns > div.grid-block.skill-priority > div.grid-block-content > div > div.skill-path";
	const skillPriorityTag = $(skillPrioritySelector)[0];

	const skillPriority = skillPriorityTag.children.filter(c => c.name === "div").map(c => c.children[1].children[0].data);

	const statsSelector = "#content > div > div > div.champion-profile-page > div > div._grid-0._grid-columns > div > div.grid-block-content > div > div";
	const statsTag = $(statsSelector)[0];

	const winRate = statsTag.children[0].children[0].children[0].data;
	const gamesPlayed = statsTag.children[4].children[0].children[0].data;

	return {
		champ,
		role: helpers.capitalize(role),
		title: `${champ} ${helpers.capitalize(role)} Most Frequent`,
		sets: [{
			blocks: [{
				name: `Starting items | ${skillPriority.join(" > ")}`,
				items: itemsBlockStartItems.map(b => b.id),
			}, {
				name: `Core Build | ${winRate} (${gamesPlayed})`,
				items: itemsCore.map(b => b.id),
			}, {
				name: "Fourth Item Choice",
				items: itemFour.map(b => b.id),
			}, {
				name: "Fifth Item Choice",
				items: itemFive.map(b => b.id),
			}, {
				name: "Sixth Item Choice",
				items: itemSix.map(b => b.id),
			},
			],
			name: "Most Frequent",
		}],
	};
}

async function mustGetBuild(champ, role = "", args = []) {
	return getBuild(champ, role, "", args);
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

function makeSet(champ, title, rank = 0, {blocks, name}, role) {
	console.log(blocks);
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
	blocks.forEach(block => {
		const newblock = makeBlock(block.items, block.name);
		set.blocks.push(newblock);
	});
	return set;
}

async function getChampions() {
	// champion.gg has the list of most popular roles
	// so its better to use that rather than getting
	// Cait support builds for no reason
	return await champGG.getChampions();
}

async function getPatch() {
	const url = "https://u.gg/lol/champions/annie/build";
	const res = await axios.get(url);
	const html = res.data;

	const $ = cheerio.load(html);

	const patchSelector = "#content > div > div > div.filter-manager > div > div > div:nth-child(5) > div.default-select.filter-select.css-1y6z7r9 > div > div.default-select__value-container.default-select__value-container--has-value.css-1hwfws3 > div > div > span";
	const patchTag = $(patchSelector)[0].children[0];
	console.log(patchTag);
	return patchTag.data;
}

module.exports = {getBuild, mustGetBuild, makeSet, makeBlock, getPatch, getChampions};
