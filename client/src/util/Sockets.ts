import io, {Socket} from 'socket.io-client';
import * as Config from './Config';
import {StaticEncoderState} from '../contexts/Encoder';

// Create a list of proxy servers
let sockets: Socket[] = [];

// Define a hashmap relating connected modules to their proxy servers
const proxyIDs: Record<string,number> = {};

// Define a method for sending data to hardware modules
export const send = (type: string, data: any)=>{
    // Identify the proxy server id for this component
    let proxyID = proxyIDs[type];
    if(proxyID === undefined){
        return false;
    } else {
        sockets[proxyID].send({type, data});
        return true;
    }
};

// For each proxy server listed in the configuration file,
Config.proxyServers.forEach((endpoint,id)=>{
    try {
        // Connect to the proxy server
        let socket = io(`http://${endpoint}`,{
            //transports: ['websocket']
            query: {
                'caretta-token': Config.token,
                'caretta-type': 'client'
            }
        });
        sockets[id] = socket;

        // Handle messages received from the proxy server
        socket.on('message',(packet: any)=>{
            //console.log('Message',packet);
            if(typeof packet !== 'object'){
                console.error(`A received packet was not an object`);
            } else if(typeof packet.type !== 'string'){
                console.error(`A received packet did not have a type property`);
            } else {
                // If this message was sent from the proxy server,
                if(packet.type === 'proxy'){
                    if(!Array.isArray(packet.data)){
                        console.error(`A packet sent by the proxy server was not properly formatted`);
                    } else {
                        let devices: string[] = packet.data;
                        // Add any missing components to the components list
                        devices.forEach(device=>{
                            let proxyID = (proxyIDs as any)[device] as number|undefined;
                            if(proxyID !== id){
                                switch(device){
                                    case 'encoder':
                                        StaticEncoderState.set({type: 'set', val: {status: 'Connected'}});
                                        break;
                                }
                                if(proxyID !== undefined && proxyID!==id){
                                    console.error(`More than one ${device} instances may be connected to the client`)
                                }
                                (proxyIDs as any)[device] = id;
                            }
                        });
                        //remove any disconnected components from the components list
                        Object.keys(proxyIDs).forEach(type=>{
                            let proxyID = (proxyIDs as any)[type] as number|undefined;
                            if(proxyID === id && !devices.some(x=>x===type)){
                                switch(type){
                                    case 'encoder':
                                        StaticEncoderState.set({type: 'set', val: {status: 'Not Connected'}});
                                        break;
                                }
                                (proxyIDs as any)[type] = undefined;
                            }
                        });
                    }
                // Otherwise, if this message was sent from a hardware module,
                } else {
                    try {
                        // Process the message according to the module's type
                        switch(packet.type){
                            case 'encoder':
                                StaticEncoderState.set({type: 'set', val: packet.data},true);
                                break;
                        }
                    } catch(e){
                        console.error('Failed to parse module data',e);
                    }
                }
            }
        });
    } catch(e){
        console.error('Proxy server connection failed:',e);
    }
});
