const {app, BrowserWindow, ipcMain} = require("electron");
const path = require("path");
const fs = require("fs");
// if (process.env.NODE_ENV !== "development") {
// 	__dirname = path.join(__dirname, "resources/app");
// }
const configFolder = path.join(__dirname, "config");
const configFile = path.join(__dirname, "config/config.json");
if (!fs.existsSync(path.join(__dirname, "config")))
	fs.mkdirSync(configFolder);
if (!fs.existsSync(configFile)) {
	fs.writeFileSync(configFile, JSON.stringify({leaguePath: ""}));
}

let mainWindow = null;


async function main() {
	mainWindow = new BrowserWindow({
		height: 600,
		width: 500,
		title: "Set Me Up",
		center: true,
		autoHideMenuBar: true,
		webPreferences: {nodeIntegration: true},
	});
	await mainWindow.loadFile(path.join(__dirname, "views/index.html"));
	mainWindow.on("ready-to-show", mainWindow.show);

}

ipcMain.on("app-quit", () => {
	process.exit(0);
});
app.on("ready", main);
