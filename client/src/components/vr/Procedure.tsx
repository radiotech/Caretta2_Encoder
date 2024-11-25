import React, {CSSProperties, useState, memo} from 'react';
import {loadProcedure, procedure, StaticProceduresState, useProceduresState} from '../../contexts/Procedures';
import Steps from '../procedure/Steps';

type Props = {
    mode: "setup" | "tracking" | "review",
    procedure?: procedure,
    setProcedure: (p: undefined | Partial<procedure> | ((s: procedure)=>Partial<procedure>))=>void,
};

const Procedure: React.FC<Props> = ({
    mode,
    procedure: state,
    setProcedure: setState,
}) => {
    // Define a helper function to style property keys
    const key = (text: string, style: CSSProperties = {}) => <span style={{...styles.key, ...style}}>{text}</span>;
    
    const procedures = useProceduresState();

    // Initialize the interface state
    let [selectedProcedure, setSelectedProcedure] = useState('');
    let showApplyButton = mode == 'setup' && state != undefined && state.id != selectedProcedure;

    let applyProcedure = async (id: string)=>{
        if(id != ''){
            await loadProcedure(id);
        }
        setState(StaticProceduresState.current.detailed[id]);
    };

    // Render the samples interface
    return <div style={styles.body}>
        <h2 style={styles.h2}>Procedure</h2>
        {mode!='setup'?key(state==undefined?'None':`Title: ${state.title}`):<select value={selectedProcedure} onChange={e=>{
            let val = e.target.value;
            setSelectedProcedure(val);
            // If no procedure is loaded, load the first selected procedure automatically
            if(state == undefined && val != ''){
                applyProcedure(val);
            }
        }}>
            {[['','None'],...procedures.list.map(x=>[x.id,x.title])].map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}
        </select>}<br />
        {!showApplyButton?null:<><button onClick={()=>applyProcedure(selectedProcedure)}>Apply</button><br /></>}
        
        {state==undefined?null:<>
            
            {key('Notes:',{display: 'inline-block', paddingTop: '10px'})}<br />
            <textarea value={state.notes} spellCheck={true} onChange={x=>{
                let notes = x.target.value; //This object is only valid during this callback
                setState({notes});
            }} style={styles.comment_block} />
            <br/>

            {key('Steps:')}<br />
            <Steps key={state.id} editable={mode=='setup'} readyToExecute={true} steps={state.steps} setSteps={steps=>setState(s=>({steps: typeof steps == 'function'?steps(s.steps):steps}))} />

        </>}
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
        overflowY: 'hidden',
        border: '1px solid #ccc',
        borderRadius: '5px',
    },
    samples_block_inner: {
        position: 'relative',
        width: '100%',
        height: 'auto',
        minHeight: '100px',
        maxHeight: '500px',
        overflowX: 'hidden',
        overflowY: 'auto',
        fontSize: '9.5px',
        color: '#222',
        lineHeight: '11px',
        fontFamily: '"Courier New", Courier, monospace',
    },
    sample_count: {
        fontSize: '16px',
        fontWeight: 100,
    },
    table: {
        width: '100%',
    },
    table_body: {
        
    },
    th: {
        backgroundColor: '#ccc',
        position: 'sticky',
        top: '0px',
    },
    comment_block: {
        minWidth: '100%',
        maxWidth: '100%',
        minHeight: '111px',
        maxHeight: '500px',
        padding: '5px',
        fontSize: '14px',
        border: '1px solid #ccc',
        color: '#444',
        lineHeight: '20px',
        borderRadius: '5px',
        fontFamily: '"Courier New", Courier, monospace'
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default memo(Procedure);
