import {Module, ModuleState, runInNewTerminal, runInCurrentTerminal, os} from '../../scripts/setup_util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';

// Define an id and title for this module so that these values can be updated easily
let moduleID = 'proxy'; // This should match the module folder name
let moduleTitle = 'Proxy Server'; // This should be capitalized like a title

// Store this module's directory in a variable for later use
let dir = path.resolve(`./${moduleID}`);

// Create a type definition for the state of this module
type State = ModuleState & {
    port?: string,
};

// Define and export a setup object for this module
export const setup: Module<State> = {
    // Define a getter for the module's properties
    getProps: async ()=>({
        id: moduleID,
        name: `${moduleTitle} Module`,
        description: `The proxy server module allows you to connect hardware driver modules to the Caretta2 client. Please refer to the project's GitHub wiki for details regarding networked setups.`,
        installable: true,
        order: -1, // Determines the order of modules within the setup GUI
        format: {
            port: {
                name: 'Port',
                description: `The port that this proxy server instance will run on. The client module and any other hardware driver modules that should connect to this proxy server instance will need to be configured with this port and the IP address of the current device.`,
                order: 0, // Determines the order of module fields within the setup GUI
                visibility: 'networked', // Whether this field should render for local/networked/any setups - the default value is always used for values that are not rendered in the GUI
                default: '25565',
                type: 'string', // Type of interface element for this field
                regex: '^\\d{1,5}$',
                regexMessage: 'Please enter a valid port number between 0 and 65535. Recommended values include ports 25565, 2000-3000, 80, and 443.',
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
                if(['CARETTA_TOKEN','PORT'].every(x=>parsed[x]!==undefined)){
                    return {
                        installed: true,
                        token: parsed['CARETTA_TOKEN'],
                        port: parsed['PORT'],
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
                // If the module should be installed, create a .env file and run npm install and tsc
                console.log(`Installing the ${moduleTitle.toLowerCase()} module`);
                fs.writeFileSync(path.resolve(dir,'./.env'),`CARETTA_TOKEN=${state.token}\nPORT=${state.port}\n`);
                child_process.spawnSync('npm',['install','--production','--no-audit'],{
                    shell: true,
                    cwd: dir,
                    stdio: 'inherit',
                    windowsHide: true,
                });
                child_process.spawnSync('tsc',[],{
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
