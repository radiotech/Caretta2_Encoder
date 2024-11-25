// Import required NPM modules
import * as child_process from 'child_process';
import * as http from 'http';
import express from 'express';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import open from 'open';
import * as fs from 'fs';
import {homedir} from 'os';
import {Module, ModuleProps, defaultToken, os} from './setup_util';

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

// Define variables to track the launching of child processes
let launchOnClose = false; // Boolean indicating whether child processes should be launched
let launched = false; // Boolean indicating whether child processes have been launched

// Create an express object to host the setup webpage
let app = express();

// Parse submissions to the server as JSON strings
app.use(bodyParser.json());

// Create submission endpoints for various setup tasks
app.use('/status', async (req,res)=>{res.json(await status(req.body));});
app.use('/submit', async (req,res)=>{res.json(await submit(req.body));});
app.use('/close', (req,res)=>{res.json(close());});

// Host the static resources required to render the setup page
app.use(express.static('scripts/hosted'));
app.use('*', (req,res)=>{res.sendFile(path.resolve('./scripts/hosted/index.html'));});

// Create a server using the express object and configuration settings
let server = http.createServer(app);

// If an error occurs while starting the server,
// If this is due to a port collision, attempt to start the server using a different port
// Otherwise, print the error
let port = 2000;
server.on('error',(e)=>{
    if(port < 3000 && (e as any).code === 'EADDRINUSE'){
        port = port+1;
        server.listen(port);
    } else {
        console.log(JSON.stringify(e,null,2));
        console.error('An error was encountered. Please see the logs printed above for additional details.');
    }
});

// Once the server starts, print the port that was used
server.on('listening',()=>{
    console.log(`An instance of the Caretta2 setup GUI server is running on port ${port}`);
    open(`http://localhost:${port}`);
});

// Attempt to start the server
server.listen(port);

// Define a 'status' endpoint handler that returns the current modules, their properties, and their states
async function status(data: {states: any}){
    let result = {
        moduleNames,
        moduleProps: {} as Record<string, ModuleProps<any>>,
        moduleStates: {} as any,
    };
    await Promise.all(moduleNames.map(async name=>{
        result.moduleProps[name] = await modules[name].getProps();
        // Add the caretta token property to the format of all modules
        result.moduleProps[name].format.token = {
            name: 'Caretta Token',
            description: 'A value shared by all modules connected to a single Caretta2 setup.',
            order: -1,
            visibility: 'networked',
            default: defaultToken,
            type: 'string',
            regex: '^[a-zA-Z0-9_\\-]*$',
            regexMessage: 'Please enter a string containing only the following characters: a-z, A-Z, 0-9, _, and -.',
        };
        if(data.states !== undefined && name in data.states){
            Object.keys(result.moduleProps[name].format).forEach(x=>{
                if(typeof result.moduleProps[name].format[x].visibility == 'function'){
                    result.moduleProps[name].format[x].visibility = (result.moduleProps[name].format[x].visibility as any)(data.states[name])
                }
            });
        }
        result.moduleStates[name] = await modules[name].getState();
    }));
    return result;
}

// Define a 'submit' endpoint handler that executes setup operations
async function submit(data: {shortcut: boolean, launch: boolean, states: any}){
    // Define a result variable to hold any errors that occur while installing modules
    let result: {error?: string} = {};
    // Validate the provided arguments
    if(typeof data.shortcut !== 'boolean' || typeof data.launch !== 'boolean' || typeof data.states !== 'object'){
        result.error = 'An error occurred while communicating with the installation server.'
    } else {
        // For each module,
        await Promise.all(moduleNames.map(async name=>{
            // Install, uninstall, or update the configuration for this module
            let x = await modules[name].setState(data.states[name]);
            // Record any errors that occur
            if(x.error !== undefined){
                result.error = `${result.error===undefined?'':`${result.error} AND `}${x.error}`;
            }
        }));
    }
    // If no errors ocurred,
    if(result.error === undefined){
        // If a desktop shortcut should be created, attempt to create it
        if(data.shortcut){
            try {
                let startScriptBodyBash = `#!/bin/bash\ncd '${path.resolve('.')}'\nnpm start\nread -p "Press any key to exit..."\n`;
                let setupScriptBodyBash = `#!/bin/bash\ncd '${path.resolve('.')}'\nnpm run setup\nread -p "Press any key to exit..."\n`;
                if(os==='windows'){
                    fs.writeFileSync(path.resolve('./scripts/start.bat'),`cd ${path.resolve('.')}\r\nnpm start\r\npause\r\n`);
                    fs.writeFileSync(path.resolve('./scripts/setup.bat'),`cd ${path.resolve('.')}\r\nnpm run setup\r\npause\r\n`);
                    child_process.spawnSync(`wscript.exe`,['./scripts/create_desktop_shortcut.vbs'],{windowsHide: true});
                } else if(os === 'mac'){
                    let startShortcutPath = path.resolve(homedir(),'./Desktop/Caretta2.command');
                    let setupShortcutPath = path.resolve(homedir(),'./Desktop/Caretta2 Setup.command');
                    fs.writeFileSync(startShortcutPath,startScriptBodyBash);
                    fs.writeFileSync(setupShortcutPath,setupScriptBodyBash);
                    fs.chmodSync(startShortcutPath, 0o777);
                    fs.chmodSync(setupShortcutPath, 0o777);
                } else {
                    [
                        {type: 'start', name: 'Caretta2', body: startScriptBodyBash},
                        {type: 'setup', name: 'Caretta2 Setup', body: setupScriptBodyBash},
                    ].forEach(x=>{
                        let shortcutPath = path.resolve(`./scripts/${x.type}`);
                        fs.writeFileSync(shortcutPath,x.body);
                        fs.chmodSync(shortcutPath, 0o777);
                        let desktopEntry = `[Desktop Entry]\nVersion=1.0\nName=${x.name}\nExec="${
                            shortcutPath
                        }"\nIcon=${
                            path.resolve('./scripts/Caretta2.png')
                        }\nTerminal=true\nType=Application\n`;
                        ['./Desktop','./.local/share/applications'].forEach(y=>{
                            let shortcutPath = path.resolve(homedir(),`${y}/${x.name.toLowerCase().replace(/ /g,'_')}.desktop`);
                            fs.writeFileSync(shortcutPath,desktopEntry);
                            fs.chmodSync(shortcutPath, 0o777);
                        });
                    });
                    // TODO: May need to run update-desktop-database or similar command after the shortcut is created
                }
            } catch(e){
                console.error('An error was encountered while creating a desktop shortcut:');
                console.error(e);
            }
        }
        // Launch if the launch option is true and the client is installed
        launchOnClose = data.launch && data.states['client'].installed;
    }
    return result;
}

// Define a 'close' endpoint handler that ends the setup script and potentially launches the caretta2 system
function close(){
    // If the caretta2 system should be launched and it has not been launched already,
    if(launchOnClose && !launched){
        // Ensure that the application is only launched once, even if close is called multiple times
        launched = true;
        // Close the setup server
        server.close();
        // Launch Caretta2
        require('./launch');
    }
    // If the caretta2 system should not be launched,
    if(!launchOnClose){
        // Exit the current process in one second (enough time for any pending requests to resolve)
        setTimeout(()=>{
            process.exit();
        },1000);
    }
    return {};
}
