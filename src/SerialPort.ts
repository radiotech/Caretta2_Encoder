// Import required NPM modules
import {ReadlineParser, SerialPort as serialport} from 'serialport';
import {promisify} from 'util';
import * as fs from 'fs';
import {wait} from './Util';

// Define a serial port type
export type Port = {
    path: string,
    locationId?: string,
    manufacturer?: string,
    serialNumber?: string,
    vendorId?: string,
    productId?: string,
};

// Enumerate the object keys and user-friendly labels associated with SerialPort objects
const portLabelKeys = [
    {key: 'path', label: 'Path'},
    {key: 'locationId', label: 'Location'},
    {key: 'manufacturer', label: 'Manufacturer'},
    {key: 'serialNumber', label: 'Serial Number'},
    {key: 'vendorId', label: 'Vendor'},
    {key: 'productId', label: 'Product'},
] as const;

// Define static variables
let ports: Port[] = []; // A list of the current serial ports (based upon the last refresh)
const refreshRateLimit = 300; // Define a rate limit for serial port refreshes
let lastRefreshTime = 0; // Track the last serial port refresh time

// Asynchronously refresh the list of serial ports
const refreshPorts = async (logPrefix = '')=>{
    if(new Date().getTime() - lastRefreshTime < refreshRateLimit){
        return;
    }
    try {
        let linuxPorts: Port[] = [];
        try {
            linuxPorts = (await Promise.all((await promisify(fs.readdir)('/dev/serial/by-path')).map(async locationId=>{
                try {
                    return {
                        path: (await promisify(fs.readlink)(`/dev/serial/by-path/${locationId}`)).split('/').pop()!.trim(),
                        locationId,
                    };
                } catch(e){}
                return undefined!;
            }))).filter(x=>x!==undefined&&x.path.length>0&&x.locationId.length>0);
        } catch(e){}
        ports = (await serialport.list()).map(x=>{
            portLabelKeys.forEach(y=>{
                if(typeof x[y.key] === 'string'){
                    x[y.key] = x[y.key]!.replace(/[,:]/g,'-').trim();
                    if(x[y.key]!.length === 0){
                        x[y.key] = undefined!;
                    }
                }
            });
            if(x.locationId === undefined){
                let linuxPort = linuxPorts.filter(y=>x.path===y.path)[0];
                if(linuxPort !== undefined){
                    x.locationId = linuxPort.locationId;
                }
            }
            return {
                path: x.path,
                ...(x.locationId===undefined?{}:{locationId: x.locationId}),
                ...(x.manufacturer===undefined?{}:{manufacturer: x.manufacturer}),
                ...(x.serialNumber===undefined?{}:{serialNumber: x.serialNumber}),
                ...(x.vendorId===undefined?{}:{vendorId: x.vendorId}),
                ...(x.productId===undefined?{}:{productId: x.productId}),
            };
        });
        lastRefreshTime = new Date().getTime();
    } catch(e){
        console.log(e);
        console.error(`${logPrefix}Failed to list connected serial devices`);
    }
};

// Refresh then get the list of serial ports
export const getPorts = async ()=>{
    await refreshPorts();
    return ports;
};

// Convert a port object to a label string
export const portToLabel = (port: Port)=>{
    let result = portLabelKeys.map(
        x=>port[x.key]===undefined?undefined:`${x.label}: ${port[x.key]}`
    ).filter(x=>x!==undefined).join(', ');
    return result.length===0?'-':result;
};

// Convert a label string to a port object (the port path must be present in the label)
export const labelToPort = (label: string): Port | undefined =>{
    let parsedLabel: any = {};
    label.split(',').map(x=>x.split(':')).filter(x=>x.length===2).forEach(x=>{parsedLabel[x[0].trim()] = x[1].trim();});
    let parsedPort: Port = {} as any;
    portLabelKeys.forEach(x=>{
        if(parsedLabel[x.label] !== undefined){
            (parsedPort as any)[x.key] = parsedLabel[x.label];
        }
    });
    if(parsedPort.path === undefined && parsedPort.locationId === undefined){
        return undefined;
    }
    return parsedPort;
};

// Convert a port object to a serial port config string
export const portToConfig = (port: Port | undefined)=>JSON.stringify(
    port===undefined?{}:port.locationId===undefined?{path: port.path}:{locationId: port.locationId}
);

// Find a port object in the list of ports using a partial port object (match locationId, if present, otherwise path)
export const findPort = async (port: Port): Promise<Port | undefined> =>{
    await refreshPorts();
    let results = ports.filter(x=>port.locationId===undefined?port.path===x.path:port.locationId===x.locationId);
    // If multiple ports are found, shuffle them to prevent the consistent use of an invalid com path
    return results[Math.floor(Math.random()*results.length)];
};

// Define types related to the connectSerial function
export type writeCallback = (...commands: string[] | [{baudRate: number}])=>Promise<void>;
type ReconfigurableConnectSerialConfig = {
    connectionConfig: {baudRate: number},
    parserConfig: {
        delimiter: string,
        includeDelimiter?: boolean
    },
    deviceReadyTest?: (data: string)=>boolean,
    deviceReadyTimeout?: number,
};
export type ConnectSerialConfig = ReconfigurableConnectSerialConfig & {
    deviceLabel?: string,
    port: Port,
    minStepDelay?: number,
    delimiter?: string,
    onOpen?: (write: writeCallback, reconnect: (updatedSerialConfig?: Partial<ReconfigurableConnectSerialConfig>)=>void)=>Promise<void>,
    onData?: (data: string, write: writeCallback, reconnect: ()=>void)=>void,
    onStep?: (write: writeCallback, reconnect: (updatedSerialConfig?: Partial<ReconfigurableConnectSerialConfig>)=>void)=>Promise<void>,
};

// Export a function that allows for connection to and communication with a serial device
export const connectSerial = ({
    deviceLabel,
    port: portConfig,
    connectionConfig,
    parserConfig,
    minStepDelay = 0,
    delimiter = '\r',
    deviceReadyTest,
    deviceReadyTimeout = deviceReadyTest===undefined?10:1000,
    onOpen = async ()=>{},
    onStep,
    onData = async ()=>{},
}: ConnectSerialConfig)=>{
    
    // If the device ready test is not defined, provide a default value
    if(deviceReadyTest === undefined){
        deviceReadyTest = ()=>false;
    }

    // Define a connect function to initiate device connections
    const connect = async ()=>{
        
        // Define a variable to store the current serialport object
        let port: serialport;

        // Define a function to abort the current connection and create a new connection
        let retry = (updatedSerialConfig?: Partial<ReconfigurableConnectSerialConfig>)=>{
            // Close the port if it is open
            if(port !== undefined && port.isOpen){
                port.close();
            }
            if(updatedSerialConfig != undefined){
                if(updatedSerialConfig.connectionConfig != undefined){
                    connectionConfig = updatedSerialConfig.connectionConfig;
                }
                if(updatedSerialConfig.deviceReadyTest != undefined){
                    deviceReadyTest = updatedSerialConfig.deviceReadyTest;
                }
                if(updatedSerialConfig.deviceReadyTimeout != undefined){
                    deviceReadyTimeout = updatedSerialConfig.deviceReadyTimeout;
                }
                if(updatedSerialConfig.parserConfig != undefined){
                    parserConfig = updatedSerialConfig.parserConfig;
                }
            }
            // Attempt to establish a new connection in 2 seconds
            setTimeout(connect,2000);
            // Prevent future calls to the retry function for this port instance
            retry = ()=>{};
        };

        // Use the port config to identify an accessible serial device
        let resolvedPortConfig = (await findPort(portConfig))!;
        if(resolvedPortConfig === undefined || resolvedPortConfig.path === undefined){
            console.error(`No serial ports could be found that match the configuration provided${deviceLabel===undefined?'':` for device ${deviceLabel}`}: ${JSON.stringify(portConfig)}`);
            retry();
            return;
        }

        // Open a connection to the identified serial device
        port = new serialport({path: resolvedPortConfig.path, ...connectionConfig});
        let parser = port.pipe(new ReadlineParser(parserConfig) as any);

        // Define variables to track the writing of data to the device
        let ready = true; // Boolean indicating whether the device is currently ready to receive data
        let readyTimeout: NodeJS.Timeout = undefined!; // A handle for any current setTimeout calls to mark the serial device as ready
        let writeQueue: {
            command: string,
            callback: ()=>void
        }[] = []; // A queue that holds pending messages to be written to the serial device and their respective callback functions

        // Define a function to mark the serial device as ready to receive data (then initiate write queue processing)
        const markReady = ()=>{
            clearTimeout(readyTimeout);
            ready = true;
            processWriteQueue();
        };

        // Define a function to process items in the write queue (write these commends to the serial device once it is ready)
        const processWriteQueue = async ()=>{
            if(ready && writeQueue.length > 0){
                ready = false;
                let nextCommand = writeQueue.shift()!;
                port.write(`${nextCommand.command}${delimiter}`);
                readyTimeout = setTimeout(markReady,deviceReadyTimeout);
                await new Promise<void>(accept=>port.drain(()=>accept()));
                nextCommand.callback();
            }
        };

        // Define a function to send commands to the device
        let write = (...commands: string[] | [{baudRate: number}])=>new Promise<void>(resolve=>{
            if(commands.length == 1 && typeof commands[0] == 'object'){
                port.update(commands[0]);
                resolve();
            } else if(commands.length > 0){
                writeQueue.push(...((commands as string[]).map((x,i)=>({command: x, callback: ()=>{
                    if(i === commands.length-1){
                        resolve();
                    }
                }}))));
                processWriteQueue();
            }
        });

        // If an error event is emitted for the serial connection, print a message to the console and reconnect
        port.on('error', (err: any)=>{
            console.error(`Serial connection error${deviceLabel===undefined?'':` for device ${deviceLabel}`}:`);
            console.error(err);
            retry();
        });

        // If the serial connection closes, print a message to the console and reconnect
        port.on('close', ()=>{
            console.error(`Serial connection closed${deviceLabel===undefined?'':` for device ${deviceLabel}`}`);
            retry();
        });
        
        // Once the serial connection is opened,
        port.once('open', async ()=>{
            
            // Log this event to the console
            console.log(`Serial connection opened${deviceLabel===undefined?'':` for device ${deviceLabel}`}`);
            await onOpen(write,retry);

            if(onStep !== undefined){
                // While the serial connection is active,
                while(port.isOpen){
                    // Call the onStep function, respecting minStepDelay
                    let stepStartTime = new Date().getTime();
                    await onStep(write,retry);
                    await wait(Math.max(1,minStepDelay - new Date().getTime() + stepStartTime));
                }
            }
        });

        // When data is received from the device,
        parser.on('data', (data: string)=>{
            data = `${data}`;
            // console.log(`out: ${data}`);
            // If the device ready test returns true for this message, mark the device as being ready to receive data and initiate write queue processing
            // Otherwise, call onData with this message data
            if(deviceReadyTest!(data)){
                markReady();
            } else {
                onData(data,write,retry);
            }
        });
    };

    // Initiate a connection to the serial device
    connect();
};
