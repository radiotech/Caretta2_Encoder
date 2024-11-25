import {Module, ModuleState, os, runInNewTerminal, runInCurrentTerminal} from '../../scripts/setup_util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';

// Define an id and title for this module so that these values can be updated easily
let moduleID = 'client'; // This should match the module folder name
let moduleTitle = 'Client'; // This should be capitalized like a title

// Store this module's directory in a variable for later use
let dir = path.resolve(`./${moduleID}`);

// Create a type definition for the state of this module
type State = ModuleState & {
    proxy_servers?: string,
};

// Define and export a setup object for this module
export const setup: Module<State> = {
    // Define a getter for the module's properties
    getProps: async ()=>({
        id: moduleID,
        name: `${moduleTitle} Module`,
        description: 'The client module provides an interface into the Caretta2 system. Only one client instance can be connected to the system at a time, although this single client instance can connect to any number of proxy servers and hardware control modules.',
        installable: true,
        order: -2, // Determines the order of modules within the setup GUI
        format: {
            proxy_servers: {
                name: 'Proxy Servers',
                description: 'A list of proxy servers for the client module to connect to.',
                order: 0, // Determines the order of module fields within the setup GUI
                visibility: 'networked', // Whether this field should render for local/networked/any setups - the default value is always used for values that are not rendered in the GUI
                default: 'localhost:25565',
                type: 'string', // Type of interface element for this field
                regex: '^(?:(?:(?:\\d{1,3}\\.){3}\\d{1,3}|localhost):\\d{1,5}\\s*,\\s*)*(?:(?:\\d{1,3}\\.){3}\\d{1,3}|localhost):\\d{1,5}$',
                regexMessage: 'Please enter a comma-separated list of server addresses consisting of IP addresses and ports. For example, "localhost:25565, 192.168.1.1:25565" would be a valid value.',
            },
        },
    }),
    // Define a getter for the module's state
    getState: async ()=>{
        // If the module is installed (.env file is present)
        if(fs.existsSync(path.resolve(dir,'./.env'))){
            try {
                // Try to return the state defined in the .env file
                let parsed = dotenv.parse(fs.readFileSync(path.resolve(dir,'./.env')));
                if(['CARETTA_TOKEN','PROXY_SERVERS'/*, TODO: Also check for these properties - was excluded to ease migration by providing a default value */].every(x=>parsed[x]!==undefined)){
                    return {
                        installed: true,
                        token: parsed['CARETTA_TOKEN'],
                        proxy_servers: parsed['PROXY_SERVERS'].split(',').map(x=>x.trim()).filter(x=>x.length>0).join(','),
                    };
                }
            } catch(e){}
        }
        // Otherwise, return a state with installed set to false
        return {installed: false};
    },
    // Define a setter for the module's state
    setState: async (state)=>{
        try {
            if(state.installed){
                // If the module should be installed, create a .env file and run npm install
                console.log(`Installing the ${moduleTitle.toLowerCase()} module`);
                fs.writeFileSync(path.resolve(dir,'./.env'),`CARETTA_TOKEN=${state.token}\nPROXY_SERVERS=${state.proxy_servers!.split(',').map(x=>x.trim()).filter(x=>x.length>0).join(',')}\n`);
                child_process.spawnSync('npm',['install','--no-audit','--legacy-peer-deps'],{
                    shell: true,
                    cwd: dir,
                    stdio: 'inherit',
                    windowsHide: true,
                });
            } else {
                // If the module should not be installed, remove the .env file if it exists
                if(fs.existsSync(path.resolve(dir,'./.env'))){
                    console.log(`Uninstalling the ${moduleTitle.toLowerCase()} module`);
                    fs.unlinkSync(path.resolve(dir,'./.env'));
                }
            }
        } catch(e){
            // Handle any fs errors that occur
            console.error(e);
            return {error: `[${moduleTitle.toLowerCase()}] An issue was encountered while updating a configuration file.`};
        }
        return {};
    },
    run: async (devMode)=>{
        // Launch a child process in dev or production mode, return any errors that occur
        try {
            if(devMode){
                runInNewTerminal(dir,['npm','run','watch'])
            } else {
                return {process: runInCurrentTerminal(dir,[`npm${os==='windows'?'.cmd':''}`,'start'],`[${moduleTitle.toLowerCase()}] `)};
            }
            return {};
        } catch(e){
            console.log(e);
            return {error: `[${moduleTitle.toLowerCase()}] Module failed to launch`}
        }
    },
};
