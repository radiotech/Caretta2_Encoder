import React, {CSSProperties} from 'react';
import Radium from 'radium';
import {StaticRouteState} from '../contexts/Route';

type Props = {
    text: string,
    link: string,
    image: string, // Should be a link relative to files in the components or pages folders
};

const MenuButton: React.FC<Props> = ({text,link,image}) => {
    // Render a basic button with an image
    return <div style={styles.button} onClick={()=>{StaticRouteState.set({type: 'set', val: link});}}>
        <div style={{...styles.image,backgroundImage:`url(${image})`}} />
        {text}
    </div>;
};

// Define styles for use with this component
const styleMap = {
    button: {
        position: 'relative',
        width: '200px',
        height: '200px',
        borderRadius: '20px',
        cursor: 'pointer',
        lineHeight: '35px',
        textAlign: 'center',
        transition: 'all 500ms ease',
        userSelect: 'none',
        ':hover': {
            backgroundColor: '#ddd',
        },
    },
    image: {
        position: 'relative',
        marginTop: '0px',
        marginLeft: '20px',
        marginRight: '20px',
        width: '160px',
        height: '160px',
        backgroundSize: 'cover',
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default Radium(MenuButton);
