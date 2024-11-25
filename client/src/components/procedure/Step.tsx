import {ipcRenderer} from 'electron';
import React, {CSSProperties, DragEvent, forwardRef, Fragment, ReactElement, useEffect, useRef, useState} from 'react';
import {useEncoderState} from '../../contexts/Encoder';
import {step} from '../../contexts/Procedures';
import {debounce, makeDurationString, ObjectPaths, parseNumber, round, timeUnitMap, titleCase, UnionToIntersection} from '../../util/Util';

type Props = {
    editable: boolean,
    readyToExecute: boolean,
    style: CSSProperties,
    step: step,
    setStep: (s: Partial<step> | ((s: step)=>Partial<step>))=>void,
    steps: step[],
    readyToShow: boolean,
    lockHeight: boolean,
    onDragStart: (e: DragEvent)=>void,
    onDragEnd: ()=>void,
    onDuplicate: ()=>void,
    onDelete: ()=>void,
};

type stepPath = ObjectPaths<step>;
type ExtractStepMethods<T> = T extends T ? T extends {method: string} ? T['method'] : never : never;
type GeneralizeStep<T> = T extends T ? {[K in keyof T]: K extends 'method' ? ExtractStepMethods<step> : K extends 'type' ? step['type']: T[K]} : never;
type stepIntersection = UnionToIntersection<GeneralizeStep<step>>;
type PathTarget<T extends stepPath> = T extends [any] ? stepIntersection[T[0]] : T extends [any,any] ? stepIntersection[T[0]][T[1]] : never;

const Step = forwardRef<any,Props>(({
    editable,
    readyToExecute,
    style,
    step,
    setStep,
    steps,
    readyToShow,
    lockHeight,
    onDragStart,
    onDragEnd,
    onDuplicate,
    onDelete,
}, ref) => {

    const encoder = useEncoderState(...(step.type=='report'?[['status']]:[]));

    const [dragging, setDragging] = useState(false);
    const [shown, setShown] = useState(false);

    const [warnings, setWarnings] = useState([] as string[]);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const [statusText, setStatusText] = useState<undefined|string|ReactElement>(undefined);
    
    useEffect(()=>{
        if(readyToShow){
            setShown(true);
        }
    },[readyToShow]);

    // Listen for comment area resize events and trigger a render
    useEffect(()=>{
        if(textAreaRef.current != null){
            const observer = new MutationObserver(e=>{
                const el = e[0].target;
                const h: number = (el as any).clientHeight;
                if(e.map((m) => `${m.oldValue}`).some((prev) => prev.indexOf(`height: ${h}px`) === -1)){
                    setStep({});
                }
            });
            observer.observe(textAreaRef.current, {attributes: true, attributeOldValue: true, attributeFilter: ['style']});
            return ()=>{
                observer.disconnect();
            };
        }
    },[step.type]);

    let stepI = steps.findIndex(x=>x.id==step.id);
    let reportTargetIDs: string[] = [];
    let reportTargetNames: string[] = [];
    let duration = 0;
    let running = (step.type=='wait')&&step.startTime!=undefined&&!step.complete;
    if(step.type == 'report'){
        reportTargetIDs = steps.map(x=>x.type=='label'||x.id==step.id?x.id:undefined!).filter(x=>x!==undefined);
        reportTargetNames = steps.map(x=>x.type=='label'?x.text:x.id==step.id?'This Step':undefined!).filter(x=>x!==undefined);

        let stepTimes: number[] = [];
        steps.forEach((step,i)=>{
            stepTimes[i] = (i==0?0:stepTimes[i-1])+(step.type=='wait'
                ? Math.max(0,parseNumber(step.time)||0) * timeUnitMap[step.units]
                : 0);
        });
        let startTime = stepTimes[steps.findIndex(x=>x.id==step.from)];
        let endTime = stepTimes[steps.findIndex(x=>x.id==step.to)];
        duration = Math.abs(startTime-endTime);
    } else if(step.type == 'wait'){
        duration = Math.max(0,parseNumber(step.time)||0) * timeUnitMap[step.units];
    }

    // Ensure report targets are always valid and in order
    useEffect(()=>{
        if(step.type == 'report'){
            let changes: Partial<typeof step> = {};
            if(steps.every(x=>x.id!=step.from)){
                let newFrom = reportTargetIDs.indexOf(step.id);
                for(let i = 0; i < 2; i++){
                    if((reportTargetIDs[newFrom]==step.id || reportTargetIDs[newFrom]==step.to) && newFrom > 0){
                        newFrom--;
                    }
                }
                for(let i = 0; i < 2; i++){
                    if((reportTargetIDs[newFrom]==step.id || reportTargetIDs[newFrom]==step.to) && newFrom < reportTargetIDs.length-1){
                        newFrom++;
                    }
                }
                changes.from = reportTargetIDs[newFrom];
            }
            if(steps.every(x=>x.id!=step.to)){
                let newTo = reportTargetIDs.indexOf(step.id);
                if(reportTargetIDs[newTo] == step.from){
                    if(newTo < reportTargetIDs.length-1){
                        newTo++;
                    } else if(newTo>0){
                        newTo--;
                    }
                }
                changes.to = reportTargetIDs[newTo];
            }
            if(Object.keys(changes).length == 0){
                if(reportTargetIDs.indexOf(step.from)>reportTargetIDs.indexOf(step.to)){
                    changes.from = step.to;
                    changes.to = step.from;
                }
            }
            if(Object.keys(changes).length > 0){
                setStep(changes);
            }
        }
    },[step.type!='report'?'':`${steps.map(x=>x.id).join(',')},${step.from},${step.to}`]);

    // Update the status of wait steps as they run
    useEffect(()=>{
        if((step.type=='wait') && running){ // First expression is a type guard
            let updateStatus = ()=>{
                let newStatusText: string | ReactElement = makeDurationString(duration-(new Date().getTime()-step.startTime!),true,true);
                if(statusText==undefined){
                    setStep({});
                }
                if(statusText !== newStatusText){
                    setStatusText(newStatusText);
                }
            };
            let interval = setInterval(updateStatus,250);
            return ()=>{
                clearInterval(interval);
            };
        } else {
            if(statusText !== undefined){
                setStatusText(undefined);
            }
        }
    },[running]);

    // Update step warnings (only if the step height is not locked)
    useEffect(()=>{
        if(!lockHeight){
            let newWarnings: string[] = [];
            if(editable){
                if(stepI>0 && steps[stepI-1].type=='end_trial'){
                    newWarnings.push(`This step ${steps.length==stepI+1?'':'and all following steps '}cannot be reached.`);
                }
                if(step.type == 'report'){
                    if(readyToExecute && encoder.status != 'Connected'){
                        newWarnings.push(`The encoder component must be connected in order for this step to report a value.`);
                    }
                    if(duration <= 0){
                        newWarnings.push(`Please include a "Wait" step in the selected range to allow time for sample collection.`);
                    }
                }
            }
            if(warnings.length != newWarnings.length || warnings.some((x,i)=>newWarnings[i]!=x)){
                setWarnings(newWarnings);
            }
        }
    });

    let [debouncedOnDrag] = useState(()=>debounce(()=>{
        setDragging(true);
    },()=>{
        setDragging(false);
    },200).debounced);
    
    const setStepPath = <T extends stepPath>(path: T, val: PathTarget<T>)=>{
        setStep(s=>({...s, [path[0]]: val}));
    };
    const getStepPath = <T extends stepPath>(path: T)=>(step as any)[path[0]];

    let drag = ()=>{
        debouncedOnDrag();
    };
    let cancelDrag = (e: any)=>{
        e.preventDefault();
        e.stopPropagation();
    }
    let dragStart = (e: DragEvent)=>{
        onDragStart(e);
    };
    let dragEnd = ()=>{
        onDragEnd();
        setDragging(false);
    };
    let stopPropagation = (e: any)=>{
        e.stopPropagation();
    };

    let showSettings = async (e: any)=>{
        e.preventDefault();
        let res = await ipcRenderer.invoke('step-settings');
        if(res == 'duplicate'){
            onDuplicate();
        } else if(res == 'delete'){
            onDelete();
        }
    };

    const div = (content: any, style: CSSProperties = {})=><div style={{
        position: 'relative',
        width: 'auto',
        height: 'auto',
        whiteSpace: 'nowrap',
        ...style,
    }}>{content}</div>;

    const row = (content: any, style: CSSProperties = {})=>div(content,{
        display: 'flex',
        paddingTop: '3px',
        paddingBottom: '3px',
        alignItems: 'flex-end',
        ...style,
    });

    const column = (content: any, style: CSSProperties = {})=>div(content,{
        display: 'flex',
        flexDirection: 'column',
        ...style,
    });

    const title = (content: any)=>div(content,{
        paddingLeft: '4px',
        paddingRight: '9px',
        fontSize: '15px',
        width: '84px',
    });

    const key = (content: any)=>div(content,{
        paddingLeft: '4px',
        paddingRight: '4px',
    });

    const value = (content: any)=>div(content,{
        paddingLeft: '4px',
        paddingRight: '4px',
        fontWeight: 'normal',
    });

    const input = (path: stepPath, units?: string, test?: (x: string)=>boolean, style?: CSSProperties)=>{
        let val = `${getStepPath(path)}`;
        return <>
            <input disabled={!editable} value={val} style={{
                width: '80px',
                height: '22px',
                boxSizing: 'border-box',
                fontSize: '11px',
                paddingLeft: '4px',
                paddingRight: '4px',
                cursor: 'text',
                color: 'black',
                backgroundColor: editable
                    ? val.trim().length==0
                        ? test!=undefined&&readyToExecute?'#fed':'white'
                        : test!=undefined&&!test(val)?'#fdd':'white'
                    : 'white',
                ...style,
            }} draggable onDragStart={cancelDrag} onChange={e=>{
                setStepPath(path,e.target.value);
            }} onContextMenu={stopPropagation} />{units===undefined?null:` ${units}`}
        </>;
    };

    const select = (path: stepPath, values: (string | boolean)[], display = values, style?: CSSProperties)=><select disabled={!editable} style={{
        height: '22px',
        boxSizing: 'border-box',
        fontSize: '11px',
        minWidth: '60px',
        color: 'black',
        opacity: 1,
        ...style,
    }} value={`${getStepPath(path)}`} onChange={(e)=>{
        setStepPath(path,(typeof values[0]=='boolean'?e.target.value=='true':e.target.value) as any);
    }}>
        {values.map((x,i)=><option key={`${x}`} value={`${x}`}>{display[i]??x}</option>)}
    </select>;

    const inputTestNumber = (low?: number, high?: number, lowInclusive = true, highInclusive = true)=>(x: string)=>{
        let parsed = parseNumber(x);
        return !isNaN(parsed)&&(low===undefined||(lowInclusive?parsed>=low:parsed>low))&&(high===undefined||(highInclusive?parsed<=high:parsed<high));
    };

    let sections: any = null;
    
    switch(step.type){
        case 'wait':
            sections = row(<>
                {key('Duration:')}
                {value(<>
                    {input(['time'],undefined,inputTestNumber(0))}
                    &nbsp;
                    {select(['units'],['seconds','minutes'],parseNumber(step.time)===1?['Second','Minute']:['Seconds','Minutes'])}
                </>)}
                {!running?null:<span style={{
                    fontWeight: 'normal',
                    fontSize: '11px',
                    lineHeight: '22px',
                }}>{`(${statusText==undefined?makeDurationString(duration,true,true):statusText} remaining)`}</span>}
            </>);
            break;
        case 'report':
            sections = row(<>
                {column(<>
                    {row(<>
                        {key('Type:')}
                        {value(select(['method'],['mean_bearing','r_statistic'],['Mean Bearing','R Statistic']))}
                    </>)}
                    {row(<>
                        {key('From:')}
                        {value(select(['from'],reportTargetIDs,reportTargetNames,{
                            maxWidth: '93px',
                        }))}
                    </>)}
                </>)}
                {column(<>
                    {row(<>
                        {key('Annotation:')}
                        {value(input(['text'],undefined,undefined,{
                            width: '110px',
                        }))}
                    </>)}
                    {row(<>
                        {key('To:')}
                        {value(select(['to'],reportTargetIDs,reportTargetNames,{
                            maxWidth: '93px',
                        }))}
                        <span style={{
                            fontWeight: 'normal',
                            fontSize: '11px',
                            lineHeight: '22px',
                        }}>{`(${makeDurationString(duration)})`}</span>
                    </>)}
                </>)}
            </>,{
                paddingTop: 0,
                paddingBottom: 0,
            });
            break;
        case 'label':
            sections = row(<>
                {key('Name:')}
                {value(input(['text'],undefined,undefined,{
                    width: '90px',
                }))}
            </>);
            break;
        case 'comment':
            sections = row(<>
                <textarea ref={textAreaRef} value={step.text} spellCheck={true} style={{
                    minWidth: '341px',
                    maxWidth: '341px',
                    height: '39px',
                    minHeight: '39px',
                    maxHeight: '500px',
                    padding: '3px',
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    fontSize: '13px',
                    border: '1px solid #ccc',
                    color: '#111',
                    lineHeight: '16px',
                    borderRadius: '5px',
                    fontFamily: '"Courier New", Courier, monospace'
                }} draggable onDragStart={cancelDrag} onChange={x=>{
                    let text = x.target.value; //This object is only valid during this callback
                    setStep({text});
                }} onContextMenu={stopPropagation} />
            </>);
            break;
    }

    // Render
    return <div ref={ref} style={{
        padding: '3px',
        height: 'auto',
        opacity: dragging||!shown?0.001:step.complete?.5:1,
        userSelect: 'none',
        transition: dragging||!shown?'top 200ms':'top 200ms',
        ...style,
    }} >
        <div ref={ref} style={{
            position: 'relative',
            height: 'auto',
            overflow: 'hidden',
            cursor: editable?'move':undefined,
            boxShadow: running?'0 0 2px 1px #2f2':undefined,
            borderRadius: '5px',
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold',
            fontSize: '13px',
            lineHeight: '21px',
        }} draggable={editable} onDrag={drag} onDragStart={dragStart} onDragEnd={dragEnd} onContextMenu={editable?showSettings:undefined}>
            <div style={{
                position: 'relative',
                height: 'auto',
                minHeight: '35px',
                display: 'flex',
                alignItems: 'center',
                paddingTop: '3px',
                paddingBottom: '3px',
                paddingLeft: '10px',
                paddingRight: '8px',
            }}>
                {!editable?null:<div style={{
                    left: 'auto',
                    right: '0px',
                    width: '10px',
                    height: '20px',
                    lineHeight: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: '#444',
                }} onClick={showSettings}>⋮</div>}
                {title(titleCase(`${step.type}`.replace(/_/g,' ')))}
                {sections}
            </div>
            {warnings.length==0?null:<div style={{
                position: 'relative',
                height: 'auto',
                minHeight: '20px',
                paddingTop: '3px',
                paddingBottom: '3px',
                paddingLeft: '14px',
                paddingRight: '12px',
                borderTop: '1px solid #ccc',
                backgroundColor: '#fed',
                lineHeight: '18px',
                fontSize: '11px',
                color: '#f80',
                fontWeight: 'normal',
            }}>{warnings.map((x,i)=><Fragment key={i}>{x}<br/></Fragment>)}</div>}
            <div style={{
                border: '1px solid #ccc',
                borderRadius: '5px',
                pointerEvents: 'none',
            }}></div>
        </div>
    </div>;
});

// Export this function component
export default Step;
