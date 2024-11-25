import React, {CSSProperties, memo, useMemo} from 'react';
import {useEncoderState} from '../../contexts/Encoder';
const image = {
    compass: [require('../../images/gauge_1.png').default, require('../../images/gauge_2.png').default],
};

type Props = {};

const Gauge: React.FC<Props> = ({}) => {
    // Gain access to global contexts
    let encoder = useEncoderState(...(true?[['bearing','diff',.5]]:[]));

    // Render the gauge
    return <>
        <div style={{
            ...styles.image,
            backgroundImage: `url('${image.compass[0]}')`,
        }} />
        <div style={{
            ...styles.image,
            backgroundImage: `url('${image.compass[1]}')`,
            opacity: 1,
            transformOrigin: '50% 50%',
            transform: `rotate(${encoder.bearing??0}deg) scale(${1})`
        }} />
    </>;
    
};

// Define styles for use with this component
const styleMap = {
    image: {
        backgroundSize: '100% 100%',
    },
} as const;
const styles: Record<keyof typeof styleMap, CSSProperties> = styleMap;

// Export this function component
export default memo(Gauge);
