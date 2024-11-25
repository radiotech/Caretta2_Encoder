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
exports.connectSerial = exports.findPort = exports.portToConfig = exports.labelToPort = exports.portToLabel = exports.getPorts = void 0;
const serialport_1 = require("serialport");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const Util_1 = require("./Util");
const portLabelKeys = [
    { key: 'path', label: 'Path' },
    { key: 'locationId', label: 'Location' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'serialNumber', label: 'Serial Number' },
    { key: 'vendorId', label: 'Vendor' },
    { key: 'productId', label: 'Product' },
];
let ports = [];
const refreshRateLimit = 300;
let lastRefreshTime = 0;
const refreshPorts = (logPrefix = '') => __awaiter(void 0, void 0, void 0, function* () {
    if (new Date().getTime() - lastRefreshTime < refreshRateLimit) {
        return;
    }
    try {
        let linuxPorts = [];
        try {
            linuxPorts = (yield Promise.all((yield util_1.promisify(fs.readdir)('/dev/serial/by-path')).map((locationId) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    return {
                        path: (yield util_1.promisify(fs.readlink)(`/dev/serial/by-path/${locationId}`)).split('/').pop().trim(),
                        locationId,
                    };
                }
                catch (e) { }
                return undefined;
            })))).filter(x => x !== undefined && x.path.length > 0 && x.locationId.length > 0);
        }
        catch (e) { }
        console.log(typeof serialport_1.SerialPort);
        console.log(serialport_1.SerialPort === null || serialport_1.SerialPort === void 0 ? void 0 : serialport_1.SerialPort.list);
        ports = (yield serialport_1.SerialPort.list()).map(x => {
            portLabelKeys.forEach(y => {
                if (typeof x[y.key] === 'string') {
                    x[y.key] = x[y.key].replace(/[,:]/g, '-').trim();
                    if (x[y.key].length === 0) {
                        x[y.key] = undefined;
                    }
                }
            });
            if (x.locationId === undefined) {
                let linuxPort = linuxPorts.filter(y => x.path === y.path)[0];
                if (linuxPort !== undefined) {
                    x.locationId = linuxPort.locationId;
                }
            }
            return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ path: x.path }, (x.locationId === undefined ? {} : { locationId: x.locationId })), (x.manufacturer === undefined ? {} : { manufacturer: x.manufacturer })), (x.serialNumber === undefined ? {} : { serialNumber: x.serialNumber })), (x.vendorId === undefined ? {} : { vendorId: x.vendorId })), (x.productId === undefined ? {} : { productId: x.productId }));
        });
        lastRefreshTime = new Date().getTime();
    }
    catch (e) {
        console.log(e);
        console.error(`${logPrefix}Failed to list connected serial devices`);
    }
});
const getPorts = () => __awaiter(void 0, void 0, void 0, function* () {
    yield refreshPorts();
    return ports;
});
exports.getPorts = getPorts;
const portToLabel = (port) => {
    let result = portLabelKeys.map(x => port[x.key] === undefined ? undefined : `${x.label}: ${port[x.key]}`).filter(x => x !== undefined).join(', ');
    return result.length === 0 ? '-' : result;
};
exports.portToLabel = portToLabel;
const labelToPort = (label) => {
    let parsedLabel = {};
    label.split(',').map(x => x.split(':')).filter(x => x.length === 2).forEach(x => { parsedLabel[x[0].trim()] = x[1].trim(); });
    let parsedPort = {};
    portLabelKeys.forEach(x => {
        if (parsedLabel[x.label] !== undefined) {
            parsedPort[x.key] = parsedLabel[x.label];
        }
    });
    if (parsedPort.path === undefined && parsedPort.locationId === undefined) {
        return undefined;
    }
    return parsedPort;
};
exports.labelToPort = labelToPort;
const portToConfig = (port) => JSON.stringify(port === undefined ? {} : port.locationId === undefined ? { path: port.path } : { locationId: port.locationId });
exports.portToConfig = portToConfig;
const findPort = (port) => __awaiter(void 0, void 0, void 0, function* () {
    yield refreshPorts();
    let results = ports.filter(x => port.locationId === undefined ? port.path === x.path : port.locationId === x.locationId);
    return results[Math.floor(Math.random() * results.length)];
});
exports.findPort = findPort;
const connectSerial = ({ deviceLabel, port: portConfig, connectionConfig, parserConfig, minStepDelay = 0, delimiter = '\r', deviceReadyTest, deviceReadyTimeout = deviceReadyTest === undefined ? 10 : 1000, onOpen = () => __awaiter(void 0, void 0, void 0, function* () { }), onStep, onData = () => __awaiter(void 0, void 0, void 0, function* () { }), }) => {
    if (deviceReadyTest === undefined) {
        deviceReadyTest = () => false;
    }
    const connect = () => __awaiter(void 0, void 0, void 0, function* () {
        let port;
        let retry = (updatedSerialConfig) => {
            if (port !== undefined && port.isOpen) {
                port.close();
            }
            if (updatedSerialConfig != undefined) {
                if (updatedSerialConfig.connectionConfig != undefined) {
                    connectionConfig = updatedSerialConfig.connectionConfig;
                }
                if (updatedSerialConfig.deviceReadyTest != undefined) {
                    deviceReadyTest = updatedSerialConfig.deviceReadyTest;
                }
                if (updatedSerialConfig.deviceReadyTimeout != undefined) {
                    deviceReadyTimeout = updatedSerialConfig.deviceReadyTimeout;
                }
                if (updatedSerialConfig.parserConfig != undefined) {
                    parserConfig = updatedSerialConfig.parserConfig;
                }
            }
            setTimeout(connect, 2000);
            retry = () => { };
        };
        let resolvedPortConfig = (yield exports.findPort(portConfig));
        if (resolvedPortConfig === undefined || resolvedPortConfig.path === undefined) {
            console.error(`No serial ports could be found that match the configuration provided${deviceLabel === undefined ? '' : ` for device ${deviceLabel}`}: ${JSON.stringify(portConfig)}`);
            retry();
            return;
        }
        port = new serialport_1.SerialPort(Object.assign({ path: resolvedPortConfig.path }, connectionConfig));
        let parser = port.pipe(new serialport_1.ReadlineParser(parserConfig));
        let ready = true;
        let readyTimeout = undefined;
        let writeQueue = [];
        const markReady = () => {
            clearTimeout(readyTimeout);
            ready = true;
            processWriteQueue();
        };
        const processWriteQueue = () => __awaiter(void 0, void 0, void 0, function* () {
            if (ready && writeQueue.length > 0) {
                ready = false;
                let nextCommand = writeQueue.shift();
                port.write(`${nextCommand.command}${delimiter}`);
                readyTimeout = setTimeout(markReady, deviceReadyTimeout);
                yield new Promise(accept => port.drain(() => accept()));
                nextCommand.callback();
            }
        });
        let write = (...commands) => new Promise(resolve => {
            if (commands.length == 1 && typeof commands[0] == 'object') {
                port.update(commands[0]);
                resolve();
            }
            else if (commands.length > 0) {
                writeQueue.push(...(commands.map((x, i) => ({ command: x, callback: () => {
                        if (i === commands.length - 1) {
                            resolve();
                        }
                    } }))));
                processWriteQueue();
            }
        });
        port.on('error', (err) => {
            console.error(`Serial connection error${deviceLabel === undefined ? '' : ` for device ${deviceLabel}`}:`);
            console.error(err);
            retry();
        });
        port.on('close', () => {
            console.error(`Serial connection closed${deviceLabel === undefined ? '' : ` for device ${deviceLabel}`}`);
            retry();
        });
        port.once('open', () => __awaiter(void 0, void 0, void 0, function* () {
            console.log(`Serial connection opened${deviceLabel === undefined ? '' : ` for device ${deviceLabel}`}`);
            yield onOpen(write, retry);
            if (onStep !== undefined) {
                while (port.isOpen) {
                    let stepStartTime = new Date().getTime();
                    yield onStep(write, retry);
                    yield Util_1.wait(Math.max(1, minStepDelay - new Date().getTime() + stepStartTime));
                }
            }
        }));
        parser.on('data', (data) => {
            data = `${data}`;
            if (deviceReadyTest(data)) {
                markReady();
            }
            else {
                onData(data, write, retry);
            }
        });
    });
    connect();
};
exports.connectSerial = connectSerial;
