import React, {useEffect, useState, CSSProperties, useRef} from 'react';
import {StaticDialogState, useDialogState} from '../../contexts/Dialog';
import Button from '../Button';

const Dialog: React.FC<{}> = () => {
    
    // Gain access to the global dialog state
    let dialog = useDialogState();
    let data = dialog.data!;

    // Width scaling functionality
    let ref = useRef<HTMLDivElement>(null);
    let [textResize,setTextResize] = useState<{
        width: number,
        height?: number,
        finalWidth?: number,
    }>({width: 85});
    
    // Include window dragging data in this component's state
    let [drag, setDrag] = useState({active: false, startX: 0, startY: 0, mouseX: 0, mouseY: 0, x: 0, y: 0});

    // When the dialog window is closed and is also being dragged, end this drag
    useEffect(()=>{
        if(drag.x !== 0 && drag.y !== 0 && !dialog.shown){
            setDrag({...drag, x: 0, y: 0});
        }
    },[JSON.stringify(drag),dialog.shown]);

    // When the dialog content changes, update the width of the dialog box
    useEffect(()=>{
        setTextResize({width: 85});
    },[JSON.stringify(data)]);

    // Resize the dialog box to best fit the dialog content
    useEffect(()=>{
        // If the dialog box is currently shown
        if(dialog.shown){
            //console.log(ref.current!.clientHeight);
            // If the dialog box goal height has not yet been set,
            if(textResize.height === undefined){
                // Set the height to the current dialog box height (the height of the dialog box when width=85)
                // Also set the dialog width to 30
                setTextResize({
                    width: 30,
                    height: ref.current!.clientHeight,
                });
            // Otherwise, if the dialog box goal height has been set but the final width has not yet been determined,
            } else if(textResize.finalWidth === undefined){
                // If the current dialog box width results in the goal height, set this as the final width
                // Otherwise, increase the current width by 5 (this effect will be called again after the next render)
                setTextResize(ref.current!.clientHeight<=textResize.height?{
                    ...textResize, finalWidth: textResize.width
                }:{
                    ...textResize, width: textResize.width+5,
                });
            }
        // If the dialog window becomes hidden, unset the dialog box size data
        } else {
            if(textResize.height !== undefined){
                setTextResize({width: 85});
            }
        }
    },[dialog.shown,JSON.stringify(textResize)]);

    // Define a function to render buttons along the bottom of the dialog window
    let renderButtons = ()=>{
        let buttonPairs = data.buttons.map((x,i)=>[x,data.buttons[i+1]]).filter((x,i)=>i%2==0);
        return buttonPairs.map((x,i)=><div key={i} style={styles.buttons}>
            <Button text={x[0].text} action={x[0].action || (()=>{StaticDialogState.set({type: 'close'})})} />
            {x[1]===undefined?null:<>
                <div style={styles.spacer}/>
                <Button text={x[1].text} action={x[1].action || (()=>{StaticDialogState.set({type: 'close'})})} />
            </>}
        </div>)
    };

    // Render a popup window if a dialog is shown based upon the current dialog context state
    return !dialog.shown?null:<div className="style-all"
        style={styles.bg}
        onMouseMove={(e)=>{setDrag({...drag, mouseX: e.clientX, mouseY: e.clientY, ...(drag.active?{x: drag.mouseX-drag.startX, y: drag.mouseY-drag.startY}:{})});}}
        onMouseUp={()=>{setDrag({...drag, active: false});}}
        onMouseLeave={()=>{setDrag({...drag, active: false});}}
    >
        <div style={{
            ...styles.frame,
            top: `calc(50% + ${drag.y}px)`,
            left: `calc(50% + ${drag.x}px)`,
        }}>
            <div style={{...styles.header, fontSize: 35}}
                onMouseDown={()=>{setDrag({...drag, active: true, startX: drag.mouseX-drag.x, startY: drag.mouseY-drag.y});}}
            >
                {data.title}
                <div style={styles.headerRight}>
                    
                </div>
            </div>
            <div style={styles.body}>
                <div style={{...styles.page, width: `${textResize.width}%`, opacity: textResize.finalWidth===undefined?.01:1}}>
                    <div ref={ref} style={styles.textWrapper}>
                        {data.contents}
                    </div>
                </div>
                {renderButtons()}
            </div>
        </div>
    </div>;
};

// Define styles for use with this component
const styleMap = {
    bg: {
        position: 'fixed',
        backgroundColor: '#00000099',
        zIndex: 10000,
    },
    frame: {
        width: '600px',
        height: '400px',
        border: '2px solid #444',
        overflow: 'hidden',
        transform: 'translate(-50%,-50%)',
        borderRadius: '10px',
    },
    header: {
        height: '60px',
        backgroundColor: '#ddd',
        lineHeight: '60px',
        textAlign: 'center',
        userSelect: 'none',
        borderBottom: '1px solid #444',
    },
    headerRight: {
        left: 'auto',
        right: '20px',
        width: 'auto',
        fontSize: '15px',
    },
    body: {
        top: '60px',
        backgroundColor: '#fff',
        height: 'calc(100% - 60px)',
    },
    page: {
        top: 'calc(50% - 40px)',
        left: '50%',
        height: 'auto',
        maxHeight: 'calc(100% - 120px)',
        textAlign: 'center',
        fontSize: '25px',
        transform: 'translate(-50%, -50%)',
        overflowY: 'auto',
    },
    textWrapper: {
        position: 'relative',
        height: 'auto',
        textAlign: 'center',
        fontSize: '25px',
    },
    buttons: {
        top: 'auto',
        bottom: '20px',
        left: '50%',
        width: 'max-content',
        height: '60px',
        transform: 'translate(-50%, 0px)',
    },
    spacer: {
        position: 'relative',
        left: 'auto',
        width: '20px',
        float: 'left',
    }
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default Dialog;
