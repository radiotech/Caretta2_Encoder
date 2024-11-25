import React, {CSSProperties, useState, useRef} from 'react';
import {valOrDash, formatDate, wrapAngle, rayleighStatistics} from '../../util/Util';
import {trial} from '../../contexts/Trials';

type Props = {
    samples: trial['samples'],
    maxRows?: number,
};

export type State = {
    rangeStart: string,
    rangeEnd: string,
};

const Samples: React.FC<Props> = ({
    samples,
    maxRows = 100,
}) => {
    // Define a helper function to style property keys
    const key = (text: string) => <span style={styles.key}>{text}</span>;
    
    // Track the direction of select interface fields
    let [directions,setDirections] = useState({
        rangeStart: 1,
        rangeEnd: -1,
    });

    // Initialize the interface state
    let [state, setState] = useState({
        rangeStart: 1,
        rangeEnd: 1,
    });
    let [inputState, setInputState] = useState({
        rangeStart: '1',
        rangeEnd: '1',
    });

    // Determine the new component state based upon the interface values
    let newState = {
        rangeStart: parseInt(inputState.rangeStart),
        rangeEnd: parseInt(inputState.rangeEnd),
    }
    
    // Define a function to determine whether the new component state values for each field are valid (critical errors)
    let checkFieldsValid = (field: keyof typeof state)=>{
        let parsed = newState[field];
        switch(field){
            case 'rangeStart':
                return !isNaN(parsed as any) && parsed >= 1 && parsed <= Math.max(1,samples.length);
            case 'rangeEnd':
                return !isNaN(parsed as any) && parsed >= 1 && parsed <= Math.max(1,samples.length);
        }
    };
    
    // Use the above function to determine the validity of each field
    let fieldsValid: Record<keyof typeof state,boolean> = {} as any;
    Object.keys(state).forEach(f=>{
        fieldsValid[f as never] = checkFieldsValid(f as never) as never;
    });

    // Define a helper function to render input elements
    let input = (field: keyof typeof state) => <input value={inputState[field] as any} style={{...styles.input, ...(!fieldsValid[field]?styles.inputInvalid:{})}} onChange={e=>{
        let val = e.target.value;
        setInputState(s=>({...s, [field]: val}));
        newState[field] = parseInt(val);
        if(checkFieldsValid(field)){
            setState(s=>({...s, [field]: newState[field]}));
        }
    }} />;

    // Define a helper function to render select elements
    let select = (field: keyof typeof directions) => {
        let options = ['From Start','From End'];
        return <select value={options[directions[field]===1?0:1]} onChange={e=>{
            let val = e.target.value===options[0]?1:-1;
            if(val !== directions[field]){
                setDirections({...directions, [field]: val});
            }
        }}>
            <option>{options[0]}</option>
            <option>{options[1]}</option>
        </select>;
    };

    // Generate a list of selected samples
    let a = directions.rangeStart===1?(state.rangeStart-1):(samples.length-state.rangeStart);
    let b = directions.rangeEnd===1?(state.rangeEnd-1):(samples.length-state.rangeEnd);
    let start = Math.min(a,b);
    let end = Math.max(a,b);
    let selectedSamples = samples.map((x,i)=>({...x, i})).filter(x=>x.i>=start&&x.i<=end);
    
    // selectedSamples[0].encoder.bearing = 0;
    // selectedSamples[1].encoder.bearing = 0;
    // selectedSamples[2].encoder.bearing = 90;

    //let temp = [341, 330, 301, 299, 9, 7, 359, 334, 353, 15, 27, 28, 25, 23, 350, 30, 26, 22, 8, 356];
    // let temp = [352,358,22,340,308,354,356,356,38,14,12,12,308,42,336,352,358,22,340,308,354,356,356,38,14,12,12,308,42,336];
    // temp.forEach((x,i)=>selectedSamples[i].encoder.bearing = x);

    // Calculate sample statistics
    let {meanR, meanAngle} = rayleighStatistics(selectedSamples.map(x=>x.encoder.bearing!).filter(x=>!isNaN(x)));

    // console.log(vectors);
    // console.log(meanVector);

    // Define a function to render the list of samples
    const renderSamples = ()=><div style={styles.samples_block}>
        <div style={styles.samples_block_inner}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Time</th>
                        <th style={styles.th}>Bearing (deg)</th>
                    </tr>
                </thead>
                <tbody>
                    {(s=>{
                        let limit = Math.round(maxRows/2);
                        let filtered = s.map((x,i)=>i<limit||i>=s.length-limit?x:undefined);
                        return filtered.filter((x,i)=>x!==undefined||filtered[i+1]!==undefined);
                    })(selectedSamples).map((x,i)=><tr key={i}>
                        {x===undefined?<><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td></>:<>
                            <td>{(x.i)+1}</td>
                            <td>{formatDate(x.time,false,true,true,true).replace(' ','\xa0')}</td>
                            <td>{valOrDash(wrapAngle(x.encoder.bearing===undefined?NaN:x.encoder.bearing,true),undefined)}</td>
                        </>}
                    </tr>)}
                </tbody>
            </table>
        </div>
    </div>;
    
    // Render the samples at most once every second and only if the sample range changes
    let cachedRender = useRef<JSX.Element>(undefined!);
    let cachedRenderProps = useRef<{start: number, end: number}>(undefined!);
    let cachedRenderTime = useRef(0);
    if(
        new Date().getTime() - cachedRenderTime.current > 1000
        && (
            cachedRenderProps.current === undefined
            || cachedRenderProps.current.start !== start
            || cachedRenderProps.current.end !== end
        )
    ){
        // This line can be used to track calls to the render event
        // console.log(`SAMPLES - render (${samples.length} samples, ${maxRows} shown)`);

        cachedRender.current = renderSamples();
        cachedRenderProps.current = {start,end};
        cachedRenderTime.current = new Date().getTime();
    }

    // Render the samples interface
    return <div style={styles.body}>
        <h2 style={styles.h2}>Samples <span style={styles.sample_count}>({samples.length})</span></h2>
        {key('Selected Sample Range:')}<br />
        &emsp;From Sample {input('rangeStart')} {select('rangeStart')}<br />
        &emsp;To Sample {input('rangeEnd')} {select('rangeEnd')} ({Math.max(0,end-start+1)} sample{end-start===0?'':'s'})<br />
        {key('Mean Bearing:')} {valOrDash(meanAngle,'degrees',1)}<br />
        {key('Rayleigh R Statistic:')} {valOrDash(meanR,undefined,3)}<br />
        {cachedRender.current}
    </div>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        position: 'relative',
        height: 'auto',
        padding: '20px',
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
    samples_block: {
        position: 'relative',
        width: '100%',
        height: 'auto',
        marginTop: '10px',
        overflowX: 'hidden',
        overflowY: 'hidden',
        border: '1px solid #ccc',
        borderRadius: '5px',
    },
    samples_block_inner: {
        position: 'relative',
        top: '-1px',
        left: '-1px',
        width: 'calc(100% + 2px)',
        height: 'auto',
        minHeight: '100px',
        overflowX: 'hidden',
        overflowY: 'hidden',
        fontSize: '9.5px',
        color: '#222',
        lineHeight: '11px',
        fontFamily: '"Courier New", Courier, monospace',
        marginBottom: '-2px',
    },
    sample_count: {
        fontSize: '16px',
        fontWeight: 100,
    },
    table: {
        width: '100%',
    },
    th: {
        backgroundColor: '#ccc',
        position: 'sticky',
        top: '0px',
        borderRight: '1px solid #ccc',
        padding: '3px',
    },

} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default Samples;
