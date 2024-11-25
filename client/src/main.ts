import {app, BrowserWindow, clipboard, dialog, ipcMain, Menu, MenuItem, shell, webContents} from 'electron';
const {client} = require('electron-connect');
import './util/Config';

// This file is adapted from https://electronjs.org/docs/tutorial/first-app

// Keep a global reference of the window object, if you don't, the window will be closed automatically when the JavaScript object is garbage collected
let win: BrowserWindow;
// TODO: Use an anonymous function rather than a hoisted function
function createWindow(){
    // Wait before showing the window, as sometimes main.ts is invoked twice by webpack and the first instance is terminated after ~1 second
    setTimeout(()=>{ 
        // Create the browser window
        win = new BrowserWindow({
            show: false,
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
        });
        win.maximize();
    
        // Load the app's index.html file
        win.loadFile('index.html');
        client.create(win);
        win.show();
        
        // Open chrome DevTools if development mode is enabled
        if(process.env.NODE_ENV !== 'production'){
            setTimeout(()=>{
                win.webContents.openDevTools();
            },3000);
        }

        // Emitted when the window is closed
        win.on('closed', () => {
            // Dereference the window object, usually you would store windows in an array if your app supports multi windows, this is the time when you should delete the corresponding element
            win = null!;
        });

        win.webContents.on('context-menu', (event, params) => {
            const menu = new Menu()
            
            // Add each spelling suggestion
            for(const suggestion of params.dictionarySuggestions) {
                menu.append(new MenuItem({
                    label: suggestion,
                    click: () => win.webContents.replaceMisspelling(suggestion)
                }));
            }
            
            // Allow users to add the misspelled word to the dictionary
            if(params.misspelledWord) {
                menu.append(new MenuItem({
                    label: 'Add to dictionary',
                    click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
                }));
            }
            
            menu.popup();
        });
          
    },1500);
    
}

const menu = Menu.buildFromTemplate([
    // Mac app menu
    ...(process.platform=='darwin'?[{
        label: app.name,
        submenu: [
            {role: 'about' },
            {role: 'services'},
            {role: 'quit'},
        ],
    }]:[] as any),
    // File
    {
        label: 'File',
        submenu: [
            {
                label: 'Save Memory Snapshot',
                click: async () => {
                    let result = await dialog.showSaveDialog({
                        title: 'Save Memory Snapshot',
                        defaultPath: `Caretta2 Memory Snapshot ${new Date().toLocaleString().replace(/[\/:]/g,'-').replace(/,/g,'')}.heapsnapshot`,
                    });
                    if(!result.canceled && result.filePath !== undefined){
                        try {
                            await win.webContents.takeHeapSnapshot(result.filePath);
                        } catch(e){
                            console.error(e);
                        }
                    }
                }
            },
        ],
    },
    // Edit
    {
        label: 'Edit',
        submenu: [
            {role: 'cut'},
            {role: 'copy'},
            {
                label: 'Paste',
                accelerator: 'CommandOrControl+V',
                click: async ()=>{
                    let wc = webContents.getFocusedWebContents();
                    if(wc != null){
                        let clipboardText = clipboard.readText();
                        const clipboardLines = clipboardText.replace(/[\r\n\t]+/g,'\n').split('\n');
                        if(clipboardLines.length > 1){
                            wc.send('paste', clipboardLines);
                        } else {
                            wc.paste();
                        }
                    }
                },
            },
            {role: 'undo'},
            {role: 'redo'},
            {role: 'selectAll'},
        ],
    },
    // View
    {
        label: 'View',
        submenu: [
            {role: 'forceReload'},
            {role: 'toggleDevTools'},
            {role: 'togglefullscreen'},
        ],
    },
    // Window
    {
        label: 'Window',
        submenu: [
            {role: 'minimize'},
            {role: 'zoom'},
        ],
    },
    // Help
    {
        role: 'help',
        submenu: [
            {
                label: 'GitHub',
                click: async () => {
                    await shell.openExternal('https://github.com/qbeslab/Caretta2');
                }
            },
        ],
    },
]);
Menu.setApplicationMenu(menu);

// This method will be called when Electron has finished initialization and is ready to create browser windows - Some APIs can only be used after this event occurs
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    app.quit();
});

ipcMain.handle('step-settings', (event) => new Promise(resolve=>{
    let res: string | undefined = undefined;
    const menu = new Menu()
    menu.append(new MenuItem({
        label: 'Duplicate',
        click: () => {
            res = 'duplicate';
        },
    }));
    menu.append(new MenuItem({
        label: 'Delete',
        click: () => {
            res = 'delete';
        },
    }));
    menu.popup();
    menu.on('menu-will-close',()=>{
        setTimeout(()=>{
            resolve(res);
        },1);
    });
}));
