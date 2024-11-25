import React, {CSSProperties} from 'react';
import Frame from '../components/Frame';
import HeaderButton from '../components/HeaderButton';
import {StaticRouteState, useRouteState} from '../contexts/Route';
import {formatDate, makeB36ID} from '../util/Util';
import {deleteProcedure, procedure, StaticProceduresState, useProceduresState} from '../contexts/Procedures';
import Steps from '../components/procedure/Steps';
import {StaticDialogState} from '../contexts/Dialog';

const Procedure: React.FC<{}> = () => {
    // Define a helper function to style property keys
    const key = (text: string) => <span style={styles.key}>{text}</span>;

    // Gain access to global contexts
    let route = useRouteState();

    // Track the current procedure data
    let id: string = route.data.id;
    let state = useProceduresState().detailed[id];
    let setState = (p: Partial<procedure> | ((s: procedure)=>Partial<procedure>))=>{
        StaticProceduresState.set((s)=>({type: 'set', id, val: typeof p == 'function'?p(s.detailed[id]):p}));
    };

    const onDuplicateProcedure = ()=>{
        let newID = makeB36ID();
        StaticProceduresState.set({type: 'set', id: newID, val: {...state, title: `Copy of ${state.title}`, date: new Date().getTime()}});
        StaticRouteState.set({type: 'set', val: {...route, data: {id: newID}}});
    };

    const onDeleteProcedure = ()=>{
        StaticDialogState.set({type: 'open', val: {
            title: 'Delete Procedure Confirmation',
            contents: 'Are you sure that you would like to delete this procedure?',
            buttons: [{text: 'Cancel'},{
                text: 'Delete',
                action: async ()=>{
                    await deleteProcedure(id);
                    StaticDialogState.set({type: 'close'});
                    StaticRouteState.set({type: 'set', val: 'procedure_resource_list'});
                },
            }],
        }});
    };

    // Render the procedures page
    return <Frame styleAll={false} headerLeft={
        <HeaderButton text="Back" link="procedure_resource_list" />
    } header="Edit Procedure">
        <div className="style" style={styles.body}>
            
            <div className="style-all" style={styles.right}>
                <div style={styles.right_inner}>
                    <div style={styles.block}>
                        <div style={styles.title_block}>
                            <input value={state.title} spellCheck={true} onChange={x=>{
                                let title = x.target.value; //This object is only valid during this callback
                                setState({title});
                            }} style={styles.title} />
                            <div style={styles.date}>{formatDate(state.date)}</div>
                        </div>
                        
                        {key('Notes:')}<br />
                        <textarea value={state.notes} spellCheck={true} onChange={x=>{
                            let notes = x.target.value; //This object is only valid during this callback
                            setState({notes});
                        }} style={styles.comment_block} />
                        <br/>

                        <button style={styles.button} onClick={onDuplicateProcedure}>Duplicate Procedure</button>
                        &emsp;
                        <button style={styles.button} onClick={onDeleteProcedure}>Delete Procedure</button>
                        <br/>

                        {key('Steps:')}<br />
                        <Steps steps={state.steps} setSteps={steps=>setState(s=>({steps: typeof steps == 'function'?steps(s.steps):steps}))} />

                    </div>

                </div>
            </div>
        </div>
    </Frame>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        top: '20px',
        left: '20px',
        width: 'calc(100% - 40px)',
        height: 'calc(100% - 40px)',
    },
    right: {
        left: '22.5%',
        width: '55%',
        border: '2px solid #777',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    right_inner: {
        overflowY: 'auto',
        paddingTop: '5px',
    },
    block: {
        position: 'relative',
        height: 'auto',
        padding: '20px',
        fontSize: '17px',
        lineHeight: '30px',
    },
    button: {
        fontSize: '20px',
        paddingLeft: '10px',
        paddingRight: '10px',
        marginTop: '10px',
        marginBottom: '18px',
    },
    input: {
        width: '100px',
    },
    inputInvalid: {
        backgroundColor: '#fdd',
    },
    hr: {
        position: 'relative',
        width: 'calc(100% - 40px)',
        marginLeft: '20px',
        height: '0px',
        borderBottom: '1px solid #888',
    },
    title_block: {
        position: 'relative',
        width: '100%',
        display: 'flex',
        height: 'auto',
        borderBottom: '1px solid #888',
        paddingBottom: '4px',
        marginBottom: '20px',
    },
    title: {
        position: 'relative',
        width: '0px',
        height: '30px',
        fontSize: '25px',
        lineHeight: '30px',
        flex: '1 1 auto',
        border: '1px solid #ccc',
        color: '#777',
        fontWeight: 'bold',
    },
    date: {
        position: 'relative',
        paddingTop: '20px',
        lineHeight: '16px',
        width: 'auto',
        textAlign: 'right',
        flex: '.04 1 auto',
        color: '#444',
        whiteSpace: 'nowrap',
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
    h2: {
        margin: '0px',
        marginBottom: '15px',
    },
    key: {
        fontSize: '20px',
        fontWeight: 'bold',
    },
} as const;
const styles: Record<keyof typeof styleMap,CSSProperties> = styleMap;

// Export this function component
export default Procedure;
