import * as React from 'react';
import {useRouteState} from './contexts/Route';
import Menu from './pages/Menu';
import Setup from './pages/Setup';
import ResourceList from './pages/ResourceList';
import TurtleVR from './pages/TurtleVR';
import Procedure from './pages/Procedure';
import NotFound from './pages/NotFound';

// This component switches the displayed page based upon the current route within the app
const Router: React.FC = () => {
    // Gain access the global route value to use for page switching
    let route = useRouteState();

    // Return the appropriate page based upon the route value
    return (x=>x===undefined?<NotFound />:x)(({
        '': <Menu />,
        setup: <Setup />,
        trial_resource_list: <ResourceList type="trial" />,
        procedure_resource_list: <ResourceList type="procedure" />,
        trial: <TurtleVR />,
        procedure: <Procedure />,
    } as {[index: string]: any})[route.path]);
}

// Export this function component
export default Router;
