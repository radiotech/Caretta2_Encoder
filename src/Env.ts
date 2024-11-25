// Define an environment variable validator type
export type EnvValidator = Record<string,{
    regex?: RegExp,
    test?: (value: string)=>boolean,
    message?: string,
}>;

// Define a function to validate the current environment variables
export const validateEnv = (validator: EnvValidator)=>{
    // Ensure that the caretta token is present and valid
    if(typeof process.env.CARETTA_TOKEN !== 'string'){
        throw new Error('Please set the CARETTA_TOKEN configuration value');
    } else if(!/^[a-zA-Z0-9_\-]*$/.test(process.env.CARETTA_TOKEN)){
        throw new Error(`The provided CARETTA_TOKEN configuration value contains illegal characters (only letters, numbers, and '-' or '_' symbols are allowed)`);
    }

    // For each additional configuration option to validate,
    Object.keys(validator).forEach(key=>{
        let {
            regex,
            test = ()=>true,
            message = `Please provide a valid ${key} configuration value`,
        } = validator[key];

        // Ensure that the option is set
        if(typeof process.env[key] !== 'string'){
            throw new Error(message);
        }

        // Ensure that the provided value matches the regex test for this variable, if applicable
        if(regex !== undefined && !regex.test(process.env[key]!)){
            console.log(regex);
            console.log(process.env[key]);
            throw new Error(message);
        }

        // Ensure that the provided value passes the test function for this variable
        try {
            if(!test(process.env[key]!)){
                throw new Error(message);
            }
        } catch(e){
            throw new Error(message);
        }
    })
};
