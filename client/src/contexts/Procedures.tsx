import {buildContext} from '../util/Contexts';
import {fromEntries, fsExists, fsMakeDir, fsReadDir, fsReadFile, fsRenameFile, fsWriteFile, makeB36ID, makePromiseLock, memoize, omit, parseNumber, pick, readFirstLine, sort, throttle, timeUnitMap, toEntries, withLock} from '../util/Util';

export type step = {
    id: string,
    complete?: true,
} & ({
    type: 'wait',
    time: string,
    units: keyof typeof timeUnitMap,
    startTime?: number,
} | {
    type: 'report',
    text: string,
    method: 'mean_bearing' | 'r_statistic',
    from: string,
    to: string,
    time?: number,
} | {
    type: 'label',
    text: string,
    time?: number,
} | {
    type: 'comment',
    text: string,
} | {
    type: 'end_trial',
});

export const initialStepStates: Record<string,step> = {
    wait: {
        type: 'wait',
        id: '',
        time: '',
        units: 'minutes',
    },
    report: {
        type: 'report',
        id: '',
        text: '',
        method: 'mean_bearing',
        from: '',
        to: '',
    },
    label: {
        type: 'label',
        id: '',
        text: '',
    },
    comment: {
        type: 'comment',
        id: '',
        text: '',
    },
    end_trial: {
        type: 'end_trial',
        id: '',
    },
};

export type procedure = {
    id: string,
    title: string,
    date: number,
    notes: string,
    steps: step[],
};

// Define and export a type for this context
export type state = {
    list: Pick<procedure,'id'|'title'|'date'>[],
    detailed: Record<string,procedure>,
};

// Define and export a list of actions that this context supports
export type action = {
    type: 'set', id: string, val: Partial<procedure>,
} | {
    type: 'set_list', val: Pick<procedure,'id'|'title'|'date'>[],
}; // TODO: Unload procedures

const makeProcedure = (): procedure => ({
    id: '',
    title: 'New Procedure',
    date: new Date().getTime(),
    notes: '',
    steps: [],
});

// Build and export a static state object, context object, context provider, and useContext hook for this context
export const [StaticProceduresState, useProceduresState] = buildContext<state, action>(
    /* Name */ 'Procedures',
    /* Initial State */ {
        list: [],
        detailed: {},
    },
    /* Reducer */ (state, action) => {
        switch (action.type) {
            case 'set':
                let newList = state.list;
                let newDetailed = {...(state.detailed[action.id]??makeProcedure()), ...action.val, id: action.id};
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
                    newList = sort([...newList, pick(newDetailed,['id','title','date'])], procedureCompareFn);
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
                await getProcedureSaveFn(action.id)();
        }
    },
);

let pendingNameChanges: {from: string, to: string}[] = [];
let pendingCreations: string[] = [];
const procedureCompareFn = (a: Pick<procedure,'date'>, b: Pick<procedure,'date'>)=>b.date-a.date;
const procedureLock = makePromiseLock();

const infoToFileName = (info: Pick<procedure,'id'|'title'>)=>`${info.id} - ${info.title.replace(/[\/?<>\\:*|"]+/g,'')}.c2`;
const fileNameToInfo = (fileName: string)=>(matches=>matches==null?undefined:fromEntries(matches.filter((x,i)=>i>0).map((x,i)=>[['id','title'][i],x])) as Pick<procedure,'id'|'title'>)(/^([0-9a-z]{6}) ?-? ?(.*)\.c2$/i.exec(fileName));

const setupPath = async ()=>{
    if(!(await fsExists(`./data/procedures`))){
        await fsMakeDir(`./data/procedures`, {recursive: true});
    }
};

const processPendingFileChanges = async ()=>{
    let changesMade = false;
    while(pendingNameChanges.length > 0){
        changesMade = true;
        try {
            if((await fsExists(`./data/procedures/${pendingNameChanges[0].from}`)) && !(await fsExists(`./data/procedures/${pendingNameChanges[0].to}`))){
                await fsRenameFile(`./data/procedures/${pendingNameChanges[0].from}`,`./data/procedures/${pendingNameChanges[0].to}`);
            }
        } catch(e){}
        pendingNameChanges = pendingNameChanges.filter((x,i)=>i>0);
    }
    return changesMade;
};

const refreshProcedureList = async ()=>{
    // Reconcile differences between the info and directory procedure lists

    // Get all file names after processing pending file changes (if pending file changes were scheduled while fetching the file names, fetch them again)
    await processPendingFileChanges();
    let filesNames: string[] = [];
    do {
        filesNames = await fsReadDir(`./data/procedures`);
    } while(await processPendingFileChanges())

    let fileIndex = filesNames.map(x=>({fileName: x, info: fileNameToInfo(x)!})).filter(x=>x.info != undefined);
    
    let fileIDMap: Record<string,typeof fileIndex[number]> = {}
    for(let x of fileIndex){
        // Ensure all files have unique ids
        if(fileIDMap[x.info.id] != undefined){
            await fsRenameFile(`./data/procedures/${x.fileName}`,`./data/procedures/${makeB36ID()}${x.fileName.slice(6)}`);
            await refreshProcedureList();
            return;
        }
        // Ensure all files have names that match the naming restrictions
        if(x.fileName != infoToFileName(x.info)){
            await fsRenameFile(`./data/procedures/${x.fileName}`,`./data/procedures/${infoToFileName(x.info)}`);
            await refreshProcedureList();
            return;
        }
        fileIDMap[x.info.id] = x;
    }
    // Remove files from the pending creations list if they already exist
    pendingCreations = pendingCreations.filter(x=>fileIDMap[x] == undefined);

    let procedures = StaticProceduresState.current;
    let lastFileIDMap = fromEntries(procedures.list.map(x=>[x.id, {fileName: infoToFileName(x), info: x}]));
    
    // If any procedures were added to the file system, retrieve their index details and add them to the list
    if(fileIndex.some(x=>lastFileIDMap[x.info.id] == undefined)){
        // Load index details
        let newItems = await Promise.all(fileIndex.filter(x=>lastFileIDMap[x.info.id] == undefined).map(async x=>{
            try {
                return {...JSON.parse(await readFirstLine(`./data/procedures/${x.fileName}`)), id: x.info.id} as Pick<procedure,'id'|'title'|'date'>;
            } catch(e){
                console.error(`Failed to read index data for file ${x.fileName}`, e);
                return {date: Number.NaN, ...x.info};
            };
        }));
        if(newItems.some(x=>StaticProceduresState.current.list.every(y=>y.id != x.id))){
            StaticProceduresState.set({type: 'set_list', val: sort([
                ...StaticProceduresState.current.list,
                ...newItems.filter(x=>StaticProceduresState.current.list.every(y=>y.id != x.id)),
            ],procedureCompareFn)});
        }
        refreshProcedureList();
        return;
    };

    let newList = procedures.list;

    // If any procedures were removed from the file system, remove them from the list
    if(newList.some(x=>fileIDMap[x.id] == undefined && !pendingCreations.includes(x.id))){
        newList = newList.filter(x=>fileIDMap[x.id] != undefined || pendingCreations.includes(x.id));
    }

    // If the names of any procedures were updated, update the names in the list (and details, if applicable)
    if(newList.some(x=>!pendingCreations.includes(x.id) && fileIDMap[x.id].fileName != lastFileIDMap[x.id].fileName)){
        newList.forEach(x=>{
            if(!pendingCreations.includes(x.id) && fileIDMap[x.id].fileName != lastFileIDMap[x.id].fileName && procedures.detailed[x.id] != undefined){
                StaticProceduresState.set({type: 'set', id: x.id, val: {title: fileIDMap[x.id].info.title}});
            }
        });
        newList = newList.map(x=>!pendingCreations.includes(x.id) && fileIDMap[x.id].fileName != lastFileIDMap[x.id].fileName?{...x, title: fileIDMap[x.id].info.title}:x);
    }

    if(newList != procedures.list){
        StaticProceduresState.set({type: 'set_list', val: sort(newList,procedureCompareFn)});
    }
};

const withProcedureLock = async <T,/* Comma is required in TSX files */>(action?: ()=>T|Promise<T>)=>{
    // Execute code with the procedure lock
    // Ensures that the procedure save directory is created and that all rename operations are complete before executing the provided code
    // Once the lock is obtained, a snapshot of the current procedure list/detailed state should be captured synchronously if they are needed as they may mutate during async execution
    await withLock(procedureLock, async ()=>{
        await setupPath();
        await refreshProcedureList();
        return action==undefined?undefined:(await action());
    });
};

export const loadProcedure = async (id: string)=>{
    try {
        await withProcedureLock(async ()=>{
            let info = StaticProceduresState.current.list.filter(x=>x.id==id)[0];
            let fileContents = `${await fsReadFile(`./data/procedures/${infoToFileName(info)}`)}`;
            let parsedInfo = JSON.parse(fileContents.slice(fileContents.indexOf('\n')+1));
            parsedInfo = {...parsedInfo, steps: (parsedInfo.steps as step[])};
            // The file name may have been changed by the user - merge the loaded data with the file info to account for this (also to include the id in the detailed data)
            StaticProceduresState.set({type: 'set', id, val: {...parsedInfo, ...info}});
        });
        return true;
    } catch(e){
        console.error(e);
    }
    return false;
};

export const deleteProcedure = async (id: string)=>{
    try {
        await withProcedureLock(async ()=>{
            let info = StaticProceduresState.current.list.filter(x=>x.id==id)[0];
            if(await fsExists(`./data/procedures/${infoToFileName(info)}`)){
                if(!(await fsExists(`./data/procedures/deleted`))){
                    await fsMakeDir(`./data/procedures/deleted`);
                }
                await fsRenameFile(`./data/procedures/${infoToFileName(info)}`,`./data/procedures/deleted/${infoToFileName(info)}`);
            }
            StaticProceduresState.set(s=>({type: 'set_list', val: s.list.filter(x=>x.id!=id)}));
            pendingCreations = pendingCreations.filter(x=>x!=id);
        });
        return true;
    } catch(e){
        console.error(e);
    }
    return false;
};

const getProcedureSaveFn = memoize((id: string)=>throttle(async ()=>{
    try {
        await withProcedureLock(async ()=>{
            let info = StaticProceduresState.current.detailed[id];
            if(info != undefined){
                let infoCSSAdjustment = {...info, steps: info.steps};
                await fsWriteFile(`./data/procedures/${infoToFileName(info)}`,`${
                    JSON.stringify(pick(info,['title','date']))
                }\n${
                    JSON.stringify(omit(infoCSSAdjustment,['id']),null,2)
                }`);
                // Remove files from the pending creations list once they are created
                pendingCreations = pendingCreations.filter(x=>x!=id);
            }
        });
    } catch(e){
        console.error(e);
    }
},1000).throttled);

// Periodically obtain the procedure lock to refresh the procedure list 
withProcedureLock();
setInterval(withProcedureLock,5000);
