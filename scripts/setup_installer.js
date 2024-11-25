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
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = __importStar(require("child_process"));
let fs = require('fs');
if (process.cwd().indexOf('scripts') === process.cwd().length - 7) {
    process.chdir('..');
}
if (!fs.existsSync('./node_modules')) {
    console.log('Loading installer dependencies');
    child_process.spawnSync('npm', ['install', '--no-audit'], {
        shell: true,
        cwd: '.',
        stdio: 'inherit',
        windowsHide: true,
    });
}
let child = child_process.spawn('node', ['setup.js', ...process.argv.slice(2)], {
    detached: true,
    cwd: './scripts',
    windowsHide: true,
});
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
