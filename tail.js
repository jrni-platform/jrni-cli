const https = require('https');
const http = require('http');
const yargs = require('yargs');
const axios = require('axios');

const Configuration = require('./configuration');
const authenticate = require('./authenticate');
const logger = require('./logger');

let shutdown = false;
const chalk = require('chalk');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function getLogs(configuration, start_time = 0) {
    const protocol = configuration.port === 443 ? 'https' : 'http';
    let end_time = start_time; //new Date().getTime();

    let URL;

    if (start_time > 0 )
        URL = `/api/v1/admin/${configuration.companyId}/apps/${configuration.name}/logs?start_time=${start_time}`;
    else
        URL = `/api/v1/admin/${configuration.companyId}/apps/${configuration.name}/logs`;

    try {
        const response = await axios({
            method: 'get',
            url: URL,
            baseURL: `${protocol}://${configuration.host}:${configuration.port}`,
            headers: {
                'App-Id': configuration.appId,
                'Auth-Token': configuration.authToken
            },
            responseType: 'json'
        });
        const json = response.data;

        if (Array.isArray(json)){
            json.forEach((logs) => {
                joinedLines = logs.reduce((joined, line) => joined + line.message, '');
                if (joinedLines != '') console.log(joinedLines);
            });
        } else {
            Object.keys(json).forEach((id) => {
                run = json[id]

                if (run.messages){
                    run.messages.forEach( (message) => {
                        if (message[1] == 'INFO')
                          console.log(chalk.green(`${message[0]}: ${message[2]}`));
                        if (message[1] == 'WARN')
                          console.log(chalk.yellow(`${message[0]}: ${message[2]}`));
                        if (message[1] == 'ERROR')
                          console.log(chalk.red(`${message[0]}:${message[2]}`));
                    });
                    if (run.end_timestamp && run.end_timestamp > end_time)
                        end_time = run.end_timestamp
                }
            })
        }
        await delay(2000);
        if (shutdown) {
            process.exit(0);
        } else {
            await getLogs(configuration, end_time + 1);
        }
    } catch(error) {
        if (error.response) {
            throw error.response.data;
        } else {
            throw error.message;
        }
    }
}

function handleSignal() {
    shutdown = true;
}

module.exports = async function(argv) {
    try {
        const projectRootPath = process.cwd();
        const configuration = new Configuration(projectRootPath, argv);
        await configuration.validate();
        await configuration.promptConfig();
        await authenticate(configuration);
        process.on('SIGINT', handleSignal);
        process.on('SIGTERM', handleSignal);
        logger.info('Tailing logs');

        let start = 0;
        await getLogs(configuration, start);
    } catch(error) {
        logger.fatal(error);
    }
}

