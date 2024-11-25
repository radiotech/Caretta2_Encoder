// Read environment variables from the module's .env file
require('dotenv').config();

// Import required NPM modules
import _ffi from 'ffi';
import ref from 'ref';
let ffi: typeof _ffi = require('@saleae/ffi');
import {validateEnv} from '../../src/Env';
import {wait} from '../../src/Util';
import io from 'socket.io-client';

// Read in command line arguments - if --dev or -d are present, run in dev mode
let devMode = process.argv.slice(2).some(x=>['--dev','-d'].some(y=>x.trim()===y));

// Define a debug logging function (prints to terminal when in debug mode)
const devLog = (data: any)=>{if(devMode){console.log(data);}};

// Validate the format of supplied environment variables
validateEnv({
    PROXY_SERVER: {regex: /^(?:(?:\d{1,3}\.){3}\d{1,3}|localhost):\d{1,5}$/},
    SAMPLE_FREQUENCY: {test: val=>!isNaN(parseFloat(val))&&parseFloat(val)>0&&parseFloat(val)<=1000},
    CYCLES_PER_REVOLUTION: {test: val=>!isNaN(parseFloat(val))&&parseFloat(val)>0&&parseFloat(val)<=5000},
});

// Define a type shim to expose the deref method of buffers returned by the ref library
interface RefBuffer extends Buffer {
    deref: ()=>any,
};

// Define ref types for use when defining the call signatures of the USB4 dll
let shortPtr = ref.refType('short');
let longPtr = ref.refType('long');
let ulongPtr = ref.refType('ulong');
let ucharPtr = ref.refType('uchar');

// Define call signatures for the USB4 dll
let usb4 = ffi.Library('./lib/USB4.dll',{
    USB4_Initialize: ['int', [shortPtr]],
    
    USB4_SetPresetValue: ['int', ['short', 'short', 'ulong']],
    USB4_SetMultiplier: ['int', ['short', 'short', 'short']],
    USB4_SetCounterMode: ['int', ['short', 'short', 'short']],
    USB4_SetForward: ['int', ['short', 'short', 'bool']],
    USB4_SetCounterEnabled: ['int', ['short', 'short', 'bool']],
    USB4_ResetCount: ['int', ['short', 'short']],
    USB4_GetCount: ['int', ['short', 'short', ulongPtr]],

    USB4_Shutdown: ['void', []],


    USB4_EnableFIFOBuffer: ['int', ['short']],
    USB4_ClearFIFOBuffer: ['int', ['short']],
    USB4_ReadFIFOBuffer: ['int', [
        'short',
        longPtr,
        ulongPtr,
        ulongPtr,
        ulongPtr,
        ulongPtr,
        ulongPtr,
        ucharPtr,
        ucharPtr,
        ucharPtr,
        ucharPtr,
        ucharPtr,
        ucharPtr,
        ulongPtr,
        ulongPtr,
        ulongPtr,
        ulongPtr,
        'ulong',
    ]],
    USB4_SetPresetOnIndex: ['int', ['short', 'short', 'bool']],
    USB4_SetEnableIndex: ['int', ['short', 'short', 'bool']],
    USB4_SetTriggerOnIndex: ['int', ['short', 'short', 'bool']],
    USB4_SetTriggerOnIncrease: ['int', ['short', 'short', 'bool']],
    USB4_SetTriggerOnDecrease: ['int', ['short', 'short', 'bool']],
    USB4_SetCount: ['int', ['short', 'short', 'ulong']],
});

// Expose various USB4 dll functions
let USB4_Initialize = ()=>{
    // Allocate space to store the result of the dll call
    let piDeviceCount = ref.alloc('short') as RefBuffer;
    // Make the dll call
    let errorCode = usb4.USB4_Initialize(piDeviceCount);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_Initialize error code ${errorCode}`);
    }
    // Extract the results of the call
    let deviceCount = piDeviceCount.deref();
    // Validate the results
    if(deviceCount === 0){
        throw new Error(`Could not find any connected USB4 devices`);
    } else if(deviceCount > 1){
        throw new Error(`Found multiple connected USB4 devices`);
    }
};
let USB4_SetPresetValue = (encoder: number, value: number)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetPresetValue(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetPresetValue error code ${errorCode}`)
    }
};
let USB4_SetMultiplier = (encoder: number, value: 0|1|2|3)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetMultiplier(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetMultiplier error code ${errorCode}`)
    }
};
let USB4_SetCounterMode = (encoder: number, value: 0|1|2|3)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetCounterMode(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetCounterMode error code ${errorCode}`)
    }
};
let USB4_SetForward = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetForward(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetForward error code ${errorCode}`)
    }
};
let USB4_SetCounterEnabled = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetCounterEnabled(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetCounterEnabled error code ${errorCode}`)
    }
};
let USB4_ResetCount = (encoder: number)=>{
    // Make the dll call
    let errorCode = usb4.USB4_ResetCount(0,encoder);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_ResetCount error code ${errorCode}`)
    }
};
let USB4_GetCount = (encoder: number)=>{
    // Allocate space to store the result of the dll call
    let pulCount = ref.alloc('ulong') as RefBuffer;
    // Make the dll call
    let errorCode = usb4.USB4_GetCount(0,encoder,pulCount);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_GetCount error code ${errorCode}`);
    }
    // Extract the results of the call
    return pulCount.deref();
};
let USB4_Shutdown = ()=>{
    // Make the dll call
    usb4.USB4_Shutdown();
};
let USB4_EnableFIFOBuffer = ()=>{
    // Make the dll call
    let errorCode = usb4.USB4_EnableFIFOBuffer(0);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_EnableFIFOBuffer error code ${errorCode}`)
    }
};
let USB4_ClearFIFOBuffer = ()=>{
    // Make the dll call
    let errorCode = usb4.USB4_ClearFIFOBuffer(0);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_ClearFIFOBuffer error code ${errorCode}`)
    }
};
let USB4_ReadFIFOBuffer = ()=>{
    
    // Allocate space to store the result of the dll call
    let plSize = ref.alloc('long',1) as RefBuffer;
    let pUnusedLong = ref.alloc('ulong') as RefBuffer;
    let pUnusedChar = ref.alloc('char') as RefBuffer;
    let pCount0 = ref.alloc('ulong') as RefBuffer;
    let pStatus0 = ref.alloc('char') as RefBuffer;

    let result: {count?: number, indexCount?: number} = {};
    while(true){
        // Make the dll call
        let errorCode = usb4.USB4_ReadFIFOBuffer(
            0,
            plSize,
            pUnusedLong,
            pCount0,
            pUnusedLong,
            pUnusedLong,
            pUnusedLong,
            pStatus0,
            pUnusedChar,
            pUnusedChar,
            pUnusedChar,
            pUnusedChar,
            pUnusedChar,
            pUnusedLong,
            pUnusedLong,
            pUnusedLong,
            pUnusedLong,
            10, // Read timeout
        );
        // Check for an error response
        if(errorCode !== 0){
            throw new Error(`USB4_ReadFIFOBuffer error code ${errorCode}`)
        }

        // Process the results of the call
        let size = plSize.deref();
        if(size == 0){
            break;
        }
        result.count = pCount0.deref();
        if((pStatus0.deref() & 16) != 0){
            result.indexCount = result.count;
        }
    }
    return result;
};
let USB4_SetPresetOnIndex = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetPresetOnIndex(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetPresetOnIndex error code ${errorCode}`)
    }
};
let USB4_SetEnableIndex = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetEnableIndex(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetEnableIndex error code ${errorCode}`)
    }
};
let USB4_SetTriggerOnIndex = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetTriggerOnIndex(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetTriggerOnIndex error code ${errorCode}`)
    }
};
let USB4_SetTriggerOnIncrease = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetTriggerOnIncrease(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetTriggerOnIncrease error code ${errorCode}`)
    }
};
let USB4_SetTriggerOnDecrease = (encoder: number, value: boolean)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetTriggerOnDecrease(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetTriggerOnDecrease error code ${errorCode}`)
    }
};
let USB4_SetCount = (encoder: number, value: number)=>{
    // Make the dll call
    let errorCode = usb4.USB4_SetCount(0,encoder,value);
    // Check for an error response
    if(errorCode !== 0){
        throw new Error(`USB4_SetCount error code ${errorCode}`)
    }
};


// Open a connection to the proxy server specified by the user
let socket = io(`http://${process.env.PROXY_SERVER}`,{
    query: {
        'caretta-token': process.env.CARETTA_TOKEN!,
        'caretta-type': 'encoder',
    }
});

// If an error event is emitted, print a message to the console
socket.on('error',(e: any)=>{
    console.error(e);
});


// TODO: Remove random data mode, this was used for testing
let bearing = 0;
let indexCount: number | undefined = undefined;
const CPR = parseFloat(process.env.CYCLES_PER_REVOLUTION!)*4;

let randomDataMode = false;
if(randomDataMode){
    setInterval(()=>{
        bearing = Math.round((bearing+.01)*100)/100%365;
        if(socket.connected){
            socket.send({bearing});
        }
    },1000/parseFloat(process.env.SAMPLE_FREQUENCY!));
} else {
    let lastIndexTime = new Date().getTime();
    // Define a function that establishes and maintains a connection with the USB4 device
    let connectDLL = ()=>{
        // Define a retry function that terminates the current connection and makes a new connection attempt
        let retry = ()=>{
            // Attempt to connect the the USB4 device in 2 seconds
            setTimeout(connectDLL,2000);
            // Prevent subsequent calls to retry from spawning a new connection
            retry = ()=>{};
        };
        
        try {
            // Connect to and configure the USB4 device
            devLog(`Connecting to encoder...`);
            USB4_Initialize();
            USB4_SetPresetValue(0,CPR-1); // Set the preset register to CPR-1
            USB4_SetMultiplier(0,3); // Set quadrature mode to X4
            USB4_SetCounterMode(0,3); // Set counter mode to modulo-N
            USB4_SetForward(0,true); // Set the counting direction to forward
            USB4_SetCounterEnabled(0,true); // Enable the counter
            // Enable and clear the FIFO buffer
            USB4_EnableFIFOBuffer();
            USB4_ClearFIFOBuffer();
            // Set index and trigger config (when index is encountered, reset to 0 - push count to FIFO when it changes or index is detected)
            USB4_SetPresetOnIndex(0,false);
            USB4_SetTriggerOnIndex(0,true);
            USB4_SetTriggerOnIncrease(0,true);
            USB4_SetTriggerOnDecrease(0,true);
            // If an index count is already stored, reset the encoder count when the index is encountered again
            if(indexCount != undefined){
                USB4_SetEnableIndex(0,true);
            }
            // USB4_ResetCount(0); // Reset the counter to 0 (the counter should not be reset after the first connection)
            devLog(`Connection successful!`);

            let lastSendTime = new Date().getTime();
            let lastPrintTime = new Date().getTime();
            const sendBearing = ()=>{
                if(socket.connected){
                    socket.send({bearing});
                    lastSendTime = new Date().getTime();
                }
            }
           
            (async ()=>{
                try {
                    // While the device is connected,
                    for(let i = 0; true; i = (i+1)%100){
                        let stepTime = new Date().getTime();
                        
                        // Read any stored count and index count values from the USB4 FIFO buffer
                        let counts = USB4_ReadFIFOBuffer();
                        
                        // If counts were read,
                        if(counts.count != undefined){
                            // If an index count was passed,
                            if(counts.indexCount != undefined){
                                // If this is the first time the index was passed,
                                if(indexCount == undefined){
                                    // Store the count at the time the index was passed as the index count
                                    indexCount = counts.indexCount;
                                    // Reset the count to be relative to the index count
                                    USB4_SetCount(0,(counts.count - indexCount + CPR)%CPR);
                                } else {
                                    let adjustment = (CPR-counts.indexCount)%CPR;
                                    adjustment = -(adjustment>CPR/2?adjustment-CPR:adjustment)/CPR*360;
                                    // Print a warning if the index pulse results in a bearing correction > .5 degrees
                                    if(Math.abs(adjustment) > .5){
                                        console.warn(`The encoder encountered an index pulse and adjusted its bearing ${
                                            Math.sign(adjustment)==1?'clockwise':'counterclockwise'
                                        } by ${Math.abs(adjustment)} degrees (The previous index pulse occurred at ${
                                            new Date(lastIndexTime).toLocaleTimeString()
                                        }, this pulse occurred at ${new Date().toLocaleTimeString()}).`);
                                    }
                                }
                                lastIndexTime = new Date().getTime();
                                // Next time the index is passed reset the count to 0 (when the index is passed, this value may reset to false)
                                USB4_SetEnableIndex(0,true);
                            }
                            
                            // Convert the encoder's count to a bearing value
                            bearing = ((counts.count+(indexCount??0))!/CPR*360)%360;
                            
                            // Send the current bearing to the client
                            sendBearing();

                            // Print counts for testing
                            // devLog(`${counts.count}, ${counts.indexCount??'-'}, ${bearing}`);
                        }

                        // If it has been longer than 1 second since the bearing has been sent to the client, send it again
                        if(stepTime - lastSendTime > 1000){
                            sendBearing();
                        }
                        
                        // Print the current bearing as a debug message periodically
                        if(stepTime - lastPrintTime > 1000){
                            devLog(`Bearing: ${bearing}`);
                            lastPrintTime = new Date().getTime();
                        }

                        // Ensure that steps are timed according to the user defined sample frequency
                        await wait(1000/parseFloat(process.env.SAMPLE_FREQUENCY!) - new Date().getTime() + stepTime);
                    }
                } catch(e){
                    // If an error occurs while communicating with the device, reset the device connection
                    devLog(`Connection closed`);
                    console.error(e);
                    retry();
                }
            })();
        } catch(e){
            // If an error occurs during device setup, reset the connection
            devLog(`Connection failed!`);
            console.error(e);
            retry();
        }
    };
    // Initiate a connection with the USB4 device
    connectDLL();
}
