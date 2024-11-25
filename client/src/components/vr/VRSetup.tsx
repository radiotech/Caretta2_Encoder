import React, {CSSProperties, useState, useEffect} from 'react';
import {parseNumber, round} from '../../util/Util';

type Props = {
    mode: 'setup'|'tracking'|'review',
    state: State,
    setState: (f: (s: State)=>State)=>void,
    onChange?: (type: 'samplingPeriod', state: State)=>Promise<boolean>,
};

export type State = {
    samplingPeriod: number,
};

const VRSetup: React.FC<Props> = ({
    mode,
    state,
    setState,
    onChange = ()=>Promise.resolve(true),
}) => {
    // Define a helper function to style property keys
    const key = (text: string) => <span style={styles.key}>{text}</span>;
    
    // Track the direction of select interface fields
    let [directions,setDirections] = useState({
        samplingPeriod: 1,
    });

    // Determine the state of the interface based upon the current internal system state
    let trueInputState = {
        samplingPeriod: `${round(state.samplingPeriod/directions.samplingPeriod/1000,2)}`,
    };

    // Initialize the interface state using the current internal system state
    let [inputState,setInputState] = useState(trueInputState);
    let [currentGroups,setCurrentGroups] = useState({
        samplingPeriod: false,
    });

    // Determine the new system state based upon the values present within the interface
    let newState = {
        samplingPeriod: parseNumber(inputState.samplingPeriod)*directions.samplingPeriod*1000,
    }
    
    // Define a function to determine whether the new system state values for each field are valid (critical errors)
    let checkFieldsValid = (field: keyof typeof state)=>{
        let parsed = newState[field];
        switch(field){
            case 'samplingPeriod':
                return !isNaN(parsed as any) && parsed >= 500 && parsed <= 1e7;
        }
    };

    // Use the above function to determine the validity of each settings field and section (group)
    let fieldsValid: Record<keyof typeof state,boolean> = {} as any;
    Object.keys(state).forEach(f=>{
        fieldsValid[f as never] = checkFieldsValid(f as never) as never;
    });
    let groupsValid = {
        samplingPeriod: fieldsValid.samplingPeriod,
    };

    // When not in tracking mode, immediately update the system state to match the input state when it changes (even if it is invalid)
    useEffect(()=>{
        if(mode !== 'tracking'){
            setState(s=>newState);
        }
    },[JSON.stringify(inputState)]);

    // Define a helper function to render input elements
    let input = (group: keyof typeof groupsValid, field: keyof typeof state) => <input value={inputState[field] as any} style={{...styles.input, ...(!(currentGroups[group]||mode==='setup')?{}:!fieldsValid[field]?styles.inputInvalid:{})}} onChange={e=>{
        let val = e.target.value;
        setInputState(s=>({...s, [field]: val}));
        if(mode === 'tracking' && !currentGroups[group]){
            setCurrentGroups({...currentGroups, [group]: true});
        }
    }} />;

    // Define a helper function to render button elements
    let buttons = (group: keyof typeof groupsValid)=>mode==='setup'||!currentGroups[group]?null:<>
        <button onClick={()=>{
            setCurrentGroups({...currentGroups, [group]: false});
            switch(group){
                case 'samplingPeriod':
                    setInputState({...inputState, samplingPeriod: trueInputState.samplingPeriod});
                    break;
            }
        }}>Cancel</button>&ensp;
        <button onClick={async ()=>{
            if(groupsValid[group] && await onChange(group,newState)){
                switch(group){
                    case 'samplingPeriod':
                        setState(s=>({...s, samplingPeriod: newState.samplingPeriod}));
                        break;
                }
                setCurrentGroups({...currentGroups, [group]: false});
            }
        }}>Apply</button>
        <br />
    </>;
    
    // Define a helper function to render select elements
    let select = (group: keyof typeof groupsValid, field: keyof typeof directions) => {
        let options = ['Second','Minute'];
        let values = [1,60];
        switch(field){
            case 'samplingPeriod':
                if(parseNumber(inputState.samplingPeriod)!=1){
                    options = options.map(x=>`${x}s`);
                }
                break;
        }
        return (
            <select value={options[directions[field]===1?0:1]} onChange={e=>{
                let val = values[e.target.value===options[0]?0:1];
                if(val !== directions[field]){
                    setDirections({...directions, [field]: val});
                    if(mode === 'tracking' && !currentGroups[group]){
                        setCurrentGroups({...currentGroups, [group]: true});
                    }
                }
            }}>
                <option>{options[0]}</option>
                <option>{options[1]}</option>
            </select>
        );
    };

    // Render the vr setup interface
    return <div style={styles.body}>
        <h2 style={styles.h2}>Trial Settings</h2>
        {key('Sampling Period:')} {input('samplingPeriod','samplingPeriod')} {select('samplingPeriod','samplingPeriod')}<br />
        {buttons('samplingPeriod')}
    </div>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        position: 'relative',
        height: 'auto',
        padding: '20px',
        paddingTop: '5px',
        fontSize: '17px',
        lineHeight: '30px',
    },
    key: {
        fontSize: '20px',
        fontWeight: 'bold',
    },
    input: {
        width: '50px',
    },
    inputInvalid: {
        backgroundColor: '#fdd',
    },
    h2: {
        margin: '0px',
        marginBottom: '15px',
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default VRSetup;
