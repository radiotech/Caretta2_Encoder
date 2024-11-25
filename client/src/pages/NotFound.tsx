import React, {CSSProperties} from 'react';
import Frame from '../components/Frame';
import HeaderButton from '../components/HeaderButton';

type Props = {};

const NotFound: React.FC<Props> = () => {
    // Render a 404 page
    return <Frame headerLeft={
        <HeaderButton text="Home" link="" />
    } header="Caretta2" fontSize={55}>
        <div style={styles.body}>
            That page could not be found
        </div>
    </Frame>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        top: '50%',
        height: 'auto',
        transform: 'translate(0px,-50px)',
        textAlign: 'center',
        fontSize: '22px',
    },
} as const;
const styles: Record<keyof typeof styleMap,CSSProperties> = styleMap;

// Export this function component
export default NotFound;
