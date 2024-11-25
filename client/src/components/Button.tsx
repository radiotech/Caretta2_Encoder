import React, {CSSProperties} from 'react';
import Radium from 'radium';

type Props = {
    text: string,
    action: ()=>void,
    height?: number,
};

const Button: React.FC<Props> = ({
    text,
    action,
    height = 60,
}) => {
    // Return a basic styled button
    return <div onClick={action} style={{
        ...styles.button,
        minWidth: `${height/3*10}px`,
        height: `${height}px`,
        lineHeight: `${height}px`,
        fontSize: `${height/2}px`,
        borderRadius: `${height/6}px`,
        paddingLeft: `${height/2}px`,
        paddingRight: `${height/2}px`,
    }}>
        {text}
    </div>;
};

// Define styles for use with this component
const styleMap = {
    button: {
        position: 'relative',
        top: '50%',
        left: 'auto',
        float: 'left',
        width: 'max-content',
        transform: 'translate(0px,-50%)',
        backgroundColor: '#ccc',
        fontWeight: 'bold',
        cursor: 'pointer',
        color: 'black',
        textAlign: 'center',
        transition: 'all 300ms ease',
        userSelect: 'none',
        ':hover': {
            backgroundColor: '#bbb',
        },
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default Radium(Button);
