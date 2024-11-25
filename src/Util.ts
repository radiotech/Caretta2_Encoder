// Define an asynchronous wait function (a promise that resolves after a given timeout)
export const wait = (timeout: number)=>{
    return new Promise<void>(resolve=>{
        setTimeout(()=>{resolve();},timeout);
    });
};
export const capitalize = (text: string)=>text.substr(0,1).toUpperCase()+text.substr(1);
