const axios = require("axios");
const cheerio = require("cheerio");
const helpers = require("../helpers");

function getSkillUps(parent) {
	let count = 0;
	const out = {};
	parent.children.filter(c => c.name === "div").forEach((c, i) => {
		if (c.attribs["class"] === "selected") {
			count++;
			out[count] = i + 1;
		}
	});
	return out;
}

function getWinRate(parent) {
	return parent.children.filter(tag => {
		return tag.name === "strong";
	})[0].children[0].data;
}

function getGamesPlayed(parent) {
	return parent.children.filter(tag => {
		return tag.name === "strong";
	})[1].children[0].data;
}

function getSkillOrder(q, e, w, r) {
	const priority = Array({"q": q["5"]}, {"w": w["5"]}, {"e": e["5"]}).sort((e1, e2) => {
		return Object.values(e1)[0] - Object.values(e2)[0];
	}).map(e => Object.keys(e)[0].toUpperCase());
	const start = {1: "", 2: "", 3: "", 4: ""};

	const values = [Object.values(q), Object.values(w), Object.values(e)];
	const translate = {
		0: "q",
		1: "w",
		2: "e",
	};
	for (let i = 0; i < 3; i++) {
		for (const val of values[i]) {
			switch (val) {
				case 1:
					start["1"] = translate[i];
					break;
				case 2:
					start["2"] = translate[i];
					break;
				case 3:
					start["3"] = translate[i];
					break;
				case 4:
					start["4"] = translate[i];
					break;
			}
		}
	}
	return {priority, start};
}

function getTrinketStat(parent) {
	const win_rate = getWinRate(parent.children[3]);
	const games_played = getGamesPlayed(parent.children[3]);
	return {win_rate, games_played};
}

async function getBuild(champ, role, rank) {
	console.log(champ, role, rank);
	const query = rank ? `league=${rank}` : "";
	const ggUrl = `https://champion.gg/champion/${champ}/${role}?${query}`;
	const res = await axios.get(ggUrl);
	const html = res.data;
	const $ = cheerio.load(html);

	const winBuildTitle = "Highest win-rate full build ";
	const winStartTitle = "Highest win-rate starting items ";
	const freqBuildTitle = "Most frequent full build ";
	const freqStartTitle = "Most frequent starting items ";

	const spellStatSelector = "body .primary-hue .main-container .page-content .champion-area .row .skill-order";
	const trinketStatSelector = "body .primary-hue .main-container .page-content .champion-area .row .trinket-stats div";
	const trinketIdSelector = "body .primary-hue .main-container .page-content .champion-area .row .trinket-stats img";

	const freqSpellStatSelectorQ = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(2) .skill-selections";
	const freqSpellStatSelectorW = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(3) .skill-selections";
	const freqSpellStatSelectorE = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(4) .skill-selections";
	const freqSpellStatSelectorR = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(5) .skill-selections";

	const winSpellStatSelectorQ = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(2) .skill-selections";
	const winSpellStatSelectorW = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(3) .skill-selections";
	const winSpellStatSelectorE = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(4) .skill-selections";
	const winSpellStatSelectorR = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(5) .skill-selections";

	const freqSkillTag = $(spellStatSelector);
	const trinketStat1Tag = $(trinketStatSelector)[0];
	const trinketStat1Id = $(trinketIdSelector)[0];

	const trinketStat2Tag = $(trinketStatSelector)[2];
	const trinketStat2Id = $(trinketIdSelector)[1];

	const winTrinketId = trinketStat1Id.attribs["data-id"];
	const freqTrinketId = trinketStat2Id.attribs["data-id"];


	const freqSkillTagQ = $(freqSpellStatSelectorQ)[0];
	const freqSkillTagW = $(freqSpellStatSelectorW)[0];
	const freqSkillTagE = $(freqSpellStatSelectorE)[0];
	const freqSkillTagR = $(freqSpellStatSelectorR)[0];

	if (freqSkillTagQ === undefined ||
		freqSkillTagW === undefined ||
		freqSkillTagE === undefined ||
		freqSkillTagR === undefined) {
		return {};
	}

	const freqSkillQ = getSkillUps(freqSkillTagQ);
	const freqSkillW = getSkillUps(freqSkillTagW);
	const freqSkillE = getSkillUps(freqSkillTagE);
	const freqSkillR = getSkillUps(freqSkillTagR);

	const freqSkillOrder = {
		win_rate: getWinRate(freqSkillTag[0].next.next),
		game_count: getGamesPlayed(freqSkillTag[0].next.next),
		order: getSkillOrder(freqSkillQ, freqSkillW, freqSkillE, freqSkillR),
	};

	const winSkillTagQ = $(winSpellStatSelectorQ)[0];
	const winSkillTagW = $(winSpellStatSelectorW)[0];
	const winSkillTagE = $(winSpellStatSelectorE)[0];
	const winSkillTagR = $(winSpellStatSelectorR)[0];

	if (winSkillTagQ === undefined ||
		winSkillTagW === undefined ||
		winSkillTagE === undefined ||
		winSkillTagR === undefined) {
		return {};
	}

	const winSkillQ = getSkillUps(winSkillTagQ);
	const winSkillW = getSkillUps(winSkillTagW);
	const winSkillE = getSkillUps(winSkillTagE);
	const winSkillR = getSkillUps(winSkillTagR);

	const winSkillOrder = {
		win_rate: getWinRate(freqSkillTag[1].next.next),
		game_count: getGamesPlayed(freqSkillTag[1].next.next),
		order: getSkillOrder(winSkillQ, winSkillW, winSkillE, winSkillR),
	};

	const allBuildContainersSelector = "body .primary-hue .main-container .page-content .champion-area .row .build-wrapper";
	const allBuildContainers = $(allBuildContainersSelector);

	const freqFullTag = allBuildContainers[0];
	const winFullTag = allBuildContainers[1];
	const freqStartTag = allBuildContainers[2];
	const winStartTag = allBuildContainers[3];

	if (freqStartTag === undefined ||
		freqFullTag === undefined ||
		winStartTag === undefined ||
		winFullTag === undefined) {
		return {};
	}

	const freqFullBuild = {
		name: freqBuildTitle,
		items: freqFullTag.children.filter(c => c.name === "a").map(tag => {
			const href = tag.attribs["href"];
			return href.substring(href.lastIndexOf("/") + 1);
		}),
		ids: freqFullTag.children.filter(c => c.name === "a").map(tag => {
			return tag.children.filter(i => i.name === "img")[0].attribs["data-id"];
		}),
		win_rate: getWinRate(freqFullTag.children.filter(c => c.name === "div")[0]),
		game_count: getGamesPlayed(freqFullTag.children.filter(c => c.name === "div")[0]),

	};
	const winFullBuild = {
		name: winBuildTitle,
		items: winFullTag.children.filter(c => c.name === "a").map(tag => {
			const href = tag.attribs["href"];
			return href.substring(href.lastIndexOf("/") + 1);
		}),
		ids: winFullTag.children.filter(c => c.name === "a").map(tag => {
			return tag.children.filter(i => i.name === "img")[0].attribs["data-id"];
		}),
		win_rate: getWinRate(winFullTag.children.filter(c => c.name === "div")[0]),
		game_count: getGamesPlayed(winFullTag.children.filter(c => c.name === "div")[0]),

	};

	const freqStartBuild = {
		name: freqStartTitle,
		items: freqStartTag.children.filter(c => c.name === "a").map(tag => {
			const href = tag.attribs["href"];
			return href.substring(href.lastIndexOf("/") + 1);
		}),
		ids: freqStartTag.children.filter(c => c.name === "a").map(tag => {
			return tag.children.filter(i => i.name === "img")[0].attribs["data-id"];
		}),
		win_rate: getWinRate(freqStartTag.children.filter(c => c.name === "div")[0]),
		game_count: getGamesPlayed(freqStartTag.children.filter(c => c.name === "div")[0]),
	};

	const winStartBuild = {
		name: winStartTitle,
		items: winStartTag.children.filter(c => c.name === "a").map(tag => {
			const href = tag.attribs["href"];
			return href.substring(href.lastIndexOf("/") + 1);
		}),
		ids: winStartTag.children.filter(c => c.name === "a").map(tag => {
			return tag.children.filter(i => i.name === "img")[0].attribs["data-id"];
		}),
		win_rate: getWinRate(winStartTag.children.filter(c => c.name === "div")[0]),
		game_count: getGamesPlayed(winStartTag.children.filter(c => c.name === "div")[0]),

	};

	winStartBuild.ids.push(winTrinketId);
	freqStartBuild.ids.push(freqTrinketId);
	// console.log(getTrinketStat(trinketStat1Tag));
	// console.log(getTrinketStat(trinketStat2Tag));

	return {
		role,
		title: `${champ} ${role}`,
		sets: [{
			blocks: {
				name: "Most Frequent",
				start: freqStartBuild,
				full: freqFullBuild,
			}, skills: freqSkillOrder,
		}, {
			blocks: {
				name: "Highest Win-rate",
				start: winStartBuild,
				full: winFullBuild,
			}, skills: winSkillOrder,
		}],
	};
}

async function mustGetBuild(champ, role) {
	const leagues = ["platplus", "plat", "gold", "silver", "bronze"];
	for (let i = 0; i < leagues.length; i++) {
		const build = await getBuild(champ, role, leagues[i]);
		if (Object.keys(build).length !== 0) {
			return build;
		}
		if (i < leagues.length - 1) {
			console.error(`Cannot get build for ${champ} ${role} ${leagues[i]} - trying ${leagues[i + 1]}`);
		} else {
			console.error(`Cannot get any builds for ${champ} ${role}`);
		}
	}
	return {};
}

async function getChampions() {
	const url = "https://champion.gg/";
	const res = await axios.get(url);
	const html = res.data;
	const $ = cheerio.load(html);

	const contSelector = "#home .col-md-9";
	const contTag = $(contSelector)[0];

	const champContainers = contTag.children.filter(e => e.type === "tag" && e.name === "div");

	const out = [];
	champContainers.forEach(champ => {
		const champOut = {
			name: "",
			roles: [],
		};
		const props = champ.children.filter(e => e.name === "div")[0].children.filter(e => e.name === "a");
		props.forEach((prop, i) => {
			const href = prop.attribs["href"];
			const data = href.substring(href.lastIndexOf("/") + 1);
			if (i === 0) {
				champOut.name = data;
			} else {
				champOut.roles.push(data);
			}
		});
		out.push(champOut);
	});
	return out;
}

async function getSets() {

	const champMap = await helpers.getChampionIdMap();

	const champions = await getChampions();
	const allData = [];
	for (let j = 0; j < champions.length; j++) {
		const champ = champions[j];
		const champOut = {name: champ.name, builds: []};
		for (let i = 0; i < champ.roles.length; i++) {
			const role = champ.roles[i];
			const build = await mustGetBuild(champ.name, role);
			if (Object.keys(build).length !== 0) {
				champOut.builds.push(build);
			}
		}
		allData.push(champOut);
	}

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
	return sets;
}

module.exports = {getSets, getBuild, mustGetBuild, getChampions};
