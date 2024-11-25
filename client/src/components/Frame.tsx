import React, {useEffect, useState, useRef, CSSProperties} from 'react';

type Props = {
    header: string,
    fontSize?: number,
    headerLeft?: React.ReactNode,
    headerRight?: React.ReactNode,
    styleAll?: boolean,
};

const Frame: React.FC<Props> = ({
    header,
    fontSize = 45,
    headerLeft,
    headerRight,
    styleAll = true,
    children,
}) => {
    // Create a ref to attach to the outer window so that the screen size can be determined
    const ref = useRef(null! as HTMLDivElement);
    
    // Maintain the page size as component state
    let [pageSize,setPageSize] = useState<{width: number, height: number}>({width: 0, height: 0});
    
    // When this component is created,
    useEffect(()=>{
        // Add a resize listener that updates the component's state to reflect the new page size
        let callback = ()=>{
            setPageSize(ref.current!.getBoundingClientRect());
        }
        window.addEventListener("resize", callback);
        // Set the page size explicitly when the component is created
        callback();
        // When this component is destroyed,
        return ()=>{
            // Remove the resize listener
            window.removeEventListener("resize", callback);
        }
    },[]);

    // Define rendering constants
    let h = 650;
    let w = 1000;
    let scale = Math.min((pageSize.width-1)/w,(pageSize.height-1)/h);
    let trueH = scale*h;
    let trueW = scale*w;
    
    // Render a frame with a header and body - the body is locked to a particular aspect ratio
    return <div className="style">
        <div className="style-all" style={{...styles.header, fontSize: fontSize}}>
            <div style={styles.headerLeft}>
                {headerLeft}
            </div>
            {header}
            <div style={styles.headerRight}>
                {headerRight}
            </div>
        </div>
        <div className="style" ref={ref} style={styles.page}>
            <div className={styleAll?"style-all":"style"} id="zoom" style={{
                ...styles.body,
                top: (((pageSize.height-1)-trueH)/2.3)*h/trueH,
                left: ((pageSize.width-1)-trueW)/2*w/trueW,
                width: w,
                height: h,
                opacity: scale<=0?.001:1,
                zoom: scale,
            }}>
                {children}
            </div>
        </div>
    </div>;
};

// Define styles for use with this component
const styleMap = {
    header: {
        left: '50%',
        height: '100px',
        transform: 'translate(-50%,0px)',
        backgroundColor: '#ddd',
        lineHeight: '100px',
        minWidth: '700px',
        textAlign: 'center',
        userSelect: 'none',
    },
    headerLeft: {
        left: '20px',
        width: 'auto',
    },
    headerRight: {
        left: 'auto',
        right: '20px',
        width: 'auto',
    },
    page: {
        top: '100px',
        height: 'calc(100% - 100px)',
    },
    body: {
        transformOrigin: 'top left',
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default Frame;
