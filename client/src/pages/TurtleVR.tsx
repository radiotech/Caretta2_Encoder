import React, {CSSProperties, useState, useEffect, useRef} from 'react';
import Frame from '../components/Frame';
import HeaderButton from '../components/HeaderButton';
import {StaticRouteState, useRouteState} from '../contexts/Route';
import {StaticDialogState} from '../contexts/Dialog';
import Gauge from '../components/vr/Gauge';
import {valOrDash, formatDate, fsWriteFile} from '../util/Util';
import {useEncoderState, StaticEncoderState} from '../contexts/Encoder';
import {remote} from 'electron';
import Samples from '../components/vr/Samples';
import {procedure} from '../contexts/Procedures';
import Procedure from '../components/vr/Procedure';
import {processSteps} from '../util/Procedures';
import {deleteTrial, StaticTrialsState, trial, useTrialsState} from '../contexts/Trials';

const TurtleVR: React.FC<{}> = () => {
    // Define a helper function to style property keys
    const key = (text: string) => <span style={styles.key}>{text}</span>;

    // Gain access to global contexts
    let encoder = useEncoderState(['bearing','roundTo',2],['status']);
    let route = useRouteState();

    // Track the current trial mode
    let [mode,setMode] = useState<"setup"|"tracking"|"review">(route.data.new?"setup":"review");
    
    // Track the current trial data
    let id: string = route.data.id;
    let state = useTrialsState().detailed[id];
    let setState = (p: Partial<trial> | ((s: trial)=>Partial<trial>))=>{
        StaticTrialsState.set((s)=>({type: 'set', id, val: typeof p == 'function'?p(s.detailed[id]):p}));
    };

    let eventLoopInterrupt = useRef<(()=>void) | undefined>(undefined);

    const [setProcedure] = useState(()=>(p: undefined | Partial<procedure> | ((s: procedure)=>Partial<procedure>))=>setState(s=>{
        if(typeof p == 'function'){
            if(s.procedure == undefined){
                console.error(`Called setProcedure with an update function while procedure is undefined`);
            }
            p = p(s.procedure!??{});
        }
        return ({...s, procedure: p==undefined?undefined:{...(s.procedure==undefined?{}:s.procedure) as procedure, ...p}});
    }));

    // Track the current trial parameters
    let [vrState,setVRState] = useState({
        samplingPeriod: 10000,
    });
    let staticVRState = useRef(vrState);
    staticVRState.current = vrState;

    // When trial parameters are changed that impact timing of the event loop, interrupt the event loop if it is running
    useEffect(()=>{
        if(eventLoopInterrupt.current !== undefined){
            eventLoopInterrupt.current();
        }
    },[vrState.samplingPeriod]);

    // When the trial mode is updated,
    useEffect(()=>{
        // If the trial mode is now tracking,
        if(mode === 'tracking'){
            
            let timeout: number | undefined = undefined;
            
            // Create an interrupt callback that can be used to trigger an event loop recalculation
            eventLoopInterrupt.current = ()=>{
                console.log('Event Loop Interrupt');
                clearTimeout(timeout);
                eventLoop();
            };

            // Define variables that are tracked across event loop iterations
            
            // General trial variables
            let trialStartTime: number | undefined = undefined;
            let nextStepTime: number | undefined = undefined;

            // Sample collection variables
            let lastSampleTime = -1;
            
            // Create the event loop
            const eventLoop = ()=>{
                // console.log('Event Loop Start');
                let now = new Date().getTime();
                if(trialStartTime == undefined){
                    // Ensure that trialStartTime is initialized to now (can be used to identify the first iteration)
                    trialStartTime = now;
                }
                let vrState = staticVRState.current;
                let state = StaticTrialsState.current.detailed[id];

                // Trigger the event loop at least once every 10 seconds
                let nextCallTime = now+10000;

                // Identify the previous and current sample indices
                let lastSampleIndex = Math.floor((lastSampleTime-trialStartTime)/vrState.samplingPeriod);
                let currentSampleIndex = Math.floor((now-trialStartTime)/vrState.samplingPeriod);
                // If a new sample is ready to be collected, collect the sample
                if(currentSampleIndex != lastSampleIndex){
                    let newSample = {
                        time: now,
                        settings: {
                            samplingPeriod: vrState.samplingPeriod,
                        },
                        encoder: JSON.parse(JSON.stringify(StaticEncoderState.current)),
                    };
                    setState(s=>({...s, samples: [...s.samples,newSample]}));
                    console.log(`    Sample (${now-lastSampleTime}ms)`);
                    lastSampleTime = now;
                }
                // Schedule the next sample collection
                nextCallTime = Math.min(nextCallTime,(currentSampleIndex+1)*vrState.samplingPeriod+trialStartTime);

                // Run the procedure
                if(state.procedure !== undefined){
                    if(nextStepTime == undefined || now >= nextStepTime){
                        let steps = state.procedure.steps;
                        // Assume that the procedure will complete this call unless a wait step is reached
                        nextStepTime = processSteps(
                            steps,
                            steps=>setProcedure(s=>({steps: typeof steps == 'function'?steps(s.steps):steps})),
                            x=>{
                                setState(s=>({...s, comments: s.comments.trim().length==0?x:`${s.comments}\n\n${x}`}));
                            },
                            (timeA,timeB)=>state.samples.filter(x=>x.time>=Math.min(timeA,timeB)&&x.time<=Math.max(timeA,timeB)&&!isNaN(x.encoder.bearing!)).map(x=>x.encoder.bearing!),
                            trialStartTime,
                            ()=>{
                                setMode('review');
                            },
                        );
                        console.log(`    Step`);
                    }
                    // Schedule the next update
                    if(nextStepTime !== undefined){
                        nextCallTime = Math.min(nextCallTime,nextStepTime);
                    }
                }

                // Schedule the next event loop call if the eventLoopInterrupt function has not been cleared
                if(eventLoopInterrupt.current !== undefined){
                    timeout = setTimeout(eventLoop,nextCallTime-new Date().getTime()) as any;
                    // console.log(`    Waiting ${nextCallTime-new Date().getTime()}ms`);
                }
            }
            
            // Start the event loop
            eventLoop();
            
            // Return a callback that stops the event loop
            return ()=>{
                eventLoopInterrupt.current = undefined;
                clearTimeout(timeout);
            };
        } else if(mode == 'review'){
            if(state.procedure != undefined && state.procedure.steps.some(x=>!x.complete)){
                setProcedure(x=>({...x, steps: x.steps.map(y=>({...y, complete: true}))}));
            }
        }
    },[mode]);

    // Create a handler for the header back button
    const onBack = ()=>{
        if(mode === 'review'){
            StaticRouteState.set({type: 'set', val: 'trial_resource_list'});
        } else {
            let locked = false;
            StaticDialogState.set({type: 'open', val: {
                title: 'Confirm Navigation',
                contents: mode==='setup'?'Your trial settings will be lost if you leave this page.':'Your current trial will end if you leave this page.',
                buttons: [
                    {text: 'Cancel', action: ()=>{
                        if(!locked){
                            StaticDialogState.set({type: 'close'});
                        }
                    }},
                    {text: 'Continue', action: async ()=>{
                        if(!locked){
                            locked = true;
                            // If no samples were collected, remove the trial from the trial context (it should not have been saved)
                            if(StaticTrialsState.current.detailed[id].samples.length == 0){
                                await deleteTrial(id);
                            }
                            StaticRouteState.set({type: 'set', val: 'trial_resource_list'});
                            StaticDialogState.set({type: 'close'});
                        }
                    }},
                ]
            }});
        }
    };

    // Define a handler for the trial start button
    const onStartTrial = ()=>{
        let errors: string[] = [];
        if(isNaN(vrState.samplingPeriod)){
            errors.push('Please enter a valid sample frequency for this trial. This value should be greater than .5 seconds.');
        }
        let warnings: string[] = [];
        if(state.title === 'New Trial'){
            warnings.push('You have not entered a title for this trial. You can add one now or after the experiment has started.');
        }

        if(errors.length > 0){
            StaticDialogState.set({type: 'open', val: {
                title: 'Settings Error',
                contents: errors[0],
                buttons: [{text: 'Close'}],
            }});
        } else {
            let processWarnings = ()=>{
                if(warnings.length > 0){
                    StaticDialogState.set({type: 'open', val: {
                        title: 'Start Trial Confirmation',
                        contents: warnings[0],
                        buttons: [{text: 'Cancel'},{
                            text: 'Start Trial',
                            action: ()=>{
                                warnings.shift();
                                if(warnings.length===0){
                                    StaticDialogState.set({type: 'close'});
                                }
                                processWarnings();
                            },
                        }],
                    }});
                } else {
                    setMode('tracking');
                    setState(s=>({...s, date: new Date().getTime()}));
                }
            }
            processWarnings();
        }
    };

    // Define a handler for the trial end button
    const onEndTrial = ()=>{
        StaticDialogState.set({type: 'open', val: {
            title: 'End Trial Confirmation',
            contents: 'Sample collection will be stopped once you end the trial.',
            buttons: [{text: 'Cancel'},{
                text: 'End Trial',
                action: ()=>{
                    setMode('review');
                    StaticDialogState.set({type: 'close'});
                },
            }],
        }});
    };

    // Define a handler for the trial delete button
    const onDeleteTrial = ()=>{
        StaticDialogState.set({type: 'open', val: {
            title: 'Delete Trial Confirmation',
            contents: 'You will not be able to access the data for this trial once it is deleted.',
            buttons: [{text: 'Cancel'},{
                text: 'Delete',
                action: async ()=>{
                    await deleteTrial(id);
                    StaticDialogState.set({type: 'close'});
                    StaticRouteState.set({type: 'set', val: 'trial_resource_list'});
                },
            }],
        }});
    };

    // Define a handler for the trial export button
    const onExport = ()=>{
        (async ()=>{
            let result = await remote.dialog.showSaveDialog({
                title: 'Export Trial Data',
                defaultPath: `${state.title.replace(/[\/?<>\\:*|" ]+/g,'_')}.csv`,
            });
            if(!result.canceled && result.filePath !== undefined){
                try {
                    // TODO: Refactor export code to reduce the distance between title and value definitions for each column
                    // TODO: Consider moving this export code to a Util file
                    // For example:
                    // const columns: {
                    //     title: string,
                    //     value: (x: (typeof state.samples)[number])=>string,
                    // }[] = [
                    //     {
                    //         title: 'Date',
                    //         value: x=>formatDate(x.time,true,true,true,true).replace(',',''),
                    //     },
                    //     {
                    //         title: 'Bearing (degrees)',
                    //         value: x=>valOrDash(x.encoder.bearing,undefined,3),
                    //     },
                    //     //...
                    // ];
                    // await fsWriteFile(result.filePath,[
                    //     columns.map(x=>x.title).join(','),
                    //     ...state.samples.map(x=>columns.map(y=>y.value(x)).join(',')),
                    // ].join('\r\n').replace(/–/g,'-'));
                    
                    await fsWriteFile(result.filePath,`Trial Title,Procedure Title,Date,Bearing (degrees),Sampling Period (s)\r\n${
                        state.samples.map(x=>{
                            let magDevice = {} as any;
                            return `${
                                state.title.replace(/["',\n\r]+/g,'')
                            },${
                                (state.procedure?.title??'None').replace(/["',\n\r]+/g,'')
                            },${
                                formatDate(x.time,true,true,true,true).replace(',','')
                            },${
                                valOrDash(x.encoder.bearing,undefined,3)
                            },${
                                valOrDash(x.settings.samplingPeriod/1000,undefined,2)
                            }`;
                        
                        }).join('\r\n').replace(/–/g,'-')
                    }`);
                } catch(e){
                    console.error(e);
                    StaticDialogState.set({type: 'open', val: {
                        title: 'Export Error',
                        contents: 'Failed to export trial data.',
                        buttons: [{text: 'Close'}],
                    }});
                }
            }
        })();
    };
    
    // Render the turtle VR page
    return <Frame styleAll={false} headerLeft={
        <HeaderButton text="Back" link={onBack} />
    } header="Turtle VR">
        <div className="style" style={styles.body}>
            <div className="style-all" style={{...styles.left, opacity: mode==="review"?.2:1}}>
                <Gauge />
            </div>
            <div className="style-all" style={styles.right}>
                <div style={styles.right_inner}>
                    <div style={styles.block}>
                        <div style={styles.title_block}>
                            <input value={state.title} spellCheck={true} onChange={x=>{
                                let title = x.target.value; //This object is only valid during this callback
                                setState(s=>({...s, title}));
                            }} style={styles.title} />
                            <div style={styles.date}>{formatDate(state.date,true,mode!=='setup',mode!=='setup')}</div>
                        </div>
                        
                        {key('Comments:')}<br />
                        <textarea value={state.comments} spellCheck={true} onChange={x=>{
                            let comments = x.target.value; //This object is only valid during this callback
                            setState(s=>({...s, comments}));
                        }} style={styles.comment_block} />
                        
                        {mode!=="setup"?null:<><button style={styles.button} onClick={onStartTrial}>Start Trial</button><br /></>}
                        {mode!=="tracking"?null:<><button style={styles.button} onClick={onEndTrial}>End Trial</button></>}
                        {mode!=="review"?null:<><button style={styles.button} onClick={onDeleteTrial}>Delete Trial</button></>}
                        {mode==="setup"?null:<>&emsp;<button style={styles.button} onClick={onExport}>Export Data</button><br /></>}
                    </div>

                    {mode!=="setup"&&state.procedure==undefined?null:<>
                        <div style={styles.hr} />
                        <Procedure mode={mode} procedure={state.procedure} setProcedure={setProcedure}/>
                    </>}

                    {mode==="review"?null:<>
                        <div style={styles.hr} />
                        {encoder.status==='Not Connected'?null:<div style={styles.block}>
                            <h2 style={styles.h2}>Encoder Status</h2>
                            {key('Bearing:')} {valOrDash(encoder.bearing,'degrees',2)}<br />
                        </div>}
                    </>}
                    {mode==="setup"?null:<>
                        <div style={styles.hr} />
                        <Samples samples={state.samples} />
                    </>}
                    <br />
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
    left: {
        top: '185px',
        width: '25%',
        height: '240px',
        border: '2px solid #777',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    right: {
        left: 'calc(25% + 20px)',
        width: 'calc(75% - 20px)',
        border: '2px solid #777',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    right_inner: {
        overflowY: 'auto',
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
        marginBottom: '10px',
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
export default TurtleVR;
