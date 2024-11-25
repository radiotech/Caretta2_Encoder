import React, {CSSProperties, useState} from 'react';

type Props = {
    names: string[],
    fontSize?: number,
    tabHeight?: number,
    tabPadding?: number,
};

const TabWindow: React.FC<Props> = ({
    names,
    fontSize = 20,
    tabHeight = 40,
    tabPadding = 10,
    children,
}) => {
    // Ensure that the supplied properties are valid
    if(names.length <= 0 || React.Children.count(children) !== names.length){
        console.error('Invalid number of names, paths, or children provided to TabWindow component');
    }

    // Track a 'path' that represents the currently selected tab
    let [path, setPath] = useState(names[0]);
    
    // Retrieve the component associated with this tab
    let child = React.Children.map(children,child=>child)!.filter((child,i)=>path===names[i])[0];
    
    // If this tab does not exist, switch to the first tab
    if(child === undefined && names.length>0){
        setPath(names[0]);
    }

    // Merge the component styles with the styles passed as properties
    let tabStyle: CSSProperties = {
        ...styles.tab,
        fontSize: `${fontSize}px`,
        height: `${tabHeight}px`,
        lineHeight: `${tabHeight}px`,
        paddingLeft: `${tabPadding}px`,
        paddingRight: `${tabPadding}px`,
    };

    // Render this tab window including the currently selected child component
    return <div>
        <div className="tab-scroll" style={{top: 'auto', bottom: `calc(100% - ${tabHeight+1}px)`, height: 'auto', width: 'calc(100% - 12px)', overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'nowrap'}}>
            {names.map((n,i)=>path===names[i]
                ?<div key={i} style={{...tabStyle, ...styles.selectedTab}}>{n}</div>
                :<div key={i} style={tabStyle} onClick={()=>{setPath(names[i])}}>{n}</div>
            )}
        </div>
        <div style={{...styles.window, top: `${tabHeight}px`, height: `calc(100% - ${tabHeight}px)`}}>
            <div style={styles.window_inner}>
                {child}
            </div>
        </div>
    </div>;
};

// Define styles for use with this component
const styleMap = {
    tab: {
        position: 'relative',
        width: 'auto',
        display: 'inline-block',
        cursor: 'pointer',
        borderTop: '2px solid #555',
        borderLeft: '2px solid #555',
        borderRight: '2px solid #555',
        borderTopLeftRadius: '10px',
        borderTopRightRadius: '10px',
        marginRight: '-2px',
        fontWeight: 'bold',
        userSelect: 'none',
    },
    selectedTab: {
        backgroundColor: '#ddd',
    },
    window: {
        border: '2px solid #555',
        borderTopRightRadius: '10px',
        borderBottomLeftRadius: '10px',
        borderBottomRightRadius: '10px',
        overflow: 'hidden',
    },
    window_inner: {
        overflowY: 'auto',
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default TabWindow;
