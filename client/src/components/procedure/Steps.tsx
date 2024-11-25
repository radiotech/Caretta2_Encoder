import React, {Fragment, useEffect, useRef, useState} from 'react';
import {initialStepStates, step} from '../../contexts/Procedures';
import {insertElement, makeID, sort, titleCase} from '../../util/Util';
import Step from './Step';

type Props = {
    editable?: boolean,
    readyToExecute?: boolean,
    steps: step[],
    setSteps: (s: step[] | ((s: step[])=>step[]))=>void,
};

const Steps: React.FC<Props> = ({
    editable = true,
    readyToExecute = false,
    steps,
    setSteps,
}) => {

    const stepRefs = useRef({} as Record<string,{current: HTMLDivElement}>);
    const frameRef = useRef(null! as HTMLDivElement);

    const [heldStep, setHeldStep] = useState(undefined as step | undefined);
    const [heldStepOffset, setHeldStepOffset] = useState(0);
    const [heldStepOrigin, setHeldStepOrigin] = useState(-1);
    
    let [heights, setHeights] = useState([-1]);
    let [tops, setTops] = useState(heights);
    
    useEffect(()=>{
        let newHeights = steps.map(step=>/*stepRefs.current[step.id].current==null?0:*/stepRefs.current[step.id].current.getBoundingClientRect().height-3);
        if(newHeights.length != heights.length || newHeights.some((x,i)=>heights[i]!==x)){
            setHeights(newHeights);
            let newTops: number[] = [0];
            for(let i = 0; i < newHeights.length-1; i++){
                newTops[i+1] = newTops[i] + newHeights[i];
            }
            setHeights(newHeights);
            setTops(newTops);
        }
    });
    

    steps.forEach(step=>{
        if(stepRefs.current[step.id] == undefined){
            stepRefs.current[step.id] = {current: null!};
        }
    });
    
    let totalHeight = tops.length==0?3:tops[tops.length-1]+heights[heights.length-1]+3;
    let width = (frameRef.current==null?'100%':frameRef.current.offsetWidth);

    let dragOver = (e: any)=>{
        try {
            e.preventDefault();
            let zoom = parseFloat((document.getElementById('zoom')!.style as any).zoom);
            let mouseY = Math.min(1,Math.max(0,e.nativeEvent.offsetY/(e.target.getBoundingClientRect().height*zoom)))*totalHeight;
            dragBlock(mouseY);
        } catch(e){}
    };

    let dragLeave = ()=>{
        if(heldStep != undefined){
            setSteps(s=>{
                let newSteps = s.filter(x=>x.id!=heldStep.id);
                if(heldStepOrigin > -1){
                    newSteps = insertElement(newSteps,heldStepOrigin,heldStep);
                }
                return newSteps;
            });
        }
    }

    let dragBlock = (mouseY: number)=>{
        if(heldStep == undefined){
            return;
        }
        let id = heldStep.id;
        let existingHeights = heights.filter((x,i)=>steps[i].id!=id);
        if(existingHeights.length == 0){
            if(steps.every(x=>x.id!=id)){
                setSteps([heldStep]);
            }
            return;
        }
        let topHeight = 0;
        let bottomHeight = 0;
        let topI = 0;
        let bottomI = existingHeights.length-1;
        while(topI<=bottomI){
            if(mouseY+heldStepOffset-(topHeight+existingHeights[topI]) > (totalHeight-(mouseY+heldStepOffset))-(bottomHeight+existingHeights[bottomI])){
                topHeight += existingHeights[topI];
                topI++;
            } else {
                bottomHeight += existingHeights[bottomI];
                bottomI--;
            }
        }
        
        let currentI = steps.findIndex(x=>x.id==id);
        if(currentI != topI){
            setSteps(insertElement(steps.filter(x=>x.id!=id),topI,heldStep));
        }
    };

    let firstRender = frameRef.current==null;

    let shield = <div key="shield" ref={frameRef} style={{
        position: 'relative',
        width: 'auto',
        height: `${totalHeight}px`,
        minHeight: '200px',
    }} onDragOver={dragOver} onDragLeave={dragLeave}/>

    // Render the samples interface
    return <div style={{
        position: 'relative',
        height: 'auto',
        overflowY: 'hidden',
    }}>
        <div style={{
            position: 'relative',
            height: 'auto',
            overflowY: 'hidden',
            border: '1px solid #ccc',
            borderRadius: '5px',
            marginBottom: '11px',
        }}>
            <div style={{
                position: 'relative',
                height: `${totalHeight}px`,
                minHeight: '200px',
                overflowX: 'hidden',
                overflowY: 'hidden',
                transition: 'height 200ms',
                opacity: frameRef.current==null?0.001:1,
            }} >
                {steps.length===0?<>{shield}{!editable?null:<div style={{
                    top: '48%',
                    left: '50%',
                    width: '70%',
                    height: 'auto',
                    textAlign: 'center',
                    fontSize: '22px',
                    color: '#888',
                    fontWeight: 'bold',
                    lineHeight: '30px',
                    transform: 'translate(-50%,-50%)',
                }}>Drag steps into<br/>this box from below to<br/>build a procedure</div>}</>:[...(heldStep==undefined?[shield]:[]),...sort(steps,(x,y)=>x.id.localeCompare(y.id)).map((x)=><Step
                    ref={stepRefs.current[x.id]}
                    key={x.id+firstRender}
                    editable={editable}
                    readyToExecute={readyToExecute}
                    style={{
                        top: `${tops[steps.indexOf(x)]}px`,
                        width,
                    }}
                    step={x}
                    setStep={(step)=>setSteps(s=>s.map(y=>y.id==x.id?({...y, ...(typeof step == 'function'?step(y):step)} as step):y))}
                    steps={steps}
                    readyToShow={heldStep==undefined||heldStepOrigin>-1}
                    lockHeight={heldStep!=undefined}
                    onDragStart={e=>{
                        try {
                            let i = steps.indexOf(x);
                            // Identify the position of the mouse relative to the center of the item
                            let zoom = parseFloat((document.getElementById('zoom')!.style as any).zoom);
                            let grabPos = Math.min(1,Math.max(0,e.nativeEvent.offsetY/((e.target as any).getBoundingClientRect().height*zoom)));
                            let offset = -(grabPos-.5)*heights[i];
                            // Track the held step
                            setImmediate(()=>{
                                setHeldStep(x);
                                setHeldStepOffset(offset);
                                setHeldStepOrigin(i);
                            });
                        } catch(e){}
                    }}
                    onDragEnd={()=>{
                        setHeldStep(undefined);
                    }}
                    onDuplicate={()=>setSteps(s=>insertElement(s,s.findIndex(y=>y.id==x.id)+1,{...s[s.findIndex(y=>y.id==x.id)], id: makeID()}))}
                    onDelete={()=>setSteps(s=>s.filter(y=>y.id!=x.id))} />),...(heldStep==undefined?[]:[shield])]}
            </div>
        </div>

        {!editable?null:<>
            <span style={{
                fontSize: '20px',
                fontWeight: 'bold',
            }}>Add Steps:</span>
            {Object.keys(initialStepStates).map((x,i)=><Fragment key={x}>
                {i%4==0?<br/>:null}
                <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 'auto',
                    height: '35px',
                    cursor: 'move',
                    userSelect: 'none',
                    paddingTop: '5px',
                    paddingBottom: '5px',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    marginBottom: '6px',
                    marginRight: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    lineHeight: '22px',
                }} draggable onDragStart={e=>{
                    try {
                        // Identify the position of the mouse relative to the center of the item
                        let zoom = parseFloat((document.getElementById('zoom')!.style as any).zoom);
                        let grabPos = Math.min(1,Math.max(0,e.nativeEvent.offsetY/((e.target as any).getBoundingClientRect().height*zoom)));
                        let offset = -(grabPos-.5)*30;
                        // Track the held step
                        let newStep = {...initialStepStates[x], id: makeID()};
                        setImmediate(()=>{
                            setHeldStep(newStep);
                            setHeldStepOffset(offset);
                            setHeldStepOrigin(-1);
                        });
                    } catch(e){}
                }} onDragEnd={()=>{
                    setHeldStep(undefined);
                }}>{titleCase(`${x}`.replace(/_/g,' '))}</div>
            </Fragment>)}
        </>}
    </div>;
};

// Export this function component
export default Steps;
