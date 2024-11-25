"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalize = exports.wait = void 0;
const wait = (timeout) => {
    return new Promise(resolve => {
        setTimeout(() => { resolve(); }, timeout);
    });
};
exports.wait = wait;
const capitalize = (text) => text.substr(0, 1).toUpperCase() + text.substr(1);
exports.capitalize = capitalize;
