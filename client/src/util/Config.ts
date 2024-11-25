// Read environment variables from the module's .env file
require('dotenv').config();

// Validate the format of supplied environment variables
if(typeof process.env.CARETTA_TOKEN !== 'string'){
    throw new Error('Please provide a Caretta token value in the client .env configuration file');
}
if(!/^[a-zA-Z0-9_\-]*$/.test(process.env.CARETTA_TOKEN)){
    throw new Error(`The provided CARETTA_TOKEN configuration value contains illegal characters (only letters, numbers, and '-' or '_' symbols are allowed)`);
}
if(typeof process.env.PROXY_SERVERS !== 'string'){
    throw new Error('Please provide a list of proxy servers in the client .env configuration file');
}

// Export config constants
export const token = process.env.CARETTA_TOKEN!;
export const proxyServers = process.env.PROXY_SERVERS!.split(',').map(x=>x.trim()).filter(x=>x.length>0);
