import {buildContext} from '../util/Contexts';

// Define and export a type for this context
export type state = {
    path: string,
    data: any,
};

// Define and export a list of actions that this context supports
export type action = {
    type: 'set', val: string | state,
};

// Build and export a static state object, context object, context provider, and useContext hook for this context
export const [StaticRouteState, useRouteState] = buildContext<state, action>(
    /* Name */ 'Route',
    /* Initial State */ {
        path: '',
        data: undefined,
    },
    /* Reducer */ (state, action) => {
        switch (action.type) {
            case 'set':
                if(typeof action.val==='string'){
                    return {path: action.val, data: undefined};
                } else {
                    return action.val;
                }
                
        }
    },
);
