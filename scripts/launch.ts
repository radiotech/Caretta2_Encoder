// Import required NPM modules
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import {Module, os, runInCurrentTerminal, killProcessGroup} from './setup_util';

// Read in command line arguments - if --dev or -d are present, run in dev mode
let devMode = process.argv.slice(2).some(x=>['--dev','-d'].some(y=>x.trim()===y));
let isChild = process.argv.slice(2).some(x=>x.trim()==='--run-as-child');

// Switch to the main Caretta2 directory if called from the scripts directory
if(process.cwd().indexOf('scripts')===process.cwd().length-7){
    process.chdir('..');
}

// Identify the names of all modules that can be installed
let moduleNames = fs.readdirSync('./').filter(x=>fs.existsSync(path.resolve(`./${x}/scripts`)));

// Create a map relating module names to module setup objects
let modules: Record<string, Module<any>> = {};
moduleNames.forEach(name=>{
    modules[name] = require(path.resolve(`./${name}/scripts/setup`)).setup;
});

(async ()=>{
    // Collect a list of installed modules
    let installedModules: string[] = [];
    for(let i = 0; i < moduleNames.length; i++){
        if((await modules[moduleNames[i]].getState()).installed){
            installedModules.push(moduleNames[i]);
        }
    }

    // Determine whether the client module is installed
    // The following applies when dev mode is false
    // When the client is installed, closing the client window should end the other module processes
    // In this case, closing the terminal window should do nothing
    // To achieve this we need to spawn a detached windowless child process which spawns the other modules
    // This process listens to the client module process and closes the other processes when the client is closed
    // When no client is installed, the child processes are spawned as children of the current process
    // When the current process ends, these attached child processes will also end
    let noClient = installedModules.every(x=>x!=='client');
    
    // If the os is not windows or mac, launching new windows may fail - dev mode is not supported
    if(devMode && os==='other'){
        console.log('Running in development mode is not supported for the current operating system, running in production mode instead');
        devMode = false;
    }

    // In the case that we are not in dev mode, this is not a child process, and the client is installed, we need to create a child process instead of launching each module
    if(devMode || isChild || noClient){
        // Collect a set of child process references
        let client = (await Promise.all(installedModules.map(async module=>{
            let x = await modules[module].run(devMode);
            if(x.error !== undefined){
                console.error(`[error] ${x.error}`);
            }
            return {module, process: x.process};
        }))).filter(x=>x.module==='client')[0];

        if(devMode){
            // Run tsc watch for each installed module (and their scripts folder? - and the main scripts folder?)
            // Include a prefix for each.. ensure that output is clean
            [
                {name: 'scripts', path: './scripts'},
                ...installedModules.map(x=>({name: `${x} scripts`, path: `./${x}/scripts`})),
                ...installedModules.filter(x=>x!=='client').map(x=>({name: x, path: `./${x}`})),
            ].forEach(env=>{
                try {
                    runInCurrentTerminal(env.path,[`tsc${os==='windows'?'.cmd':''}`,'--watch'],`[${env.name}] `);
                } catch(e){
                    console.error(`Failed to run tsc using path ${env.path}`);
                }
            });
        } else if(noClient){
            // All modules should be running as children of the current process
        } else { // isChild is true
            if(client === undefined){
                console.error('Failed to launch child processes');
                client = {module: 'client', process: undefined};
            }
            // If the client process failed to launch, terminate all other processes
            if(client.process === undefined){
                killProcessGroup();
            } else {
                // When the client process ends, end all other processes
                client.process.on('exit',()=>{
                    killProcessGroup();
                });
            }
        }
    } else {
        // Run the launch command a gain as a child process
        let child = child_process.spawn('node',['launch.js', '--run-as-child'],{
            cwd: './scripts',
            detached: true,
            windowsHide: true,
        });
        // Explicitly pipe the output of the child process to the terminal
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
    }

})();
