import {buildContext} from '../util/Contexts';

// Define and export a type for this context
export type state = {
    shown: boolean,
    data?: {
        title: string,
        contents: any,
        buttons: {
            text: string,
            action?: ()=>void
        }[],
    }
};

// Define and export a list of actions that this context supports
export type action = {
    type: 'open', val: state['data'],
} | {
    type: 'close',
};

// Build and export a static state object, context object, context provider, and useContext hook for this context
export const [StaticDialogState, useDialogState] = buildContext<state, action>(
    /* Name */ 'Dialog',
    /* Initial State */ {
        shown: false,
    },
    /* Reducer */ (state, action) => {
        switch (action.type) {
            case 'open':
                return {
                    shown: true,
                    data: action.val,
                };
            case 'close':
                return {shown: false};
        }
    },
);
