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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
const setup_util_1 = require("./setup_util");
let devMode = process.argv.slice(2).some(x => ['--dev', '-d'].some(y => x.trim() === y));
let isChild = process.argv.slice(2).some(x => x.trim() === '--run-as-child');
if (process.cwd().indexOf('scripts') === process.cwd().length - 7) {
    process.chdir('..');
}
let moduleNames = fs.readdirSync('./').filter(x => fs.existsSync(path.resolve(`./${x}/scripts`)));
let modules = {};
moduleNames.forEach(name => {
    modules[name] = require(path.resolve(`./${name}/scripts/setup`)).setup;
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    let installedModules = [];
    for (let i = 0; i < moduleNames.length; i++) {
        if ((yield modules[moduleNames[i]].getState()).installed) {
            installedModules.push(moduleNames[i]);
        }
    }
    let noClient = installedModules.every(x => x !== 'client');
    if (devMode && setup_util_1.os === 'other') {
        console.log('Running in development mode is not supported for the current operating system, running in production mode instead');
        devMode = false;
    }
    if (devMode || isChild || noClient) {
        let client = (yield Promise.all(installedModules.map((module) => __awaiter(void 0, void 0, void 0, function* () {
            let x = yield modules[module].run(devMode);
            if (x.error !== undefined) {
                console.error(`[error] ${x.error}`);
            }
            return { module, process: x.process };
        })))).filter(x => x.module === 'client')[0];
        if (devMode) {
            [
                { name: 'scripts', path: './scripts' },
                ...installedModules.map(x => ({ name: `${x} scripts`, path: `./${x}/scripts` })),
                ...installedModules.filter(x => x !== 'client').map(x => ({ name: x, path: `./${x}` })),
            ].forEach(env => {
                try {
                    setup_util_1.runInCurrentTerminal(env.path, [`tsc${setup_util_1.os === 'windows' ? '.cmd' : ''}`, '--watch'], `[${env.name}] `);
                }
                catch (e) {
                    console.error(`Failed to run tsc using path ${env.path}`);
                }
            });
        }
        else if (noClient) {
        }
        else {
            if (client === undefined) {
                console.error('Failed to launch child processes');
                client = { module: 'client', process: undefined };
            }
            if (client.process === undefined) {
                setup_util_1.killProcessGroup();
            }
            else {
                client.process.on('exit', () => {
                    setup_util_1.killProcessGroup();
                });
            }
        }
    }
    else {
        let child = child_process.spawn('node', ['launch.js', '--run-as-child'], {
            cwd: './scripts',
            detached: true,
            windowsHide: true,
        });
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
    }
}))();
