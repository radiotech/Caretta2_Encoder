<img src="https://i.imgur.com/dBB7G3W.png" width="500"></img>

Caretta2 is a software system that allows for the control of US Digital USB4 encoder devices for the execution of animal navigation experiments. Within the software, connected encoders can be configured and "procedures" can be created, stored, and executed in order to define patterns of data collection from the encoder and to generate data reports.

## Getting Started
To get started with Caretta2, make sure you have the following dependencies installed: [`Node.js v12.22.12`](https://nodejs.org/en/download/package-manager), [`node-gyp v9.4.1`](https://www.npmjs.com/package/node-gyp/v/9.4.1), and the latest US Digital [USB4 Drivers and Libraries](https://www.usdigital.com/support/resources/downloads/software/usb4-software) (v1.9). You can then clone the project locally, launch a terminal instance in the cloned project folder, and run `npm run setup` to launch the Caretta2 interactive installation wizard. This wizard will guide you through the installation process and allow you to create a desktop shortcut for the project. Typical installation and setup times on standard windows computers should be less than 10 minutes.

## Encoder Demo
An "Encoder Demo" procedure is included with the app in order to demonstrate the process of collecting data from the encoder over a period of time and generating a data report. The demo procedure should take 5 minutes to complete. The following steps describe the process of running the demo.
1. Install the software using the instructions provided above. During the setup step, input a "Cycles per Revolution" value that is appropriate for the US Digital encoder that you are using. Otherwise, all settings can be left in their default states.
2. Once the setup window closes and the main interface opens, select "Trials" then "New Trial".
3. Enter a name for the trial in the topmost field, select "Encoder Demo" from the procedure dropdown list, then press "Start Trial".
4. The demo trial should begin executing. It is configured to collect data from the encoder for 5 minutes with a rate of 1 samples per second.
5. After the trial is complete the software will calculate a mean angle for the recorded encoder data and print it to the output window. All collected data can also be saved to your computer for review by pressing the "Export Data" button.
