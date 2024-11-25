"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var stringify = window.stringify;
{
    let installing = false;
    let installationType = 'local';
    let desktopShortcut = true;
    let launchAfterInstall = true;
    let moduleNames;
    let moduleProps;
    let moduleStates = undefined;
    const setup = () => {
        let syncData = () => {
            $.ajax('status', {
                method: 'POST',
                dataType: 'json',
                cache: false,
                data: JSON.stringify({ states: moduleStates }),
                processData: false,
                contentType: 'application/json',
            }).done(data => {
                if (typeof data === 'object' && ['moduleNames', 'moduleProps', 'moduleStates'].every(x => data[x] !== undefined)) {
                    failedRequestCounter = 0;
                    if (moduleNames === undefined) {
                        moduleNames = data.moduleNames;
                        moduleProps = data.moduleProps;
                        moduleStates = data.moduleStates;
                        moduleNames.sort((a, b) => moduleProps[a].order - moduleProps[b].order);
                        render();
                    }
                    else if (stringify(moduleNames.map(x => x).sort()) === stringify(data.moduleNames.map((x) => x).sort())) {
                        if (stringify(data.moduleProps) !== stringify(moduleProps)) {
                            moduleProps = data.moduleProps;
                            render();
                        }
                    }
                }
                else {
                    failedRequestCounter++;
                }
            }).fail(() => {
                failedRequestCounter++;
            });
        };
        let failedRequestCounter = 0;
        syncData();
        setInterval(() => {
            syncData();
            if (failedRequestCounter >= 3) {
                close();
            }
        }, 100);
        window.addEventListener("beforeunload", () => {
            navigator.sendBeacon("close");
        });
    };
    const close = () => {
        try {
            open(location, '_self').close();
        }
        catch (e) { }
        setTimeout(window.location.reload, 500);
    };
    const install = () => {
        if (!installing && $('.error').filter((i, e) => $(e).height() > 0).length === 0) {
            installing = true;
            $('.container').css({ opacity: '.3', 'pointer-events': 'none' });
            let installingComplete = () => {
                installing = false;
                $('.container').css({ opacity: '1', 'pointer-events': 'all' });
            };
            let tempModuleStates = JSON.parse(JSON.stringify(moduleStates));
            moduleNames.forEach(name => {
                let props = moduleProps[name];
                let state = tempModuleStates[name];
                if (!props.installable) {
                    state.installed = false;
                }
                if (installationType === 'local' && ['client', 'proxy'].some(x => x === name)) {
                    state.installed = true;
                }
                if (!state.installed) {
                    state = { installed: false };
                    tempModuleStates[name] = state;
                }
                else {
                    Object.keys(props.format).forEach(fieldName => {
                        let field = props.format[fieldName];
                        let visible = isVisible(field.visibility, installationType);
                        if (state[fieldName] === undefined || !visible) {
                            state[fieldName] = field.default.local !== undefined ? field.default[installationType] : field.default;
                        }
                    });
                }
            });
            $.ajax('submit', {
                method: 'POST',
                dataType: 'json',
                cache: false,
                data: JSON.stringify({ shortcut: desktopShortcut, launch: launchAfterInstall, states: tempModuleStates }),
                processData: false,
                contentType: 'application/json',
            }).done(data => {
                installingComplete();
                if (typeof data !== 'object') {
                    console.error(data);
                    alert(`An issue was encountered while installing the selected Caretta2 modules.`);
                }
                else if (data.error !== undefined) {
                    alert(`The installation failed with the following error message: "${data.error}"`);
                }
                else {
                    alert('The installation has completed. Please refer to the installer\'s terminal window for additional details.');
                    close();
                }
            }).fail(data => {
                installingComplete();
                alert('An issue was encountered when attempting to install Caretta2 using the provided settings.');
            });
        }
    };
    const isVisible = (visibility, installationType) => visibility === true || visibility === installationType;
    const validate = () => {
        $('.validate').each((i, e) => {
            $(e).parent().next().height(RegExp(decodeURIComponent($(e).attr('data-validate'))).test($(e).val()) ? 0 : 'auto');
        });
    };
    const render = () => {
        let body = '';
        let linkedFunctions = {};
        let linkFunction = (f) => {
            let id = `${Math.random()}${Math.random()}`;
            linkedFunctions[id] = f;
            return `"linkedFunctions['${id}'](this);"`;
        };
        body += `<div class="title">Caretta2 Installer</div>
        <hr />
        <div class="subtitle">General</div>
        <div class="row">
            Installation Type:&emsp;<select onchange=${linkFunction(e => {
            installationType = $(e).val();
            render();
        })}>
                <option value="local"${installationType === 'local' ? ' selected' : ''}>Local</option>
                <option value="networked"${installationType === 'local' ? '' : ' selected'}>Networked</option>
            </select>&ensp;<span class="info" title="Specify whether this installation is local or networked. A local installation will only work with hardware devices connected to this computer while a networked setup can incorporate devices connected to other computers. Please refer to the project's GitHub wiki for details regarding local and networked setups.">ⓘ</span>
        </div><div class="row">
            Create Desktop Shortcuts:&ensp;<input type="checkbox" ${desktopShortcut ? 'checked ' : ''}onchange=${linkFunction(e => {
            desktopShortcut = $(e).is(':checked');
        })}></input>&ensp;<span class="info" title="If checked, Caretta2 setup and start shortcuts will be added to your desktop.">ⓘ</span>
        </div><div class="row">
            Launch After Install:&ensp;<input type="checkbox" ${launchAfterInstall ? 'checked ' : ''}onchange=${linkFunction(e => {
            launchAfterInstall = $(e).is(':checked');
        })}/>&ensp;<span class="info" title="If checked, the application will be launched after it is installed.">ⓘ</span>
        </div>`;
        moduleNames.forEach(name => {
            let props = moduleProps[name];
            let state = moduleStates[name];
            if (!props.installable) {
                return;
            }
            let fieldNames = Object.keys(props.format).filter(x => isVisible(props.format[x].visibility, installationType));
            if (['client', 'proxy'].some(x => x === name) && fieldNames.length === 0) {
                return;
            }
            fieldNames.sort((a, b) => props.format[a].order - props.format[b].order);
            body += `<hr />
            <div class="subtitle">${props.name}</div>
            <div class="description">${props.description}</div>
            
            <div class="row">
                Install:&ensp;<input type="checkbox" ${state.installed ? 'checked ' : ''}onchange=${linkFunction(e => {
                state.installed = $(e).is(':checked');
                render();
            })}/>&ensp;<span class="info" title="Specify whether this module should be installed.">ⓘ</span>
            </div>`;
            if (!state.installed) {
                return;
            }
            fieldNames.forEach(fieldName => {
                let field = props.format[fieldName];
                let value = state[fieldName];
                if (value === undefined) {
                    value = field.default.local !== undefined ? field.default[installationType] : field.default;
                }
                let input = '';
                let error = '';
                if (field.type === 'string') {
                    let onChange = linkFunction(e => {
                        $(e).parent().next().height(0);
                        state[fieldName] = $(e).val();
                    });
                    let onBlur = linkFunction(validate);
                    input += `<input class="validate" data-validate="${encodeURIComponent(field.regex)}" type="text" onblur=${onBlur} onkeyup=${onChange} oninput=${onChange} value="${value.replace(/"/g, "&quot;")}"/>`;
                    error += `<div class="error">${field.regexMessage}</div>`;
                }
                else if (field.type === 'select') {
                    input += `<select onchange=${linkFunction(e => {
                        state[fieldName] = $(e).val();
                    })}>
                        ${field.options.every(x => x !== value) ? `<option selected>${value}</option>` : ''}
                        ${field.options.map(x => `<option${x === value ? ' selected' : ''}>${x}</option>`).join('')}
                    </select>`;
                }
                body += `<div class="row">
                    ${field.name}:&emsp;${input}${field.description.length > 0 ? `&ensp;<span class="info" title="${field.description.replace(/"/g, "&quot;")}">ⓘ</span>` : ''}
                </div>${error}`;
            });
        });
        body += `<hr /><div class="install-button"><button type="button" onclick=${linkFunction(install)}>Install</button></div>`;
        $('body').html(`<div class="container">${body}</div>`);
        $('.info').off('click').on('click', (e) => {
            alert($(e.target).attr('title'));
        });
        window.linkedFunctions = linkedFunctions;
        validate();
    };
    $(setup);
}
