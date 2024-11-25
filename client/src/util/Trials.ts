import {fsExists, fsReadFile, fsWriteFile, fsRenameFile, fsMakeDir, fsReadDir} from './Util';

// TODO: Consider refactoring - use exported functions rather than a class
export default class Trials {
    // Define variables that track the current pending write operations
    private static pendingWrites: {path: string, id: string, callback: (()=>Promise<void>)}[] = [];
    private static writing = false;
    
    // Define a helper function to ensure that a given trials path exists
    private static async setupPath(path: string){
        if(!(await fsExists('./data'))){
            await fsMakeDir('./data');
        }
        if(!(await fsExists('./data/trials'))){
            await fsMakeDir('./data/trials');
        }
        if(!(await fsExists(`./data/trials/${path}`))){
            await fsMakeDir(`./data/trials/${path}`);
        }
    }

    // Define a function to initiate the processing of pending write operations
    private static async write(){
        if(!Trials.writing){
            while(Trials.pendingWrites.length>0){
                console.log(`${Trials.pendingWrites.length} pending writes`);
                Trials.writing = true;
                let nextWrite = Trials.pendingWrites.shift()!;
                try {
                    await nextWrite.callback();
                } catch(e){
                    console.error('File write error');
                    console.error(e);
                }
                Trials.writing = false;
            }
        }
    }
    
    // Define a function to list the trials under a given path
    static async listTrials(path: string){
        await Trials.setupPath(path);
        // May want to check for non-indexed or empty trial files
        // let fileMap: Record<string,1> = {};
        // let files = ...;
        // files.forEach(x=>{fileMap[x]=1;});
        return (await Promise.all((await fsReadDir(`./data/trials/${path}`)).filter(x=>x.indexOf('.index.json')>0).map(async x=>{
            try {
                return {id: x, data: `${await fsReadFile(`./data/trials/${path}/${x}`)}`};
            } catch(e){
                return {id: x, data: ''};
            }
        }))).map(x=>{
            try {
                return {id: x.id.replace('.index.json',''), data: JSON.parse(`${x.data}`)};
            } catch(e){
                return undefined!;
            }
        }).filter(x=>typeof x === 'object');
    }

    // Define a function to save trial data
    static async saveTrial(path: string, id: string, data: string, index: string){
        await Trials.setupPath(path);
        Trials.pendingWrites = Trials.pendingWrites.filter(x=>x.path!==path||x.id!==id);
        Trials.pendingWrites.push({path, id, callback: async ()=>{
            await Promise.all([
                fsWriteFile(`./data/trials/${path}/${id}.json`,data),
                fsWriteFile(`./data/trials/${path}/${id}.index.json`,index),
            ]);
        }});
        Trials.write();
    }

    // Define a function to load the data for a given trial
    static async loadTrial(path: string, id: string){
        await Trials.setupPath(path);
        try {
            return JSON.parse(`${await fsReadFile(`./data/trials/${path}/${id}.json`)}`);
        } catch(e){
            console.error(e);
        }
        return undefined;
    }

    // Define a function to delete the data for a given trial
    static async deleteTrial(path: string, id: string){
        await Trials.setupPath(path);
        if(!(await fsExists(`./data/trials/${path}/trash`))){
            await fsMakeDir(`./data/trials/${path}/trash`);
        }
        try {
            await fsRenameFile(`./data/trials/${path}/${id}.index.json`,`./data/trials/${path}/trash/${id}.index.json`);
            await fsRenameFile(`./data/trials/${path}/${id}.json`,`./data/trials/${path}/trash/${id}.json`);
        } catch(e){
            console.error(e);
        }
    }
}
