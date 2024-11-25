import React, {CSSProperties} from 'react';
import Radium from 'radium';
import {StaticRouteState} from '../contexts/Route';

type Props = {
    text: string,
    link: string | (()=>void),
};

const HeaderButton: React.FC<Props> = ({text,link}) => {
    // Render a basic header button
    return <div style={styles.button} onClick={()=>{
        if(typeof link === 'string'){
            StaticRouteState.set({type: 'set', val: link});
        } else {
            link();
        }
    }}>
        {text}
    </div>;
};

// Define styles for use with this component
const styleMap = {
    button: {
        top: '50%',
        left: 'auto',
        width: '200px',
        height: '60px',
        transform: 'translate(0px,-50%)',
        lineHeight: '60px',
        fontSize: '30px',
        borderRadius: '10px',
        backgroundColor: '#bbb',
        fontWeight: 'bold',
        cursor: 'pointer',
        color: 'black',
        transition: 'all 300ms ease',
        userSelect: 'none',
        ':hover': {
            backgroundColor: '#aaa',
        },
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default Radium(HeaderButton);
