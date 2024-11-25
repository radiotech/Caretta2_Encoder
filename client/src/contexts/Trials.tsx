import fs from 'fs';
import {buildContext} from '../util/Contexts';
import {copyDirSync, fromEntries, fsExists, fsMakeDir, fsReadDir, fsReadFile, fsRenameFile, fsWriteFile, makeB36ID, makePromiseLock, memoize, omit, pick, readFirstLine, sort, throttle, withLock} from '../util/Util';
import {state as EncoderState} from '../contexts/Encoder';
import {procedure} from '../contexts/Procedures';

export type trial = {
    id: string,
    title: string,
    date: number,
    comments: string,
    samples: {
        time: number,
        settings: {
            samplingPeriod: number,
        },
        encoder: EncoderState,
    }[],
    procedure?: procedure,
};

// Define and export a type for this context
export type state = {
    list: Pick<trial,'id'|'title'|'date'>[],
    detailed: Record<string,trial>,
};

// Define and export a list of actions that this context supports
export type action = {
    type: 'set', id: string, val: Partial<trial>,
} | {
    type: 'set_list', val: Pick<trial,'id'|'title'|'date'>[],
}; // TODO: Unload trials

const makeTrial = (): trial => ({
    id: '',
    title: 'New Trial',
    date: new Date().getTime(),
    comments: '',
    samples: [],
    procedure: undefined,
});

// Build and export a static state object, context object, context provider, and useContext hook for this context
export const [StaticTrialsState, useTrialsState] = buildContext<state, action>(
    /* Name */ 'Trials',
    /* Initial State */ {
        list: [],
        detailed: {},
    },
    /* Reducer */ (state, action) => {
        switch (action.type) {
            case 'set':
                let newList = state.list;
                let newDetailed = {...(state.detailed[action.id]??makeTrial()), ...action.val, id: action.id};
                let addInfoToList = false;
                if(state.list.every(x=>x.id != action.id)){
                    addInfoToList = true;
                } else {
                    let info = state.list.filter(x=>x.id==action.id)[0];
                    if((['date','title'] as const).some(x=>info[x]!=newDetailed[x])){
                        newList = state.list.filter(x=>x.id!=action.id);
                        addInfoToList = true;
                    }
                }
                if(addInfoToList){
                    newList = sort([...newList, pick(newDetailed,['id','title','date'])], trialCompareFn);
                }
                return {
                    ...state,
                    list: newList,
                    detailed: {...state.detailed, [action.id]: newDetailed},
                };
            case 'set_list':
                return {...state, list: action.val};
        }
    },
    /* Action Side Effects */ async (oldState, newState, action) => {
        switch (action.type) {
            case 'set':
                if(oldState.list.every(x=>x.id != action.id)){
                    pendingCreations.push(action.id);
                }
                let oldInfo = oldState.detailed[action.id];
                let newInfo = newState.detailed[action.id];
                if(pendingCreations.indexOf(action.id)==-1 && oldInfo != undefined && infoToFileName(oldInfo) != infoToFileName(newInfo)){
                    pendingNameChanges = [...pendingNameChanges, {from: infoToFileName(oldInfo), to: infoToFileName(newInfo)}];
                }
                // Only save trials once samples have been collected (do not save draft trials)
                if(newInfo.samples.length > 0){
                    await getTrialSaveFn(action.id)();
                }
        }
    },
);

let pendingNameChanges: {from: string, to: string}[] = [];
let pendingCreations: string[] = [];
const trialCompareFn = (a: Pick<trial,'date'>, b: Pick<trial,'date'>)=>b.date-a.date;
const trialLock = makePromiseLock();

const infoToFileName = (info: Pick<trial,'id'|'title'>)=>`${info.id} - ${info.title.replace(/[\/?<>\\:*|"]+/g,'')}.c2`;
const fileNameToInfo = (fileName: string)=>(matches=>matches==null?undefined:fromEntries(matches.filter((x,i)=>i>0).map((x,i)=>[['id','title'][i],x])) as Pick<trial,'id'|'title'>)(/^([0-9a-z]{6}) ?-? ?(.*)\.c2$/i.exec(fileName));

const setupPath = async ()=>{
    if(!(await fsExists(`./data/trials/turtle_vr`))){
        await fsMakeDir(`./data/trials/turtle_vr`, {recursive: true});
    }
};

const processPendingFileChanges = async ()=>{
    let changesMade = false;
    while(pendingNameChanges.length > 0){
        changesMade = true;
        try {
            if((await fsExists(`./data/trials/turtle_vr/${pendingNameChanges[0].from}`)) && !(await fsExists(`./data/trials/turtle_vr/${pendingNameChanges[0].to}`))){
                await fsRenameFile(`./data/trials/turtle_vr/${pendingNameChanges[0].from}`,`./data/trials/turtle_vr/${pendingNameChanges[0].to}`);
            }
        } catch(e){}
        pendingNameChanges = pendingNameChanges.filter((x,i)=>i>0);
    }
    return changesMade;
};

const refreshTrialList = async ()=>{
    // Reconcile differences between the info and directory trial lists

    // Get all file names after processing pending file changes (if pending file changes were scheduled while fetching the file names, fetch them again)
    await processPendingFileChanges();
    let filesNames: string[] = [];
    do {
        filesNames = await fsReadDir(`./data/trials/turtle_vr`);
    } while(await processPendingFileChanges())

    let fileIndex = filesNames.map(x=>({fileName: x, info: fileNameToInfo(x)!})).filter(x=>x.info != undefined);
    
    let fileIDMap: Record<string,typeof fileIndex[number]> = {}
    for(let x of fileIndex){
        // Ensure all files have unique ids
        if(fileIDMap[x.info.id] != undefined){
            await fsRenameFile(`./data/trials/turtle_vr/${x.fileName}`,`./data/trials/turtle_vr/${makeB36ID()}${x.fileName.slice(6)}`);
            await refreshTrialList();
            return;
        }
        // Ensure all files have names that match the naming restrictions
        if(x.fileName != infoToFileName(x.info)){
            await fsRenameFile(`./data/trials/turtle_vr/${x.fileName}`,`./data/trials/turtle_vr/${infoToFileName(x.info)}`);
            await refreshTrialList();
            return;
        }
        fileIDMap[x.info.id] = x;
    }
    // Remove files from the pending creations list if they already exist
    pendingCreations = pendingCreations.filter(x=>fileIDMap[x] == undefined);

    let trials = StaticTrialsState.current;
    let lastFileIDMap = fromEntries(trials.list.map(x=>[x.id, {fileName: infoToFileName(x), info: x}]));
    
    // If any trials were added to the file system, retrieve their index details and add them to the list
    if(fileIndex.some(x=>lastFileIDMap[x.info.id] == undefined)){
        // Load index details
        let newItems = await Promise.all(fileIndex.filter(x=>lastFileIDMap[x.info.id] == undefined).map(async x=>{
            try {
                return {...JSON.parse(await readFirstLine(`./data/trials/turtle_vr/${x.fileName}`)), id: x.info.id} as Pick<trial,'id'|'title'|'date'>;
            } catch(e){
                console.error(`Failed to read index data for file ${x.fileName}`, e);
                return {date: Number.NaN, ...x.info};
            };
        }));
        if(newItems.some(x=>StaticTrialsState.current.list.every(y=>y.id != x.id))){
            StaticTrialsState.set({type: 'set_list', val: sort([
                ...StaticTrialsState.current.list,
                ...newItems.filter(x=>StaticTrialsState.current.list.every(y=>y.id != x.id)),
            ],trialCompareFn)});
        }
        refreshTrialList();
        return;
    };

    let newList = trials.list;

    // If any trials were removed from the file system, remove them from the list
    if(newList.some(x=>fileIDMap[x.id] == undefined && !pendingCreations.includes(x.id))){
        newList = newList.filter(x=>fileIDMap[x.id] != undefined || pendingCreations.includes(x.id));
    }

    // If the names of any trials were updated, update the names in the list (and details, if applicable)
    if(newList.some(x=>!pendingCreations.includes(x.id) && fileIDMap[x.id].fileName != lastFileIDMap[x.id].fileName)){
        newList.forEach(x=>{
            if(!pendingCreations.includes(x.id) && fileIDMap[x.id].fileName != lastFileIDMap[x.id].fileName && trials.detailed[x.id] != undefined){
                StaticTrialsState.set({type: 'set', id: x.id, val: {title: fileIDMap[x.id].info.title}});
            }
        });
        newList = newList.map(x=>!pendingCreations.includes(x.id) && fileIDMap[x.id].fileName != lastFileIDMap[x.id].fileName?{...x, title: fileIDMap[x.id].info.title}:x);
    }

    if(newList != trials.list){
        StaticTrialsState.set({type: 'set_list', val: sort(newList,trialCompareFn)});
    }
};

const withTrialLock = async <T,/* Comma is required in TSX files */>(action?: ()=>T|Promise<T>)=>{
    // Execute code with the trial lock
    // Ensures that the trial save directory is created and that all rename operations are complete before executing the provided code
    // Once the lock is obtained, a snapshot of the current trial list/detailed state should be captured synchronously if they are needed as they may mutate during async execution
    await withLock(trialLock, async ()=>{
        await setupPath();
        await refreshTrialList();
        return action==undefined?undefined:(await action());
    });
};

export const loadTrial = async (id: string)=>{
    try {
        await withTrialLock(async ()=>{
            let info = StaticTrialsState.current.list.filter(x=>x.id==id)[0];
            let fileContents = `${await fsReadFile(`./data/trials/turtle_vr/${infoToFileName(info)}`)}`;
            let parsedInfo = JSON.parse(fileContents.slice(fileContents.indexOf('\n')+1));
            // The file name may have been changed by the user - merge the loaded data with the file info to account for this (also to include the id in the detailed data)
            StaticTrialsState.set({type: 'set', id, val: {...parsedInfo, ...info}});
        });
        return true;
    } catch(e){
        console.error(e);
    }
    return false;
};

export const deleteTrial = async (id: string)=>{
    try {
        await withTrialLock(async ()=>{
            let info = StaticTrialsState.current.list.filter(x=>x.id==id)[0];
            if(await fsExists(`./data/trials/turtle_vr/${infoToFileName(info)}`)){
                if(!(await fsExists(`./data/trials/turtle_vr/deleted`))){
                    await fsMakeDir(`./data/trials/turtle_vr/deleted`);
                }
                await fsRenameFile(`./data/trials/turtle_vr/${infoToFileName(info)}`,`./data/trials/turtle_vr/deleted/${infoToFileName(info)}`);
            }
            StaticTrialsState.set(s=>({type: 'set_list', val: s.list.filter(x=>x.id!=id)}));
            pendingCreations = pendingCreations.filter(x=>x!=id);
        });
        return true;
    } catch(e){
        console.error(e);
    }
    return false;
};

const getTrialSaveFn = memoize((id: string)=>throttle(async ()=>{
    try {
        await withTrialLock(async ()=>{
            let info = StaticTrialsState.current.detailed[id];
            if(info != undefined){
                await fsWriteFile(`./data/trials/turtle_vr/${infoToFileName(info)}`,`${
                    JSON.stringify(pick(info,['title','date']))
                }\n${
                    JSON.stringify(omit(info,['id']),null,2)
                }`);
                // Remove files from the pending creations list once they are created
                pendingCreations = pendingCreations.filter(x=>x!=id);
            }
        });
    } catch(e){
        console.error(e);
    }
},1000).throttled);

// Periodically obtain the trial lock to refresh the trial list 
withTrialLock();
setInterval(withTrialLock,5000);
