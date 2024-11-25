import {ModuleProps, installationType, visibilityType} from '../setup_util';
var stringify = (window as any).stringify;

{
    // Define global variables used to track setup state
    let installing = false;
    let installationType: installationType = 'local';
    let desktopShortcut = true;
    let launchAfterInstall = true;

    // Define global variables to store the current installation properties and state (from the backend)
    let moduleNames: string[];
    let moduleProps: Record<string, ModuleProps<any>>;
    let moduleStates: any = undefined;
    
    // Define a setup function (called after the page loads)
    const setup = ()=>{
        
        // Define a function to retrieve data from the backend
        let syncData = ()=>{
            // Make a request to the 'status' endpoint
            $.ajax('status',{
                method: 'POST',
                dataType: 'json',
                cache: false,
                data: JSON.stringify({states: moduleStates}),
                processData: false,
                contentType: 'application/json',
            }).done(data=>{
                // If the request succeeds, track the success
                // Otherwise, track the failure
                if(typeof data === 'object' && ['moduleNames','moduleProps','moduleStates'].every(x=>data[x]!==undefined)){
                    failedRequestCounter = 0;
                    // If this is the first request or the module properties have changed, update the stored data for the backend
                    if(moduleNames === undefined){
                        // Update all stored data for the backend
                        moduleNames = data.moduleNames;
                        moduleProps = data.moduleProps;
                        moduleStates = data.moduleStates;
                        // Sort the module names by their order property
                        moduleNames.sort((a,b)=>moduleProps[a].order-moduleProps[b].order);
                        // Render the page
                        render();
                    } else if(stringify(moduleNames.map(x=>x).sort()) === stringify(data.moduleNames.map((x: string)=>x).sort())){
                        if(stringify(data.moduleProps) !== stringify(moduleProps)){
                            // Update the stored module properties
                            moduleProps = data.moduleProps;
                            // Render the page
                            render();
                        }
                    }
                } else {
                    failedRequestCounter++;
                }
            }).fail(()=>{
                failedRequestCounter++;
            });
        }

        // Retrieve data from the backend 10 times per second, close the page if this fails 3 times consecutively
        let failedRequestCounter = 0;
        syncData();
        setInterval(()=>{
            syncData();
            if(failedRequestCounter >= 3){
                close();
            }
        },100);
        
        // When the page closes, send a close message to the backend to terminate the setup server
        window.addEventListener("beforeunload", ()=>{
            navigator.sendBeacon("close");
        });
    };

    // Define a function to close the page
    const close = ()=>{
        // Attempt to close the page
        try {
            open(location as any, '_self')!.close();
        } catch(e){}
        // If the page was not closed, reload the page in .5 seconds
        setTimeout(window.location.reload,500);
    }

    // Define a function to complete the installation
    const install = ()=>{
        // If an installation is not currently in progress and no errors are present for the provided user input,
        if(!installing && $('.error').filter((i,e)=>$(e).height()!>0).length === 0){
            // Prevent additional installations from being initiated and block the page
            installing = true;
            $('.container').css({opacity: '.3', 'pointer-events': 'none'});

            // Define a function to allow additional installations and unblock the page
            let installingComplete = ()=>{
                installing = false;
                $('.container').css({opacity: '1', 'pointer-events': 'all'});
            };

            // Create a temp module state object to store the desired configuration state of the caretta2 system
            let tempModuleStates = JSON.parse(JSON.stringify(moduleStates));

            // For each module,
            moduleNames.forEach(name=>{
                // Extract the props and state for this module
                let props = moduleProps[name];
                let state = tempModuleStates[name];
                
                // Do not install modules that are not installable
                if(!props.installable){
                    state.installed = false;
                }
                // If this is a local installation, install the client and proxy components
                if(installationType==='local' && ['client','proxy'].some(x=>x===name)){
                    state.installed = true;
                }
                // If this module should not be installed, clear all other state values
                if(!state.installed){
                    state = {installed: false};
                    tempModuleStates[name] = state;
                } else {
                    // Overwrite the state value set for any hidden fields with the default value for the current installation type
                    Object.keys(props.format).forEach(fieldName=>{
                        let field = props.format[fieldName];
                        let visible = isVisible(field.visibility,installationType);
                        if(state[fieldName] === undefined || !visible){
                            state[fieldName] = (field.default as any).local!==undefined?(field.default as any)[installationType]:field.default;
                        }
                    });
                }
            });
            
            // Submit the new installed modules and configuration options to the backend
            $.ajax('submit',{
                method: 'POST',
                dataType: 'json',
                cache: false,
                data: JSON.stringify({shortcut: desktopShortcut, launch: launchAfterInstall, states: tempModuleStates}),
                processData: false,
                contentType: 'application/json',
            }).done(data=>{
                installingComplete();
                if(typeof data !== 'object'){
                    console.error(data);
                    alert(`An issue was encountered while installing the selected Caretta2 modules.`);
                } else if(data.error !== undefined){
                    alert(`The installation failed with the following error message: "${data.error}"`);
                } else {
                    alert('The installation has completed. Please refer to the installer\'s terminal window for additional details.');
                    close();
                }
            }).fail(data=>{
                installingComplete();
                alert('An issue was encountered when attempting to install Caretta2 using the provided settings.');
            });
        }
        
    };

    // Define a function for use in determining whether a module field is visible
    const isVisible = <State>(visibility: visibilityType<State>, installationType: installationType)=>visibility===true||visibility===installationType;

    // Define a function to validate user input
    const validate = ()=>{
        // For each field to validate
        $('.validate').each((i,e)=>{
            // Test the supplied value against the field's test expression
            // If a value is not valid, show the error text for that field
            $(e).parent().next().height(RegExp(decodeURIComponent($(e).attr('data-validate')!)).test($(e).val() as string)?0:'auto');
        });
    }

    // Define a function to render the install interface
    const render = ()=>{

        // Define a body string that will contain all html to inject into the DOM
        let body = '';

        // Create a utility function to link html callbacks with arbitrary functions
        let linkedFunctions: Record<string,(e: HTMLElement)=>void> = {};
        let linkFunction = (f: (e: HTMLElement)=>void)=>{
            // Generate an id for this callback
            let id = `${Math.random()}${Math.random()}`;
            // Add the provided function to the linked function list
            linkedFunctions[id] = f;
            // Return an html callback string for the linked function
            return `"linkedFunctions['${id}'](this);"`;
        };

        // Render the top-level page content
        body += `<div class="title">Caretta2 Installer</div>
        <hr />
        <div class="subtitle">General</div>
        <div class="row">
            Installation Type:&emsp;<select onchange=${linkFunction(e=>{
                installationType = $(e).val() as typeof installationType;
                render();
            })}>
                <option value="local"${installationType==='local'?' selected':''}>Local</option>
                <option value="networked"${installationType==='local'?'':' selected'}>Networked</option>
            </select>&ensp;<span class="info" title="Specify whether this installation is local or networked. A local installation will only work with hardware devices connected to this computer while a networked setup can incorporate devices connected to other computers. Please refer to the project's GitHub wiki for details regarding local and networked setups.">ⓘ</span>
        </div><div class="row">
            Create Desktop Shortcuts:&ensp;<input type="checkbox" ${desktopShortcut?'checked ':''}onchange=${linkFunction(e=>{
                desktopShortcut = $(e).is(':checked');
            })}></input>&ensp;<span class="info" title="If checked, Caretta2 setup and start shortcuts will be added to your desktop.">ⓘ</span>
        </div><div class="row">
            Launch After Install:&ensp;<input type="checkbox" ${launchAfterInstall?'checked ':''}onchange=${linkFunction(e=>{
                launchAfterInstall = $(e).is(':checked');
            })}/>&ensp;<span class="info" title="If checked, the application will be launched after it is installed.">ⓘ</span>
        </div>`;
        

        // Render the content for each module
        moduleNames.forEach(name=>{
            // Extract the props and state for this module
            let props = moduleProps[name];
            let state = moduleStates[name];

            // If this module is not installable, skip it
            if(!props.installable){
                return;
            }

            // Extract the field names to render for this module
            let fieldNames = Object.keys(props.format).filter(x=>isVisible(props.format[x].visibility,installationType));

            // If this is the client or proxy server module and their are no fields to render, skip this module entirely
            // (This prevents the client and proxy server modules from being rendered for local installations)
            if(['client','proxy'].some(x=>x===name) && fieldNames.length === 0){
                return;
            }

            // Sort the field names by their order property
            fieldNames.sort((a,b)=>props.format[a].order-props.format[b].order);

            // Render the title, description, and install checkbox for this module
            body += `<hr />
            <div class="subtitle">${props.name}</div>
            <div class="description">${props.description}</div>
            
            <div class="row">
                Install:&ensp;<input type="checkbox" ${state.installed?'checked ':''}onchange=${linkFunction(e=>{
                    state.installed = $(e).is(':checked');
                    render();
                })}/>&ensp;<span class="info" title="Specify whether this module should be installed.">ⓘ</span>
            </div>`;

            // If the module is not selected for installation, do not render additional module options
            if(!state.installed){
                return;
            }

            // For each configuration option,
            fieldNames.forEach(fieldName=>{
                // Extract the properties and current value of this option
                let field = props.format[fieldName];
                let value: string = state[fieldName];

                // If the value is not yet set, render the default value
                if(value === undefined){
                    value = (field.default as any).local!==undefined?(field.default as any)[installationType]:field.default;
                }

                // Initialize fields that will be populated with the input element html and error text for this option
                let input = '';
                let error = '';
                
                // Switch on this option's type (string or select)
                if(field.type === 'string'){
                    // Define a function to handle changes to the option's value
                    let onChange = linkFunction(e=>{
                        // Hide any shown error text
                        $(e).parent().next().height(0);
                        // Update the value stored for this option based upon the user's input
                        state[fieldName] = $(e).val();
                    });
                    // Define a function to handle blue events for this input element (show applicable error messages when the element is unfocused)
                    let onBlur = linkFunction(validate);
                    // Generate the input html and error text for this element
                    input += `<input class="validate" data-validate="${encodeURIComponent(field.regex)}" type="text" onblur=${onBlur} onkeyup=${onChange} oninput=${onChange} value="${value.replace(/"/g,"&quot;")}"/>`;
                    error += `<div class="error">${field.regexMessage}</div>`;
                } else if(field.type === 'select'){
                    // Generate the input html for this element (no error text as arbitrary input is not allowed)
                    input += `<select onchange=${linkFunction(e=>{
                        state[fieldName] = $(e).val();
                    })}>
                        ${field.options!.every(x=>x!==value)?`<option selected>${value}</option>`:''}
                        ${field.options!.map(x=>`<option${x===value?' selected':''}>${x}</option>`).join('')}
                    </select>`;
                }

                // Render this config option
                body += `<div class="row">
                    ${field.name}:&emsp;${input}${field.description.length>0?`&ensp;<span class="info" title="${field.description.replace(/"/g,"&quot;")}">ⓘ</span>`:''}
                </div>${error}`;
            });

        });

        // Render the install button
        body += `<hr /><div class="install-button"><button type="button" onclick=${linkFunction(install)}>Install</button></div>`;

        // Append the generated HTML to the body
        $('body').html(`<div class="container">${body}</div>`);
        // Make info icons clickable
        $('.info').off('click').on('click',(e)=>{
            alert($(e.target).attr('title'));
        });
        // Make the set of linked html callback functions globally accessible
        (window as any).linkedFunctions = linkedFunctions;
        // Validate the current user input
        validate();
    };
    // Call the setup function when the page loads
    $(setup);
}
