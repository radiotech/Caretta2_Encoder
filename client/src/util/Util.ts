import fs from 'fs';
import {promisify} from 'util';

// This file defines various miscellaneous helper functions and types

export const parseNumber = (value: string | number)=>{
    let val = typeof value == 'number' ? value : parseFloat(value);
    if(!isFinite(value as any)){
        return NaN;
    }
    return val;
};
export const isInteger = (value: string | number)=>!isNaN(parseNumber(value))&&Math.floor(parseNumber(value))==parseNumber(value);
export const formatDate = (time: number, date = true, hours = true, minutes = true, seconds = false)=>{
    return new Date(time).toLocaleString('en-US',{
        year: date?"numeric":undefined, month: date?"numeric":undefined, day: date?"numeric":undefined, hour: hours?"numeric":undefined, minute: minutes?"numeric":undefined, second: seconds?"numeric":undefined
    });
};
export const timeUnitMap = {seconds: 1e3, minutes: 6e4, hours: 36e5};
export const makeDurationString = (duration: number, neverZero = false, ceil = false)=>{
    duration = duration/1000; // Convert to seconds
    let durationUnits = duration%60==0?'minute':duration<120?'second':'minute';
    let durationValue = Math.max((ceil?ceilTo:round)(durationUnits=='minute'?duration/60:duration,durationUnits=='minute'?1:0),neverZero?1:0);
    durationUnits = durationValue==1?durationUnits:`${durationUnits}s`;
    return `${durationValue>999?'>999':durationValue} ${durationUnits}`;
};

export const capitalize = (text: string)=>text.substr(0,1).toUpperCase()+text.substr(1);
export const titleCase = (text: string)=>text.split(/ /g).map(word=>`${word.substring(0,1).toUpperCase()}${word.substring(1)}`).join(' ');

export const wrapAngle = (val: number, positive = false)=>{
    if(isNaN(val) || !isFinite(val)){
        return val;
    }
    while(val >= (positive?360:180)){
        val -= 360;
    }
    while(val < (positive?0:-180)){
        val += 360;
    }
    return val;
}
export const confineValue = (val: number, min: number, max: number)=>Math.max(min,Math.min(max,val));
export const toEntries = <K extends string, T extends any>(x: Partial<Record<K,T>>): [K,T][] => Object.keys(x).map(y=>[y as K,x[y as K]!]);
export const fromEntries = <K extends string, T>(x: [K,T][])=>{
    let res: Record<K,T> = {} as any;
    x.forEach(y=>{
        res[y[0]] = y[1];
    });
    return res;
}
// export const pick = <K extends {}>(obj: K, keys: (keyof K)[])=>fromEntries(toEntries(obj).filter(x=>keys.indexOf(x[0])>-1)) as Partial<K>;
export const pick = <K extends {}, L extends keyof K>(obj: K, keys: L[])=>fromEntries(toEntries(obj).filter(x=>keys.indexOf(x[0])>-1)) as Pick<K,L>;
export const omit = <K extends {}, L extends keyof K>(obj: K, keys: (keyof K)[])=>fromEntries(toEntries(obj).filter(x=>keys.indexOf(x[0])==-1)) as Omit<K,L>;
export const insertElement = <E>(xs: E[], i: number, ...vals: E[])=>[...xs.slice(0,i),...vals,...xs.slice(i)];
export const duplicateElement = <E>(xs: E[], i: number)=>insertElement(xs,i,xs[i]);
export const setsEqual = (a: any[], b: any[])=>a.length==b.length&&a.every(x=>b.includes(x));

// Vector util types and functions
export type properties = {intensity: number, inclination: number, declination: number};
export type absolutePosition = {up: number, north: number, west: number};
export type relativePosition = {up: number, forward: number, left: number};

export const agnosticOperation = <T extends absolutePosition|relativePosition>(p: T, op: (p: absolutePosition)=>absolutePosition)=>(isAbsolute(p)?op(p as absolutePosition):toRelative(op(toAbsolute(p)))) as T;

export const dot = <T extends Record<string,number>>(a: T, b: T)=>{
    if(typeof a !== 'object' || typeof b !== 'object' || Object.keys(a).length !== Object.keys(b).length || Object.keys(a).some(k=>a[k]===undefined||b[k]===undefined||isNaN(a[k])||isNaN(b[k]))){
        throw new Error('Dot product error');
    }
    return Object.keys(a).map(k=>a[k]*b[k]).reduce((a,b)=>a+b,0);
}
export const mag = <T extends Record<string,number>>(a: T)=>{
    return Math.sqrt(Object.keys(a).map(k=>a[k]*a[k]).reduce((a,b)=>a+b,0));
}
export const scale = <T extends Record<string,number>>(a: T, b: number)=>{
    if(typeof a !== 'object' || Object.keys(a).some(k=>a[k]===undefined||isNaN(a[k]))){
        throw new Error('Scalar multiplication error');
    }
    return fromEntries(toEntries(a).map(x=>[x[0],x[1]*b])) as T;
}
export const subtract = <T extends Record<string,number>>(a: T, b: T)=>{
    if(typeof a !== 'object' || typeof b !== 'object' || Object.keys(a).length !== Object.keys(b).length || Object.keys(a).some(k=>a[k]===undefined||b[k]===undefined||isNaN(a[k])||isNaN(b[k]))){
        throw new Error('Subtraction error');
    }
    return fromEntries(toEntries(a).map(x=>[x[0],x[1]-b[x[0]]])) as T;
}
export const add = <T extends Record<string,number>>(...xs: T[])=>{
    if(xs.length == 0 || xs.some(x=>typeof x != 'object' || Object.keys(x).length != Object.keys(xs[0]).length || Object.keys(xs[0]).some(k=>x[k]===undefined||isNaN(x[k])))){
        throw new Error('Addition error');
    }
    let res = {...xs[0]};
    xs.filter((x,i)=>i>0).forEach(x=>{
        toEntries(x).forEach(y=>{
            (res as any)[y[0]] += y[1];
        });
    });
    return res;
}
export const mean = <T extends Record<string,number>>(...xs: T[])=>scale(add(...xs),1/xs.length);
export const isAbsolute = (p: Partial<absolutePosition>|Partial<relativePosition>)=>(p as any).forward===undefined&&(p as any).left===undefined;
export const toAbsolute = <T extends Partial<absolutePosition>|Partial<relativePosition>>(p: T)=>(isAbsolute(p)?p:{
    up: p.up,
    north: (p as any).forward,
    west: (p as any).left,
}) as T extends absolutePosition|relativePosition?absolutePosition:Partial<absolutePosition>;
export const toRelative = <T extends Partial<absolutePosition>|Partial<relativePosition>>(p: T)=>(isAbsolute(p)?{
    up: p.up,
    forward: (p as any).north,
    left: (p as any).west,
}:p) as T extends absolutePosition|relativePosition?relativePosition:Partial<relativePosition>;

export const V = {
    dot,
    mag,
    mult: scale,
    div: ((a: any, b: any)=>scale(a,1/b)) as typeof scale,
    add,
    sub: subtract,
    mean,
};
(window as any).V = V;

// Search functions
export const binarySearch = (test: (v: number)=>boolean, validPoint = 0, invalidPoint = 1, minSteps = 0, maxSteps = 10000, maxError = (validPoint+invalidPoint)/2*1e-8)=>{
    let step = 0;
    if(minSteps > 0){
        for(let i = 1; i <= minSteps; i++){
            step++;
            let newPoint = invalidPoint+(validPoint-invalidPoint)*i/(minSteps+1);
            if(test(newPoint)){
                validPoint = newPoint;
                break;
            } else {
                invalidPoint = newPoint;
            }
        }
    }
    for(; step < maxSteps; step++){
        if(Math.abs(validPoint-invalidPoint) <= maxError){
            break;
        }
        let newPoint = (validPoint+invalidPoint)/2;
        if(test(newPoint)){
            validPoint = newPoint;
        } else {
            invalidPoint = newPoint;
        }
    }
    return validPoint;
};
export const minSearch = (test: (val: number)=>number, minX: number, maxX: number, maxDX: number, memoizeTest = true)=>{
    let test2 = test;
    if(memoizeTest){
        test2 = memoize(val=>test(Math.round(val/(maxDX/10))*(maxDX/10)));
    }
    while(maxX-minX > maxDX){
        let sum = [0];
        let minSum = Number.POSITIVE_INFINITY;
        let minI = 4;
        for(let i = 0; i <= 6; i++){
            sum[i+1] = sum[i] + test2(minX+(maxX-minX)*i/6);
            if(i>=3){
                let s = sum[i+1]-sum[i-3];
                if(s<minSum){
                    //console.log(s);
                    minSum = s;
                    minI = i;
                }
            }
        }
        let newMaxX = minX+(maxX-minX)*minI/6;
        minX = minX+(maxX-minX)*(minI-3)/6;
        maxX = newMaxX;
    }
    return (minX+maxX)/2;
};

// Function modifiers
export const memoize = <F extends (...args: any[])=>any>(f: F, argMap = (...args: F extends ((...x: infer X)=>any)?X:never)=>JSON.stringify(args)) => {
    let cache: Record<string,any> = {};
    let memoized = (...args: F extends ((...x: infer X)=>any)?X:never)=>{
        var key = argMap(...args);
        if(cache[key] !== undefined){
            return cache[key];
        } else {
            let res = f(...args);
            cache[key] = res;
            return res;
        }
    };
    return memoized as any;
};
export const throttle = <F extends ()=>any>(f: F, delay: number) => {
    let lastInvokeTime = 0;
    let disabled = false;
    let scheduled = false;
    let lastResult: any = undefined;
    return {
        throttled: (()=>{
            let invoke = ()=>{
                lastInvokeTime = new Date().getTime();
                scheduled = false;
                if(!disabled){
                    lastResult = f();
                }
            };
            if(!scheduled){
                let pauseTime = lastInvokeTime + delay - new Date().getTime();
                if(pauseTime <= 0){
                    invoke();
                } else {
                    scheduled = true;
                    setTimeout(invoke,pauseTime);
                }
            }
            return lastResult;
        }) as F,
        disable: ()=>{disabled = true;},
    };
};
export const debounce = (rise: (()=>void) | undefined, fall: (()=>void) | undefined, delay: number) => {
    let disabled = false;
    let scheduled = false;
    let timeout: NodeJS.Timeout = undefined!;
    return {
        debounced: (()=>{
            if(scheduled){
                clearTimeout(timeout);
            } else {
                if(!disabled && rise !== undefined){
                    rise();
                }
            }
            scheduled = true;
            timeout = setTimeout(()=>{
                scheduled = false;
                if(!disabled && fall !== undefined){
                    fall();
                }
            },delay);
        }),
        disable: ()=>{disabled = true;},
    };
};

export type PromiseLock = {current: Promise<any>};
export const makePromiseLock = (): PromiseLock=>({current: Promise.resolve()});
export const withLock = async <T>(lock: PromiseLock, action: ()=>T|Promise<T>)=>{
    lock.current = (async ()=>{
        try {
            await lock.current;
        } catch(e){}
        return await action();
    })();
    return await lock.current as T;
};

export const rayleighStatistics = (bearings: number[])=>{
    let vectors = bearings.map(x=>({x: Math.cos(x/180*Math.PI), y: Math.sin(x/180*Math.PI)}));
    let meanVector = vectors.length>0?vectors.map(x=>({x: x.x/vectors.length, y: x.y/vectors.length})).reduce((a,b)=>({x: a.x+b.x, y: a.y+b.y})):{x:0,y:0};
    return {
        meanR: Math.sqrt(meanVector.x**2+meanVector.y**2),
        meanAngle: wrapAngle(Math.atan2(meanVector.y,meanVector.x)/Math.PI*180,true),
    };
};

export const wait = (timeout: number)=>{
    return new Promise<void>(resolve=>{
        setTimeout(()=>{resolve();},timeout);
    });
};

export const conjunction = (xs: string[], del: string, singleDel: string, finalDel: string)=>xs.length<3?xs.join(singleDel):`${xs.slice(0,-1).join(del)}${finalDel}${xs[xs.length-1]}`
export const andConjunction = (xs: string[])=>conjunction(xs, ', ', ' and ', ', and ');
export const orConjunction = (xs: string[])=>conjunction(xs, ', ', ' or ', ', or ');

export const range = (n: number)=>{
    let res = [];
    for(let i = 0; i < n; i++){
        res[i] = i;
    }
    return res;
}
export function makeID(length = 16){
    return range(length).map(()=>Math.floor(Math.random()*16).toString(16)).join('');
}
export function makeB36ID(length = 6){
    return range(length).map(()=>Math.floor(Math.random()*36).toString(36)).join('');
}

export const sort = <T>(list: T[], compare?: (a: T, b: T)=>number)=>{
    let newList = [...list];
    newList.sort(compare);
    return newList;
};
export const valOrDash = (val?: number, units?: string, decimalPlaces = 0, decimalPadding = true)=>val===undefined||isNaN(val)?'–':`${decimalPadding?decimalPad(val,decimalPlaces):round(val,decimalPlaces)}${units===undefined?'':` ${units}`}`;
export const decimalPad = (val: number, decimalPlaces: number, trim = true)=>(((x,y)=>x.indexOf('.')<0?`${x}${y.length>0?'.':''}${y}`:`${x}${y}`.substr(0,x.indexOf('.')+decimalPlaces+1))(`${trim?round(val,decimalPlaces):val}`,range(decimalPlaces).map(x=>'0').join('')));
export const round/*To*/ = (val: number, decimalPlaces = 0)=>Math.round(val*(10**decimalPlaces))/(10**decimalPlaces);
export const roundBy = (val: number, precision = 1)=>Math.round(val/precision)*precision;
export const ceilTo = (val: number, decimalPlaces = 0)=>Math.ceil(val*(10**decimalPlaces))/(10**decimalPlaces);

export const spellcheck = {spellCheck: true/*, onContextMenu: async (...e: any)=>{
    //e.preventDefault();
    console.log(e);
    //let res = await ipcRenderer.invoke('spellcheck',e);
}*/};

export const fsExists = promisify(fs.exists);
export const fsUnlink = promisify(fs.unlink);
export const fsReadFile = promisify(fs.readFile);
export const fsWriteFile = promisify(fs.writeFile);
export const fsCopyFile = promisify(fs.copyFile);
export const fsRenameFile = promisify(fs.rename);
export const fsReadDir = promisify(fs.readdir);
export const fsMakeDir = promisify(fs.mkdir);

export const readFirstLine = (path: string)=>new Promise<string>((resolve, reject)=>{
    let rs = fs.createReadStream(path, {encoding: 'utf8'});
    let acc = '';
    let pos = 0;
    let index: number;
    rs.on('data', chunk=>{
        chunk = `${chunk}`;
        index = chunk.indexOf('\n');
        acc += chunk;
        index !== -1 ? rs.close() : pos += chunk.length;
    })
    .on('close', ()=>{
        resolve(acc.slice(0, pos + index));
    })
    .on('error',  e=>{
        reject(e);
    });
});

export const copyDirSync = (from: string, to: string)=>{
    let files = fs.readdirSync(from);
    if(!fs.existsSync(to)){
        fs.mkdirSync(to);
    }
    files.forEach(x=>{
        let stat = fs.statSync(`${from}/${x}`);
        if(stat.isDirectory()){
            copyDirSync(`${from}/${x}`,`${to}/${x}`);
        } else {
            fs.copyFileSync(`${from}/${x}`,`${to}/${x}`);
        }
    });
};

// Takes a union of objects and returns the intersection of all object keys
// export type KeyOfUnion<T> = T extends T ? keyof T : never;
// export type KeyOfUnionDepth2<T> = T extends T ? {[K in keyof T]: T[K] extends Record<string,any> ? keyof T[K] : never}[keyof T] : never;

// Takes a union of objects and returns their intersection
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type ObjectPaths<T> = T extends T ? TypeName<T> extends 'object' ? {[K in keyof T]-?: [K, ...ObjectPaths<T[K]>]}[keyof T] : [] : never;
export type ObjectPathsCompare<T> = T extends T ? TypeName<T> extends 'object' ? {[K in keyof T]-?: [K, ...ObjectPathsCompare<T[K]>]}[keyof T] : TypeName<T> extends 'number' ? []|['roundTo'|'roundBy'|'diff',number] : [] : never;

export type GeneralizeUnion<T> = T extends T ? TypeName<T> extends 'object' ? {[K in keyof T]: TypeName<T[K]> extends 'number' ? number : TypeName<T[K]> extends 'string' ? string : T[K]} : never : never;

type TuplePrepend<Tuple extends any[], NewElement> =
    ((h: NewElement, ...t: Tuple) => any) extends ((...r: infer ResultTuple) => any) ? ResultTuple : never;

type Consumer<Value> = (value: Value) => void;

type IntersectionFromUnion<Union> =
    (Union extends any ? Consumer<Union> : never) extends (Consumer<infer ResultIntersection>)
    ? ResultIntersection
    : never;

type TypeName<T> = T extends string
    ? "string"
    : T extends number
    ? "number"
    : T extends boolean
    ? "boolean"
    : T extends undefined
    ? "undefined"
    : T extends Function
    ? "function"
    : T extends Array<any>
    ? "array"
    : "object";

// Expands object types recursively
type ExpandRecursively<T> = T extends object
    ? T extends Function
        ? T
        : T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
    : T;

type OverloadedConsumerFromUnion<Union> = IntersectionFromUnion<Union extends any ? Consumer<Union> : never>;

type UnionLast<Union> = OverloadedConsumerFromUnion<Union> extends ((a: infer A) => void) ? A : never;

type UnionExcludingLast<Union> = Exclude<Union, UnionLast<Union>>;

type TupleFromUnionRec<RemainingUnion, CurrentTuple extends any[]> =
    [RemainingUnion] extends [never]
    ? { result: CurrentTuple }
    : { result: TupleFromUnionRec<UnionExcludingLast<RemainingUnion>, TuplePrepend<CurrentTuple, UnionLast<RemainingUnion>>>['result'] };

export type TupleFromUnion<Union> = TupleFromUnionRec<Union, []>['result'];
