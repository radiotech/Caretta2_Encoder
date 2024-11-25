"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = __importStar(require("child_process"));
const http = __importStar(require("http"));
const express_1 = __importDefault(require("express"));
const bodyParser = __importStar(require("body-parser"));
const path = __importStar(require("path"));
const open_1 = __importDefault(require("open"));
const fs = __importStar(require("fs"));
const os_1 = require("os");
const setup_util_1 = require("./setup_util");
if (process.cwd().indexOf('scripts') === process.cwd().length - 7) {
    process.chdir('..');
}
let moduleNames = fs.readdirSync('./').filter(x => fs.existsSync(path.resolve(`./${x}/scripts`)));
let modules = {};
moduleNames.forEach(name => {
    modules[name] = require(path.resolve(`./${name}/scripts/setup`)).setup;
});
let launchOnClose = false;
let launched = false;
let app = express_1.default();
app.use(bodyParser.json());
app.use('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () { res.json(yield status(req.body)); }));
app.use('/submit', (req, res) => __awaiter(void 0, void 0, void 0, function* () { res.json(yield submit(req.body)); }));
app.use('/close', (req, res) => { res.json(close()); });
app.use(express_1.default.static('scripts/hosted'));
app.use('*', (req, res) => { res.sendFile(path.resolve('./scripts/hosted/index.html')); });
let server = http.createServer(app);
let port = 2000;
server.on('error', (e) => {
    if (port < 3000 && e.code === 'EADDRINUSE') {
        port = port + 1;
        server.listen(port);
    }
    else {
        console.log(JSON.stringify(e, null, 2));
        console.error('An error was encountered. Please see the logs printed above for additional details.');
    }
});
server.on('listening', () => {
    console.log(`An instance of the Caretta2 setup GUI server is running on port ${port}`);
    open_1.default(`http://localhost:${port}`);
});
server.listen(port);
function status(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = {
            moduleNames,
            moduleProps: {},
            moduleStates: {},
        };
        yield Promise.all(moduleNames.map((name) => __awaiter(this, void 0, void 0, function* () {
            result.moduleProps[name] = yield modules[name].getProps();
            result.moduleProps[name].format.token = {
                name: 'Caretta Token',
                description: 'A value shared by all modules connected to a single Caretta2 setup.',
                order: -1,
                visibility: 'networked',
                default: setup_util_1.defaultToken,
                type: 'string',
                regex: '^[a-zA-Z0-9_\\-]*$',
                regexMessage: 'Please enter a string containing only the following characters: a-z, A-Z, 0-9, _, and -.',
            };
            if (data.states !== undefined && name in data.states) {
                Object.keys(result.moduleProps[name].format).forEach(x => {
                    if (typeof result.moduleProps[name].format[x].visibility == 'function') {
                        result.moduleProps[name].format[x].visibility = result.moduleProps[name].format[x].visibility(data.states[name]);
                    }
                });
            }
            result.moduleStates[name] = yield modules[name].getState();
        })));
        return result;
    });
}
function submit(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = {};
        if (typeof data.shortcut !== 'boolean' || typeof data.launch !== 'boolean' || typeof data.states !== 'object') {
            result.error = 'An error occurred while communicating with the installation server.';
        }
        else {
            yield Promise.all(moduleNames.map((name) => __awaiter(this, void 0, void 0, function* () {
                let x = yield modules[name].setState(data.states[name]);
                if (x.error !== undefined) {
                    result.error = `${result.error === undefined ? '' : `${result.error} AND `}${x.error}`;
                }
            })));
        }
        if (result.error === undefined) {
            if (data.shortcut) {
                try {
                    let startScriptBodyBash = `#!/bin/bash\ncd '${path.resolve('.')}'\nnpm start\nread -p "Press any key to exit..."\n`;
                    let setupScriptBodyBash = `#!/bin/bash\ncd '${path.resolve('.')}'\nnpm run setup\nread -p "Press any key to exit..."\n`;
                    if (setup_util_1.os === 'windows') {
                        fs.writeFileSync(path.resolve('./scripts/start.bat'), `cd ${path.resolve('.')}\r\nnpm start\r\npause\r\n`);
                        fs.writeFileSync(path.resolve('./scripts/setup.bat'), `cd ${path.resolve('.')}\r\nnpm run setup\r\npause\r\n`);
                        child_process.spawnSync(`wscript.exe`, ['./scripts/create_desktop_shortcut.vbs'], { windowsHide: true });
                    }
                    else if (setup_util_1.os === 'mac') {
                        let startShortcutPath = path.resolve(os_1.homedir(), './Desktop/Caretta2.command');
                        let setupShortcutPath = path.resolve(os_1.homedir(), './Desktop/Caretta2 Setup.command');
                        fs.writeFileSync(startShortcutPath, startScriptBodyBash);
                        fs.writeFileSync(setupShortcutPath, setupScriptBodyBash);
                        fs.chmodSync(startShortcutPath, 0o777);
                        fs.chmodSync(setupShortcutPath, 0o777);
                    }
                    else {
                        [
                            { type: 'start', name: 'Caretta2', body: startScriptBodyBash },
                            { type: 'setup', name: 'Caretta2 Setup', body: setupScriptBodyBash },
                        ].forEach(x => {
                            let shortcutPath = path.resolve(`./scripts/${x.type}`);
                            fs.writeFileSync(shortcutPath, x.body);
                            fs.chmodSync(shortcutPath, 0o777);
                            let desktopEntry = `[Desktop Entry]\nVersion=1.0\nName=${x.name}\nExec="${shortcutPath}"\nIcon=${path.resolve('./scripts/Caretta2.png')}\nTerminal=true\nType=Application\n`;
                            ['./Desktop', './.local/share/applications'].forEach(y => {
                                let shortcutPath = path.resolve(os_1.homedir(), `${y}/${x.name.toLowerCase().replace(/ /g, '_')}.desktop`);
                                fs.writeFileSync(shortcutPath, desktopEntry);
                                fs.chmodSync(shortcutPath, 0o777);
                            });
                        });
                    }
                }
                catch (e) {
                    console.error('An error was encountered while creating a desktop shortcut:');
                    console.error(e);
                }
            }
            launchOnClose = data.launch && data.states['client'].installed;
        }
        return result;
    });
}
function close() {
    if (launchOnClose && !launched) {
        launched = true;
        server.close();
        require('./launch');
    }
    if (!launchOnClose) {
        setTimeout(() => {
            process.exit();
        }, 1000);
    }
    return {};
}
