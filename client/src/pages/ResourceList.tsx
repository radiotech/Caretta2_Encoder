import React, {CSSProperties, Fragment, useRef} from 'react';
import Frame from '../components/Frame';
import HeaderButton from '../components/HeaderButton';
import Button from '../components/Button';
import Radium from 'radium';
import {StaticRouteState} from '../contexts/Route';
import {capitalize, formatDate, makeB36ID} from '../util/Util';
import {StaticDialogState} from '../contexts/Dialog';
import {loadProcedure, StaticProceduresState, useProceduresState} from '../contexts/Procedures';
import {loadTrial, StaticTrialsState, useTrialsState} from '../contexts/Trials';
import {shell} from 'electron';
import path from 'path';

type Props = {
    type: 'trial' | 'procedure';
};

const ResourceList: React.FC<Props> = ({
    type,
}) => {
    // Initialize the list of resources
    let resources = (type=='trial'?useTrialsState:useProceduresState)().list;
    
    // Create a ref variable to track the loading state for selected resources
    let loading = useRef(false);

    // When a resource is selected, attempt to load its associated data
    const onClick = (id: string)=>{
        if(!loading.current){
            loading.current = true;
            (async ()=>{
                let loaded = await (type=='trial'?loadTrial:loadProcedure)(id);
                if(loaded){
                    StaticRouteState.set({type: 'set', val: {path: type, data: {id, new: false}}});
                } else {
                    loading.current = false;
                    StaticDialogState.set({type: 'open', val: {
                        title: 'Loading Error',
                        contents: `Failed to load ${type} data.`,
                        buttons: [{text: 'Close'}],
                    }});
                }
            })();
        }
    };
    
    let newResourceButton = <Button height={40} text={`＋ New ${capitalize(type)}${String.fromCharCode(160)}`} action={()=>{
        let id = makeB36ID();
        (type=='trial'?StaticTrialsState:StaticProceduresState).set({type: 'set', id, val: {}});
        StaticRouteState.set({type: 'set', val: {path: type, data: {id, new: true}}});
    }}/>;
    // Render the resource list
    return <Frame headerLeft={
        <HeaderButton text="Back" link="" />
    } header={capitalize(`${type}s`)}>
        <div style={styles.body}>
            <div style={styles.title}>{capitalize(`${type}s`)}</div>
            <div style={styles.select_window}>
                <div style={styles.window_inner}>
                    {resources.length===0?<div style={styles.no_resource_text}>Use the {
                        <div style={{position: 'relative', display: 'inline-block', height: '20px', width: 'auto'}}>{newResourceButton}</div>
                    } <br /> button to {type=='trial'?'start':'create'} a new {type}</div>:resources.map((x,i)=><Fragment key={i}>
                        {i===0?null:<div style={styles.resource_item_divider} />}
                        <div key={`button-${i}`} style={styles.resource_item} onClick={()=>{onClick(x.id);}}>
                            <div style={styles.resource_item_title}>{x.title}</div>
                            <div style={styles.resource_item_spacer} />
                            <div style={styles.resource_item_date}>{formatDate(x.date)}</div>
                        </div>
                    </Fragment>)}
                </div>
            </div>
            <div style={styles.buttons}>
                {newResourceButton}
                &thinsp;&ensp;
                <Button height={40} text={`Open ${capitalize(type)}s Folder`} action={()=>{
                    shell.openPath(path.resolve(`./data/${type=='trial'?'trials/turtle_vr':'procedures'}/`));
                }}/>
            </div>
        </div>
    </Frame>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        top: '10%',
        left: '20%',
        width: '60%',
        height: '83%',
    },
    select_window: {
        top: '50px',
        height: 'calc(100% - 100px)',
        border: '2px solid #777',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    window_inner: {
        overflowY: 'auto',
        paddingTop: '5px',
    },
    title: {
        height: '50px',
        lineHeight: '50px',
        fontSize: '30px',
    },
    buttons: {
        display: 'flex',
        height: '40px',
        top: 'calc(100% - 40px)',
    },
    no_resource_text: {
        top: '48%',
        left: '50%',
        width: '70%',
        height: 'auto',
        textAlign: 'center',
        fontSize: '30px',
        color: '#888',
        fontWeight: 'bold',
        lineHeight: '40px',
        transform: 'translate(-50%,-50%)',
    },
    resource_item: {
        position: 'relative',
        display: 'flex',
        top: 'auto',
        left: '2%',
        width: '96%',
        height: '50px',
        lineHeight: '50px',
        cursor: 'pointer',
        marginTop: '5px',
        marginBottom: '5px',
        paddingLeft: '2%',
        paddingRight: '2%',
        borderRadius: '5px',
        transition: 'all 400ms ease-out',
        ':hover': {
            backgroundColor: '#ddd',
        },
    },
    resource_item_title: {
        position: 'initial',
        left: 'auto',
        width: 'auto',
        flex: '0 1 auto',
        fontSize: '20px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    resource_item_spacer: {
        position: 'initial',
        left: 'auto',
        width: '20px',
        flex: '1 0 auto',
    },
    resource_item_date: {
        position: 'initial',
        left: 'auto',
        width: 'auto',
        flex: '0 100000 auto',
        fontSize: '15px',
        whiteSpace: 'nowrap',
        color: '#444',
        paddingTop: '1px',
    },
    resource_item_divider: {
        position: 'relative',
        top: 'auto',
        left: '2%',
        width: '96%',
        height: '0px',
        borderTop: '1px solid #ddd',
    },
} as const;
const styles: Record<keyof typeof styleMap,CSSProperties> = styleMap;

// Export this function component
export default Radium(ResourceList);
