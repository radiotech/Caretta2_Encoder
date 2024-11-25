import React, {CSSProperties, Fragment} from 'react';
import Frame from '../components/Frame';
import HeaderButton from '../components/HeaderButton';
import TabWindow from '../components/TabWindow';
import {StaticRouteState} from '../contexts/Route';
import {useEncoderState} from '../contexts/Encoder';
import EncoderSettings from '../components/settings/EncoderSettings';

type Props = {};

const Setup: React.FC<Props> = () => {
    // Gain access to global contexts
    let encoder = useEncoderState(['status']);

    // Create a list of all connected components
    let components: {status?: string, name: string, element: any}[] = [
        {status: encoder.status, name: 'Encoder', element: <EncoderSettings/>},
    ].filter(x=>x.status === 'Connected');

    // If no components are connected, navigate to the menu page
    if(components.length === 0){
        StaticRouteState.set({type: 'set', val: ''});
    }

    // Return a page with component settings on separate tabs
    return <Frame headerLeft={
        <HeaderButton text="Back" link="" />
    } header="I/O Setup">
        <div style={styles.body}>
            <TabWindow names={components.map(x=>x.name)}>
                {components.map(x=><Fragment key={x.name}>{x.element}</Fragment>)}
            </TabWindow>
        </div>
    </Frame>;
};

// Define styles for use with this component
const styleMap = {
    body: {
        top: '10%',
        left: '10%',
        width: '80%',
        height: '83%',
    },
} as const;
const styles: Record<keyof typeof styleMap,CSSProperties> = styleMap;

// Export this function component
export default Setup;
