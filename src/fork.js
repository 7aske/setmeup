const sources = require("./sources");
const fs = require("fs");
const net = require("net");

const SOCK_ADDR = process.env.SOCK_ADDR;

const source = process.argv[2];
const method = process.argv[3];
const champ = process.argv[4];
const role = process.argv[5];

const fun = sources[source][method];

fun(champ, role).then(res => {
	const socket = net.createConnection(SOCK_ADDR);
	socket.write(JSON.stringify(res));
	socket.end();
}).catch(err => {
	console.error(err);
});
