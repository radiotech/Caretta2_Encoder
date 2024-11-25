import React from 'react';
import Dialog from './Dialog';

const Global: React.FC<{}> = () => {

    // Create a list of all global components
    let components = [Dialog];

    // Return a React fragment containing all global components
    return <>{components.map((X,i)=><X key={i}></X>)}</>;
};

// Export this function component
export default Global;
