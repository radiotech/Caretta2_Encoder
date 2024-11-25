import React, {CSSProperties} from 'react';
import {StaticEncoderState, useEncoderState} from '../../contexts/Encoder';
import {valOrDash} from '../../util/Util';

type Props = {};

const EncoderSettings: React.FC<Props> = () => {
    // Define a helper function to style property keys
    const key = (text: string) => <span style={styles.key}>{text}</span>;
    
    // Gain access to the global encoder context state
    let encoder = useEncoderState(['bearing','roundTo',2],['zero'],['status']);

    // Render the encoder settings interface
    return <div style={styles.body}>
        <h2 style={styles.h2}>Encoder Settings</h2>
        {encoder.status === 'Not Connected'?null:<>
            {key('Bearing:')} {valOrDash(encoder.bearing,'degrees',2)}<br />
            <button onClick={()=>{
                StaticEncoderState.set({type: 'zero'});
            }}>Set Zero</button><br />
        </>}
    </div>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        position: 'relative',
        height: 'auto',
        padding: '20px',
        fontSize: '17px',
        lineHeight: '30px',
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
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default EncoderSettings;
