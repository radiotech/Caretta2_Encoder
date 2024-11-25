import {useEffect, useRef, useState} from "react";
import {ObjectPathsCompare, round, roundBy} from "./Util";

// Store information related to each context in a static map
const contexts: Record<string,{
    hookSetters: ((newState: any)=>void)[],
    modified: boolean,
    staticState: {current: any},
}> = {};

// Periodically update context states when their respective static values have changed
setInterval(()=>{
    // For each context
    Object.keys(contexts).forEach(x=>{
        // If this context has been modified since the last interval callback
        if(contexts[x].modified){
            // Call each useContext hook setter with the new state value
            contexts[x].hookSetters.forEach(y=>{
                y(contexts[x].staticState.current);
            });
            // Note that all modifications have been synced for this context
            contexts[x].modified = false;
        }
    });
}, 200);

// Define an export a function that builds global contexts
export const buildContext = <state, action>(contextName: string, initialState: state, reduce: (state: state, action: action)=>state, reduceSideEffects: (oldState: state, newState: state, action: action)=>void = ()=>{})=>{

    // (exported) Create a static access point for this context
    const StaticState = {
        current: initialState,
        set: async (action: action | ((s: state)=>action), delaySetState = false)=>{
            // Update the static context state and call side effect functions
            let resolvedAction = typeof action == 'function'?(action as any)(StaticState.current):action;
            let oldState = StaticState.current;
            StaticState.current = reduce(StaticState.current, resolvedAction);
            reduceSideEffects(oldState, StaticState.current, resolvedAction);
            if(delaySetState){
                // Note that these changes need to by synced to all useContext hooks
                contexts[contextName].modified = true;
            } else {
                // Sync these changes to all useContext hooks
                contexts[contextName].hookSetters.forEach(y=>{
                    y(StaticState.current);
                });
                contexts[contextName].modified = false;
            }
        },
    };

    // (exported) Create a hook for this context
    const useContextState = (...compare: [[]] | (ObjectPathsCompare<state> | ((a: state, b: state)=>boolean))[])=>{
        let [state, setState] = useState(StaticState.current);
        let compareRef = useRef(compare);
        compareRef.current = compare;
        useEffect(()=>{
            let currentState = state;
            let compareAndSetState = (newState: state)=>{
                
                let compare: (string[] | ((a: state, b: state)=>boolean))[] = compareRef.current as any;
                if(compare.length == 0 || !((compare.length==1 && typeof compare[0] == 'object' && compare[0].length == 0) || compare.every(c=>{
                    if(typeof c == 'function'){
                        return c(currentState,newState);
                    }
                    let a: any = currentState;
                    let b: any = newState;
                    for(let i = 0; true; i++){
                        if(Array.isArray(a) || Array.isArray(b)){
                            throw new Error('Attempted to compare object paths that include arrays');
                        }
                        if(typeof a != typeof b){
                            return false;
                        }
                        if(typeof a != 'object' || a == null){
                            if(typeof a == 'number'){
                                if(isNaN(a) && isNaN(b)){
                                    return true;
                                }
                                if(c.length == i+2){
                                    switch(c[i]){
                                        case 'roundTo':
                                            return round(a, c[i+1] as any) == round(b, c[i+1] as any);
                                        case 'roundBy':
                                            return roundBy(a, c[i+1] as any) == round(b, c[i+1] as any);
                                        case 'diff':
                                            return Math.abs(a-b) <= (c[i+1] as any);
                                        default:
                                            throw new Error('An invalid compare operation was provided');
                                    }
                                }
                            }
                            return a === b;
                        }
                        a = a[c[i]];
                        b = b[c[i]];
                    }
                }))){
                    currentState = newState;
                    setState(newState);
                }
            };
            contexts[contextName].hookSetters.push(compareAndSetState);
            return ()=>{
                contexts[contextName].hookSetters = contexts[contextName].hookSetters.filter(x=>x!==compareAndSetState);
            };
        },[setState]);
        return state;
    };

    // Add this context to the static context map
    contexts[contextName] = {
        hookSetters: [],
        modified: false,
        staticState: StaticState,
    };

    // Return the exported values for this context
    return [StaticState, useContextState] as const;
};
