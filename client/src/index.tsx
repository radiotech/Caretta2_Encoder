import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Router from './Router';
import './util/Sockets';
import Global from './components/global/Global';
import {ipcRenderer} from 'electron';

(window as any).React = React;
(window as any).react = React;

// Store console logs in memory
let c = console as any;
c.output = [];

c.log_ = c.log.bind(c);
c.log = function(){
    c.output.push({type: 'log', data: Array.from(arguments)});
    c.log_.apply(c, arguments);
};

c.debug_ = c.debug.bind(c);
c.debug = function(){
    c.output.push({type: 'debug', data: Array.from(arguments)});
    c.debug_.apply(c, arguments);
};

c.error_ = c.error.bind(c);
c.error = function(){
    c.output.push({type: 'error', data: Array.from(arguments)});
    c.error_.apply(c, arguments);
};

c.info_ = c.info.bind(c);
c.info = function(){
    c.output.push({type: 'info', data: Array.from(arguments)});
    c.info_.apply(c, arguments);
};

c.warn_ = c.warn.bind(c);
c.warn = function(){
    c.output.push({type: 'warn', data: Array.from(arguments)});
    c.warn_.apply(c, arguments);
};

c.trace_ = c.trace.bind(c);
c.trace = function(){
        let x = {};
        Error.captureStackTrace(x,c.trace);
        c.output.push({type: 'trace', data: [x]});
    c.trace_.apply(c, arguments);
};

c.assert_ = c.assert.bind(c);
c.assert = function(){
    if(arguments[0]==false){
        let x = {};
        Error.captureStackTrace(x,c.assert);
        c.output.push({type: 'assert', data: [x,...Array.from(arguments)]});
    }
    c.assert_.apply(c, arguments);
};

window.addEventListener('error', e=>{
    c.output.push({type: 'uncaughtError', data: [e]});
});

window.addEventListener('unhandledrejection', e=>{
    c.output.push({type: 'uncaughtPromiseRejection', data: [e]});
});

ipcRenderer.on('paste',(e, clipboardLines: string[])=>{
    try {
        const tab = ()=>{
            const inputElements = Array.from(document.getElementsByTagName('input')).filter(x=>!x.disabled);
            const nextIndex = inputElements.findIndex(x=>x==document.activeElement)+1;
            if(nextIndex > 0 && nextIndex < inputElements.length){
                inputElements[nextIndex].focus();
            }
        }
        for(let i = 0; i < clipboardLines.length; i++){
            if(i>0){
                tab();
            }
            if(document.activeElement != null){
                let nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
                nativeInputValueSetter.call(document.activeElement, clipboardLines[i]);
                let inputEvent = new Event('input', { bubbles: true});
                document.activeElement.dispatchEvent(inputEvent);
            }
        }
    } catch(e){
        console.error('Paste error',e)
    }
});

// This is the program's root React component
const Index: React.FC = () => {
    // Include the global state provider as a parent of all other app components
    return <div>
        <Router />
        <Global />
    </div>;
}

// This is the program's main react entry point
ReactDOM.render(<Index />, document.getElementById('root'));
