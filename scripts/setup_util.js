"use strict";
exports.__esModule = true;
exports.os = exports.defaultToken = exports.makeID = exports.killProcessGroup = exports.runInCurrentTerminal = exports.runInNewTerminal = exports.range = void 0;
// Import required NPM modules
var child_process = require("child_process");
var os_1 = require("os");
// Define a range function to generate arrays of a given length
var range = function (length) {
    if (typeof length != 'number' || isNaN(length)) {
        return [];
    }
    var res = [];
    for (var i = 0; i < length; i++) {
        res[i] = i;
    }
    return res;
};
exports.range = range;
// Define a function to run a command in a new terminal window (Windows/Mac only)
var runInNewTerminal = function (cwd, command) {
    command = exports.os !== 'mac' ? command : ['osascript', '-e', "'tell application \"Terminal\" to activate'", '-e', "'tell application \"Terminal\" to do script \"cd \\\"" + cwd + "\\\"; " + command.join(' ').replace(/"/g, '//') + "\"'"];
    var subprocess = child_process.spawn(command[0], command.filter(function (x, i) { return i > 0; }), {
        shell: true,
        cwd: cwd,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    subprocess.unref();
};
exports.runInNewTerminal = runInNewTerminal;
// Define a function to run a command in the current terminal window
var runInCurrentTerminal = function (cwd, command, prefix) {
    // Spawn the child process
    var child = child_process.spawn(command[0], command.filter(function (x, i) { return i > 0; }), {
        cwd: cwd,
        windowsHide: true
    });
    // Buffer the stdout and stderr output from these processes
    var stdoutBuffer = '';
    var stderrBuffer = '';
    var willClearBuffers = false;
    var clearBuffers = function () {
        if (!willClearBuffers) {
            willClearBuffers = true;
            setTimeout(function () {
                willClearBuffers = false;
                // When printing the output from the child process, include the provided prefix
                if (stdoutBuffer.trim().length > 1) {
                    console.log("" + prefix + stdoutBuffer);
                }
                if (stderrBuffer.trim().length > 1) {
                    console.error("[error] " + prefix + stderrBuffer);
                }
                stdoutBuffer = '';
                stderrBuffer = '';
            }, 1000);
        }
    };
    child.stdout.on('data', function (x) {
        stdoutBuffer += x.toString().replace(/\u001B/g, '');
        var lines = stdoutBuffer.split(/[\r\n]+/g);
        stdoutBuffer = lines[lines.length - 1];
        lines.filter(function (x, i) { return i < lines.length - 1; }).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 1; }).forEach(function (x) {
            console.log("" + prefix + x);
        });
        clearBuffers();
    });
    child.stderr.on('data', function (x) {
        stderrBuffer += x.toString().replace(/\u001B/g, '');
        var lines = stderrBuffer.split(/[\r\n]+/g);
        stderrBuffer = lines[lines.length - 1];
        lines.filter(function (x, i) { return i < lines.length - 1; }).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 1; }).forEach(function (x) {
            console.log("[error] " + prefix + x);
        });
        clearBuffers();
    });
    return child;
};
exports.runInCurrentTerminal = runInCurrentTerminal;
// Define a command to kill a child process
var killProcessGroup = function () {
    if (exports.os === 'windows') {
        child_process.spawnSync('taskkill', ['/pid', "" + process.pid, '/f', '/t'], { windowsHide: true });
    }
    else {
        process.kill(-process.pid);
    }
};
exports.killProcessGroup = killProcessGroup;
// Define a function to make a random hex id of a given length
var makeID = function (length) { return exports.range(length).map(function () { return Math.floor(Math.random() * 16).toString(16); }).join(''); };
exports.makeID = makeID;
// Define a static default caretta token value for use by the setup script for all modules
exports.defaultToken = { local: 'local', networked: exports.makeID(8) };
// Identify the operating system of the current device
exports.os = (function (x) { return x.indexOf('windows') > -1 ? 'windows' : x.indexOf('darwin') > -1 ? 'mac' : 'other'; })(os_1.type().toLowerCase());
