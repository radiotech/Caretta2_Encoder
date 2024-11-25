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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = void 0;
const setup_util_1 = require("../../scripts/setup_util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const child_process = __importStar(require("child_process"));
let moduleID = 'client';
let moduleTitle = 'Client';
let dir = path.resolve(`./${moduleID}`);
exports.setup = {
    getProps: () => __awaiter(void 0, void 0, void 0, function* () {
        return ({
            id: moduleID,
            name: `${moduleTitle} Module`,
            description: 'The client module provides an interface into the Caretta2 system. Only one client instance can be connected to the system at a time, although this single client instance can connect to any number of proxy servers and hardware control modules.',
            installable: true,
            order: -2,
            format: {
                proxy_servers: {
                    name: 'Proxy Servers',
                    description: 'A list of proxy servers for the client module to connect to.',
                    order: 0,
                    visibility: 'networked',
                    default: 'localhost:25565',
                    type: 'string',
                    regex: '^(?:(?:(?:\\d{1,3}\\.){3}\\d{1,3}|localhost):\\d{1,5}\\s*,\\s*)*(?:(?:\\d{1,3}\\.){3}\\d{1,3}|localhost):\\d{1,5}$',
                    regexMessage: 'Please enter a comma-separated list of server addresses consisting of IP addresses and ports. For example, "localhost:25565, 192.168.1.1:25565" would be a valid value.',
                },
            },
        });
    }),
    getState: () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (fs.existsSync(path.resolve(dir, './.env'))) {
            try {
                let parsed = dotenv.parse(fs.readFileSync(path.resolve(dir, './.env')));
                if (['CARETTA_TOKEN', 'PROXY_SERVERS'].every(x => parsed[x] !== undefined)) {
                    return {
                        installed: true,
                        token: parsed['CARETTA_TOKEN'],
                        proxy_servers: parsed['PROXY_SERVERS'].split(',').map(x => x.trim()).filter(x => x.length > 0).join(','),
                    };
                }
            }
            catch (e) { }
        }
        return { installed: false };
    }),
    setState: (state) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (state.installed) {
                console.log(`Installing the ${moduleTitle.toLowerCase()} module`);
                fs.writeFileSync(path.resolve(dir, './.env'), `CARETTA_TOKEN=${state.token}\nPROXY_SERVERS=${state.proxy_servers.split(',').map(x => x.trim()).filter(x => x.length > 0).join(',')}\n`);
                child_process.spawnSync('npm', ['install', '--no-audit', '--legacy-peer-deps'], {
                    shell: true,
                    cwd: dir,
                    stdio: 'inherit',
                    windowsHide: true,
                });
            }
            else {
                if (fs.existsSync(path.resolve(dir, './.env'))) {
                    console.log(`Uninstalling the ${moduleTitle.toLowerCase()} module`);
                    fs.unlinkSync(path.resolve(dir, './.env'));
                }
            }
        }
        catch (e) {
            console.error(e);
            return { error: `[${moduleTitle.toLowerCase()}] An issue was encountered while updating a configuration file.` };
        }
        return {};
    }),
    run: (devMode) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (devMode) {
                setup_util_1.runInNewTerminal(dir, ['npm', 'run', 'watch']);
            }
            else {
                return { process: setup_util_1.runInCurrentTerminal(dir, [`npm${setup_util_1.os === 'windows' ? '.cmd' : ''}`, 'start'], `[${moduleTitle.toLowerCase()}] `) };
            }
            return {};
        }
        catch (e) {
            console.log(e);
            return { error: `[${moduleTitle.toLowerCase()}] Module failed to launch` };
        }
    }),
};
