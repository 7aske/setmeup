function getDefaultConsumables() {
	return {
		"hideIfSummonerSpell": "",
		"items":
			[
				{
					"count": 1,
					"id": "2003",
				},
				{
					"count": 1,
					"id": "2055",
				},
				{
					"count": 1,
					"id": "2031",
				},
				{
					"count": 1,
					"id": "2047",
				},
				{
					"count": 1,
					"id": "2033",
				},
				{
					"count": 1,
					"id": "2138",
				},
				{
					"count": 1,
					"id": "2139",
				},
				{
					"count": 1,
					"id": "2140",
				},
			],
		"showIfSummonerSpell": "",
		"type": "Consumables",
	};
}

function getDefaultTrinkets() {
	return {
		"hideIfSummonerSpell": "",
		"items": [
			{
				"count": 1,
				"id": "3340",
			},
			{
				"count": 1,
				"id": "3363",
			},
			{
				"count": 1,
				"id": "3364",
			},
		],
		"showIfSummonerSpell": "",
		"type": "Trinkets",
	};
}

module.exports = {getDefaultTrinkets, getDefaultConsumables};
