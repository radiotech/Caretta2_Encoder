import {buildContext} from '../util/Contexts';

// Define and export a type for this context
export type state = {
    status: 'Not Connected' | 'Connected',
    bearing?: number,
    zero: number,
};

// Define and export a list of actions that this context supports
export type action = {
    type: 'set', val: Partial<Omit<state,'zero'>>,
} | {
    type: 'zero',
};

// Build and export a static state object, context object, context provider, and useContext hook for this context
export const [StaticEncoderState, useEncoderState] = buildContext<state, action>(
    /* Name */ 'Encoder',
    /* Initial State */ {
        status: 'Not Connected',
        zero: 0,
    },
    /* Reducer */ (state, action) => {
        switch (action.type) {
            case 'set':
                return {...state, ...action.val, ...(action.val.bearing===undefined?{}:{bearing: (action.val.bearing-state.zero+360)%360})};
            case 'zero':
                return state.bearing===undefined?state:{...state, bearing: 0, zero: (state.bearing+state.zero)%360};
        }
    },
);
