// Import required NPM modules
import * as child_process from 'child_process';
let fs = require('fs');

// Switch to the main Caretta2 directory if called from the scripts directory
if(process.cwd().indexOf('scripts')===process.cwd().length-7){
    process.chdir('..');
}

// If the installer dependencies are not installed,
if(!fs.existsSync('./node_modules')){
    console.log('Loading installer dependencies');

    // Load the installer dependencies
    child_process.spawnSync('npm',['install','--no-audit'],{
        shell: true,
        cwd: '.',
        stdio: 'inherit',
        windowsHide: true,
    });
}

// Spawn the install process
let child = child_process.spawn('node',['setup.js', ...process.argv.slice(2)],{
    detached: true,
    cwd: './scripts',
    windowsHide: true,
});
// Explicitly pipe the output of the child process to the terminal
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
