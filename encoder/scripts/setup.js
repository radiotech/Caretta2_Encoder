"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.setup = void 0;
var setup_util_1 = require("../../scripts/setup_util");
var fs = require("fs");
var path = require("path");
var dotenv = require("dotenv");
var child_process = require("child_process");
// Define an id and title for this module so that these values can be updated easily
var moduleID = 'encoder'; // This should match the module folder name
var moduleTitle = 'Encoder'; // This should be capitalized like a title
// Store this module's directory in a variable for later use
var dir = path.resolve("./" + moduleID);
// Define and export a setup object for this module
exports.setup = {
    // Define a getter for the module's properties
    getProps: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, ({
                    id: moduleID,
                    name: moduleTitle + " Module",
                    description: "This module allows the system to interface with a US Digital S1 Optical Shaft Encoder connected through a USB4 Encoder Data Acquisition USB Device.",
                    installable: setup_util_1.os === 'windows',
                    order: 30,
                    format: {
                        proxy_server: {
                            name: 'Proxy Server',
                            description: "The ip address and port of a proxy server instance. For example, localhost:400 and 127.0.0.1:25565 are acceptable values.",
                            order: 0,
                            visibility: 'networked',
                            "default": 'localhost:25565',
                            type: 'string',
                            regex: '^(?:(?:\\d{1,3}\\.){3}\\d{1,3}|localhost):\\d{1,5}$',
                            regexMessage: 'Please enter a server address consisting of an IP address and a port. For example, "localhost:25565" and "192.168.1.1:25565" would be valid values.'
                        },
                        sample_frequency: {
                            name: 'Sample Frequency',
                            description: "The frequency (in Hz) at which data is transmitted from this module to the client. If the client is not installed on this device, a value of 10 or less is recommended. If the client is installed on this device, a value of 100 may be more appropriate.",
                            order: 1,
                            visibility: 'networked',
                            "default": { local: '100', networked: '10' },
                            type: 'string',
                            regex: '^(1000|\\d{0,3}(\\.\\d+)?)$',
                            regexMessage: 'Please enter a frequency value in hertz between 0 and 1000.'
                        },
                        cycles_per_revolution: {
                            name: 'Cycles per Revolution',
                            description: "The number of quadrature cycles per revolution for this optical encoder.",
                            order: 2,
                            visibility: true,
                            "default": '360',
                            type: 'select',
                            options: [32, 50, 96, 100, 192, 200, 250, 256, 360, 400, 500, 512, 540, 720, 800, 900, 1000, 1024, 1250, 2000, 2048, 2500, 4000, 4096, 5000].map(function (x) { return "" + x; })
                        }
                    }
                })];
        });
    }); },
    // Define a getter for the module's state
    getState: function () { return __awaiter(void 0, void 0, void 0, function () {
        var parsed_1;
        return __generator(this, function (_a) {
            // If the module is installed (.env file is present)
            if (fs.existsSync(path.resolve(dir, './.env'))) {
                try {
                    parsed_1 = dotenv.parse(fs.readFileSync(path.resolve(dir, './.env')));
                    if (['CARETTA_TOKEN', 'PROXY_SERVER', 'SAMPLE_FREQUENCY', 'CYCLES_PER_REVOLUTION'].every(function (x) { return parsed_1[x] !== undefined; })) {
                        return [2 /*return*/, {
                                installed: true,
                                token: parsed_1['CARETTA_TOKEN'],
                                proxy_server: parsed_1['PROXY_SERVER'],
                                sample_frequency: parsed_1['SAMPLE_FREQUENCY'],
                                cycles_per_revolution: parsed_1['CYCLES_PER_REVOLUTION']
                            }];
                    }
                }
                catch (e) { }
            }
            // Otherwise, return a state with installed set to false
            return [2 /*return*/, { installed: false }];
        });
    }); },
    // Define a setter for the module's state
    setState: function (state) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                if (state.installed) {
                    // If the module should be installed, create a .env file and run npm install and tsc
                    console.log("Installing the " + moduleTitle.toLowerCase() + " module");
                    fs.writeFileSync(path.resolve(dir, './.env'), "CARETTA_TOKEN=" + state.token + "\nPROXY_SERVER=" + state.proxy_server + "\nSAMPLE_FREQUENCY=" + parseFloat(state.sample_frequency) + "\nCYCLES_PER_REVOLUTION=" + parseFloat(state.cycles_per_revolution) + "\n");
                    child_process.spawnSync('npm', ['install', '--production', '--no-audit'], {
                        shell: true,
                        cwd: dir,
                        stdio: 'inherit',
                        windowsHide: true
                    });
                    child_process.spawnSync('tsc', [], {
                        shell: true,
                        cwd: dir,
                        stdio: 'inherit',
                        windowsHide: true
                    });
                }
                else {
                    // If the module should not be installed, remove the .env file if it exists
                    if (fs.existsSync(path.resolve(dir, './.env'))) {
                        console.log("Uninstalling the " + moduleTitle.toLowerCase() + " module");
                        fs.unlinkSync(path.resolve(dir, './.env'));
                    }
                }
            }
            catch (e) {
                // Handle any fs errors that occur
                console.error(e);
                return [2 /*return*/, { error: "[" + moduleTitle.toLowerCase() + "] An issue was encountered while updating a configuration file." }];
            }
            return [2 /*return*/, {}];
        });
    }); },
    run: function (devMode) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // Launch a child process in dev or production mode, return any errors that occur
            try {
                if (devMode) {
                    setup_util_1.runInNewTerminal(dir, ['npm', 'run', 'watch']);
                }
                else {
                    return [2 /*return*/, { process: setup_util_1.runInCurrentTerminal(dir, ["npm" + (setup_util_1.os === 'windows' ? '.cmd' : ''), 'start'], "[" + moduleTitle.toLowerCase() + "] ") }];
                }
                return [2 /*return*/, {}];
            }
            catch (e) {
                console.log(e);
                return [2 /*return*/, { error: "[" + moduleTitle.toLowerCase() + "] Module failed to launch" }];
            }
            return [2 /*return*/];
        });
    }); }
};
