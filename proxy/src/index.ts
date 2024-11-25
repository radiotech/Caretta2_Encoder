// Read environment variables from the module's .env file
require('dotenv').config();

// Import required NPM modules
import {validateEnv} from '../../src/Env';
import SocketIO from 'socket.io';

// Read in command line arguments - if --dev or -d are present, run in dev mode
let devMode = process.argv.slice(2).some(x=>['--dev','-d'].some(y=>x.trim()===y));

// Define a debug logging function (prints to terminal when in debug mode)
const devLog = (data: any)=>{if(devMode){console.log(data);}};

// Validate the format of supplied environment variables
validateEnv({
    PORT: {regex: /^\d{1,5}$/, test: val=>!isNaN(parseInt(val))&&parseInt(val)>=0&&parseInt(val)<=65535},
});

// Extract the port environment variable and ensure that it is within range
const port = parseInt(process.env.PORT!);
if(isNaN(port) || port < 0 || port > 65535){
    throw new Error('Please specify a port number');
}

// Create a websocket server
const io = SocketIO({
    serveClient: false,
});

// Create an array to store the set of currently connected components
let components: {type: string, socket: SocketIO.Socket}[] = [];

// Create a variable to store a reference to the client socket, if the client is connected
let client: SocketIO.Socket | undefined = undefined;

// Define a middleware function to ensure that all components provide the correct caretta token
io.use((socket,next)=>{
    try {
        // Determine the type of the component making this request
        let type: string = socket.handshake.query['caretta-type'];

        // If an invalid caretta token was provided,
        if(socket.handshake.query['caretta-token'] !== process.env.CARETTA_TOKEN){
            // Abort the connection with an error
            next(new Error('An invalid Caretta2 token was provided'));
        // Otherwise, if a valid caretta token was provided,
        } else {
            // If the provided type is not valid,
            if(typeof type !== 'string'){
                // Abort the connection with an error
                next(new Error('A Caretta2 component type was not provided'));
            // Otherwise, if the component type is not 'client'
            } else if(type !== 'client') {
                // If a component of this type is already connected,
                if(components.some(x=>x.type===type)){
                    // Abort the connection with an error
                    next(new Error(`A component of this type is already connected`));
                // Otherwise,
                } else {
                    // Allow the connection attempt to proceed
                    next();
                }
            // Otherwise, if the component type is 'client'
            } else { //client type
                // If a client component is already connected,
                if(client !== undefined){
                    // Abort the connection with an error
                    next(new Error(`A client is already connected to this proxy server`));
                } else {
                    // Allow the connection attempt to proceed
                    next();
                }
            }
        }
    } catch(e){
        // If an error is thrown when reading data from the connection handshake, abort the connection with an error
        next(new Error('Failed to parse handshake body'));
    }
});

// Define a function to send a list of connected components to the client
let sendComponentsToClient = ()=>{
    if(client !== undefined){
        client.send({
            type: 'proxy',
            data: components.map(x=>x.type)
        });
    }
};

// Every 10 seconds, send the list of connected components to the client
setInterval(()=>{
    sendComponentsToClient();
},10000);

// Define a function to handle new connections
io.on('connection', socket=>{
    // Determine the type of the component making this connection
    let type: string = socket.handshake.query['caretta-type'];

    // If this connection is with the client module,
    if(type === 'client'){
        // Set the client socket reference to this socket
        console.log(`Connect client`);
        client = socket;

        // Define a message handler for this connection
        socket.on('message',(packet: any)=>{
            // Validate the message then forward it to the appropriate hardware control module
            if(typeof packet !== 'object'){
                console.error('Client data was not a valid object');
            } else if(typeof packet.type !== 'string'){
                console.error('Client did not provide a component type');
            } else {
                let component = components.filter(x=>x.type===packet.type);
                if(component.length !== 1){
                    console.error(`Client provided a component type (${packet.type}) that could not be found`);
                } else {
                    component[0].socket.send(packet.data);
                }
            }
        });
    // Otherwise,
    } else {
        // Add this module connection to the list of component sockets
        console.log(`Connect ${type}`);
        components.push({type,socket});
        
        // Forward any messages from this module to the client
        socket.on('message',(data: any)=>{
            if(client !== undefined){
                client.send({type,data});
            }
        });
    }

    // Inform the client of the presence of this new device
    sendComponentsToClient();

    // Define a disconnect handler for this connection
    socket.on('disconnect',e=>{
        if(type === 'client'){
            console.log(`Disconnect client`);
            client = undefined;
        } else {
            console.log(`Disconnect ${type}`);
            components = components.filter(x=>x.type!==type&&x.socket.connected);
            sendComponentsToClient();
        }
    });
});

// Start the websocket server
io.listen(port);
