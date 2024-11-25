// Import required NPM modules
import * as child_process from 'child_process';
import {type as osType} from 'os';

// Define a range function to generate arrays of a given length
export const range = (length: number)=>{
    if(typeof length != 'number' || isNaN(length)){
        return [];
    }
    let res = [];
    for(let i = 0; i < length; i++){
        res[i] = i;
    }
    return res;
};

// Define a function to run a command in a new terminal window (Windows/Mac only)
export const runInNewTerminal = (cwd: string, command: string[])=>{
    command = os!=='mac'?command:['osascript','-e',`'tell application "Terminal" to activate'`,'-e',`'tell application "Terminal" to do script "cd \\"${cwd}\\"; ${command.join(' ').replace(/"/g,'//')}"'`];
    let subprocess = child_process.spawn(command[0],command.filter((x,i)=>i>0),{
        shell: true,
        cwd,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    subprocess.unref();
};

// Define a function to run a command in the current terminal window
export const runInCurrentTerminal = (cwd: string, command: string[], prefix: string)=>{
    // Spawn the child process
    let child = child_process.spawn(command[0],command.filter((x,i)=>i>0),{
        cwd,
        windowsHide: true,
    });
    // Buffer the stdout and stderr output from these processes
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let willClearBuffers = false;
    let clearBuffers = ()=>{
        if(!willClearBuffers){
            willClearBuffers = true;
            setTimeout(()=>{
                willClearBuffers = false;
                // When printing the output from the child process, include the provided prefix
                if(stdoutBuffer.trim().length>1){
                    console.log(`${prefix}${stdoutBuffer}`);
                }
                if(stderrBuffer.trim().length>1){
                    console.error(`[error] ${prefix}${stderrBuffer}`);
                }
                stdoutBuffer = '';
                stderrBuffer = '';
            },1000);
        }
    };
    child.stdout.on('data',(x)=>{
        stdoutBuffer += (x.toString() as string).replace(/\u001B/g,'');
        let lines = stdoutBuffer.split(/[\r\n]+/g);
        stdoutBuffer = lines[lines.length-1];
        lines.filter((x,i)=>i<lines.length-1).map(x=>x.trim()).filter(x=>x.length>1).forEach(x=>{
            console.log(`${prefix}${x}`);
        });
        clearBuffers();
    });
    child.stderr.on('data',(x)=>{
        stderrBuffer += (x.toString() as string).replace(/\u001B/g,'');
        let lines = stderrBuffer.split(/[\r\n]+/g);
        stderrBuffer = lines[lines.length-1];
        lines.filter((x,i)=>i<lines.length-1).map(x=>x.trim()).filter(x=>x.length>1).forEach(x=>{
            console.log(`[error] ${prefix}${x}`);
        });
        clearBuffers();
    });
    return child;
};

// Define a command to kill a child process
export const killProcessGroup = ()=>{
    if(os === 'windows'){
        child_process.spawnSync('taskkill',['/pid',`${process.pid}`,'/f','/t'],{windowsHide:true});
    } else {
        process.kill(-process.pid);
    }
};

// Define a function to make a random hex id of a given length
export const makeID = (length: number)=>range(length).map(()=>Math.floor(Math.random()*16).toString(16)).join('');

// Define a static default caretta token value for use by the setup script for all modules
export const defaultToken = {local: 'local', networked: makeID(8)};

// Identify the operating system of the current device
export const os: 'windows'|'mac'|'other' = (x=>x.indexOf('windows')>-1?'windows':x.indexOf('darwin')>-1?'mac':'other')(osType().toLowerCase());

// Define a default module state type (is extended in the state definitions for each module setup script)
export type ModuleState = {
    installed: boolean,
    token?: string,
};

export type installationType = 'local' | 'networked';

export type visibilityType<State> = installationType | true | ((s: State)=>installationType | boolean);

// Define a module props generic type to describe the setup properties and format of each module
export type ModuleProps<State extends ModuleState> = {
    id: string,
    name: string,
    description: string,
    installable: boolean,
    order: number,
    format: Record<keyof Omit<State,'installed'|'token'>, {
        name: string,
        description: string,
        order: number,
        visibility: visibilityType<State>,
        default: string | {local: string, networked: string},
        type: 'select',
        options: string[],
    } | {
        name: string,
        description: string,
        order: number,
        visibility: visibilityType<State>,
        default: string | {local: string, networked: string},
        type: 'string',
        regex: string,
        regexMessage: string,
    }>,
};

// Define a module setup script prototype
export type Module<State extends ModuleState> = {
    getProps: ()=>Promise<ModuleProps<State>>,
    getState: ()=>Promise<State>,
    setState: (s: State)=>Promise<{error?: string}>,
    run: (devMode?: boolean)=>Promise<{error?: string, process?: child_process.ChildProcess}>,
};
