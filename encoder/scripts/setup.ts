import {Module, ModuleState, runInNewTerminal, runInCurrentTerminal, os} from '../../scripts/setup_util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';

// Define an id and title for this module so that these values can be updated easily
let moduleID = 'encoder'; // This should match the module folder name
let moduleTitle = 'Encoder'; // This should be capitalized like a title

// Store this module's directory in a variable for later use
let dir = path.resolve(`./${moduleID}`);

// Create a type definition for the state of this module
type State = ModuleState & {
    proxy_server?: string,
    sample_frequency?: string,
    cycles_per_revolution?: string,
};

// Define and export a setup object for this module
export const setup: Module<State> = {
    // Define a getter for the module's properties
    getProps: async ()=>({
        id: moduleID,
        name: `${moduleTitle} Module`,
        description: `This module allows the system to interface with a US Digital S1 Optical Shaft Encoder connected through a USB4 Encoder Data Acquisition USB Device.`,
        installable: os==='windows',
        order: 30, // Determines the order of modules within the setup GUI
        format: {
            proxy_server: {
                name: 'Proxy Server',
                description: `The ip address and port of a proxy server instance. For example, localhost:400 and 127.0.0.1:25565 are acceptable values.`,
                order: 0, // Determines the order of module fields within the setup GUI
                visibility: 'networked', // Whether this field should render for local/networked/any setups - the default value is always used for values that are not rendered in the GUI
                default: 'localhost:25565',
                type: 'string', // Type of interface element for this field
                regex: '^(?:(?:\\d{1,3}\\.){3}\\d{1,3}|localhost):\\d{1,5}$',
                regexMessage: 'Please enter a server address consisting of an IP address and a port. For example, "localhost:25565" and "192.168.1.1:25565" would be valid values.',
            },
            sample_frequency: {
                name: 'Sample Frequency',
                description: `The frequency (in Hz) at which data is transmitted from this module to the client. If the client is not installed on this device, a value of 10 or less is recommended. If the client is installed on this device, a value of 100 may be more appropriate.`,
                order: 1, // Determines the order of module fields within the setup GUI
                visibility: 'networked', // Whether this field should render for local/networked/any setups - the default value is always used for values that are not rendered in the GUI
                default: {local: '100', networked: '10'},
                type: 'string', // Type of interface element for this field
                regex: '^(1000|\\d{0,3}(\\.\\d+)?)$',
                regexMessage: 'Please enter a frequency value in hertz between 0 and 1000.',
            },
            cycles_per_revolution: {
                name: 'Cycles per Revolution',
                description: `The number of quadrature cycles per revolution for this optical encoder.`,
                order: 2, // Determines the order of module fields within the setup GUI
                visibility: true, // Whether this field should render for local/networked/any setups - the default value is always used for values that are not rendered in the GUI
                default: '360',
                type: 'select', // Type of interface element for this field
                options: [32,50,96,100,192,200,250,256,360,400,500,512,540,720,800,900,1000,1024,1250,2000,2048,2500,4000,4096,5000].map(x=>`${x}`),
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
                if(['CARETTA_TOKEN','PROXY_SERVER','SAMPLE_FREQUENCY','CYCLES_PER_REVOLUTION'].every(x=>parsed[x]!==undefined)){
                    return {
                        installed: true,
                        token: parsed['CARETTA_TOKEN'],
                        proxy_server: parsed['PROXY_SERVER'],
                        sample_frequency: parsed['SAMPLE_FREQUENCY'],
                        cycles_per_revolution: parsed['CYCLES_PER_REVOLUTION'],
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
                fs.writeFileSync(path.resolve(dir,'./.env'),`CARETTA_TOKEN=${state.token}\nPROXY_SERVER=${state.proxy_server}\nSAMPLE_FREQUENCY=${parseFloat(state.sample_frequency!)}\nCYCLES_PER_REVOLUTION=${parseFloat(state.cycles_per_revolution!)}\n`);
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
