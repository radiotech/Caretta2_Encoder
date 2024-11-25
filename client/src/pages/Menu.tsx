import React, {CSSProperties} from 'react';
import Frame from '../components/Frame';
import MenuButton from '../components/MenuButton';
import {useEncoderState} from '../contexts/Encoder';
let SetupImage = require('../images/setup_icon.png').default;
let TrialIcon = require('../images/trial_icon.png').default;
let ProcedureIcon = require('../images/procedure_icon.png').default;

type Props = {};

const Menu: React.FC<Props> = () => {
    // Gain access to the global state for the encoder
    let encoder = useEncoderState(['status']);
    
    // Add an icon to the menu for the encoder if it is connected
    let pages: {text: string, link: string, image: any}[] = [];
    if([encoder].some(x=>x.status!=='Not Connected')){
        pages.push({text: "I/O Setup", link: "setup", image: SetupImage});
    }
    pages.push({text: "Trials", link: "trial_resource_list", image: TrialIcon});
    pages.push({text: "Procedures", link: "procedure_resource_list", image: ProcedureIcon});

    // Return a page with the selected icons and links
    return <Frame header="Caretta2" fontSize={55}>
        <div style={styles.boxes}>
            {pages.map(x=><MenuButton key={x.link} text={x.text} link={x.link} image={x.image}/>)}
        </div>
    </Frame>;
};

// Define styles for use with this component
const styleMap = {
    boxes: {
        top: '200px',
        height: '200px',
        display: 'flex',
        flexWrap: 'nowrap',
        justifyContent: 'space-evenly',
    },
} as const;
const styles: Record<keyof typeof styleMap,CSSProperties> = styleMap;

// Export this function component
export default Menu;
