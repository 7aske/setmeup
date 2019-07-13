const axios = require("axios");
const cheerio = require("cheerio");

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

function getSkillOrder(build) {
	return Array({"q": build.q["5"]}, {"w": build.w["5"]}, {"e": build.e["5"]}).sort((e1, e2) => {
		return Object.values(e1)[0] - Object.values(e2)[0];
	}).map(e => Object.keys(e)[0].toUpperCase());
}

async function getChampGGBuild(champ, role, rank) {
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
	const freqSpellStatSelectorQ = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(2) .skill-selections";
	const freqSpellStatSelectorW = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(3) .skill-selections";
	const freqSpellStatSelectorE = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(4) .skill-selections";
	const freqSpellStatSelectorR = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(2) .skill:nth-child(5) .skill-selections";

	const winSpellStatSelectorQ = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(2) .skill-selections";
	const winSpellStatSelectorW = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(3) .skill-selections";
	const winSpellStatSelectorE = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(4) .skill-selections";
	const winSpellStatSelectorR = "body .primary-hue .main-container .page-content .champion-area .row .skill-order:nth-child(5) .skill:nth-child(5) .skill-selections";

	const freqSkillTag = $(spellStatSelector);

	const freqSkillTagQ = $(freqSpellStatSelectorQ)[0];
	const freqSkillTagW = $(freqSpellStatSelectorW)[0];
	const freqSkillTagE = $(freqSpellStatSelectorE)[0];
	const freqSkillTagR = $(freqSpellStatSelectorR)[0];

	const freqSkillOrder = {
		q: getSkillUps(freqSkillTagQ),
		w: getSkillUps(freqSkillTagW),
		e: getSkillUps(freqSkillTagE),
		r: getSkillUps(freqSkillTagR),
		win_rate: freqSkillTag[0].next.next.children.filter(tag => {
			return tag.name === "strong";
		})[0].children[0].data,
		game_count: freqSkillTag[0].next.next.children.filter(tag => {
			return tag.name === "strong";
		})[1].children[0].data,
		order: "",
	};
	freqSkillOrder.order = getSkillOrder(freqSkillOrder);


	const winSkillTagQ = $(winSpellStatSelectorQ)[0];
	const winSkillTagW = $(winSpellStatSelectorW)[0];
	const winSkillTagE = $(winSpellStatSelectorE)[0];
	const winSkillTagR = $(winSpellStatSelectorR)[0];

	const winSkillOrder = {
		q: getSkillUps(winSkillTagQ),
		w: getSkillUps(winSkillTagW),
		e: getSkillUps(winSkillTagE),
		r: getSkillUps(winSkillTagR),
		win_rate: getWinRate(freqSkillTag[1].next.next),
		game_count: getGamesPlayed(freqSkillTag[1].next.next),
		order: "",
	};
	winSkillOrder.order = getSkillOrder(winSkillOrder);

	const allBuildContainersSelector = "body .primary-hue .main-container .page-content .champion-area .row .build-wrapper";
	const allBuildContainers = $(allBuildContainersSelector);

	const freqFullTag = allBuildContainers[0];
	const winFullTag = allBuildContainers[1];
	const freqStartTag = allBuildContainers[2];
	const winStartTag = allBuildContainers[3];

	const freqFullBuild = {
		name: freqBuildTitle,
		items: freqFullTag.children.filter(c => c.name === "a").map(tag => {
			const href = tag.attribs["href"];
			return href.substring(href.lastIndexOf("/") + 1);
		}),
		ids: freqFullTag.children.filter(c => c.name === "a").map(tag => {
			return tag.children.filter(i => i.name === "img")[0].attribs["data-id"];
		}),
		win_rate: freqFullTag.children.filter(c => c.name === "div")[0].children.filter(tag => {
			return tag.name === "strong";
		})[0].children[0].data,
		game_count: freqFullTag.children.filter(c => c.name === "div")[0].children.filter(tag => {
			return tag.name === "strong";
		})[1].children[0].data,

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
	return {
		role,
		title: `${champ} ${role}`,
		blocks: {freqStartBuild, winStartBuild, freqFullBuild, winFullBuild},
		skills: {freqSkillOrder, winSkillOrder},
	};
}

async function mustGetChampGGBuild(champ, role) {
	const leagues = ["platplus", "plat", "gold", "silver", "bronze"];
	for (let i = 0; i < leagues.length; i++) {
		try {
			return await getChampGGBuild(champ, role, leagues[i]);
		} catch (e) {
			if (i < leagues.length - 1) {
				console.error(`Cannot get build for ${champ.name} ${role} ${leagues[i]} - trying ${leagues[i + 1]}`);
			} else {
				console.error(`Cannot get any builds for ${champ.name} ${role}`);
			}
		}
	}
	return {};
}

async function getChampGGChampions() {
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

module.exports = {getChampGGBuild, mustGetChampGGBuild, getChampGGChampions};
