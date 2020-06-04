const path = require('path');
const os = require('os');
const fs = require('fs');
const FormData = require('form-data');

const Configuration = require('./configuration');
const bundle = require('./bundle');
const zip = require('./zip');
const authenticate = require('./authenticate');
const configureApp = require('./configure-app');
const createEntry = require('./create-entry');
const logger = require('./logger');

var inquirer = require('inquirer');


async function submitForm(configuration) {
    return new Promise((resolve, reject) => {
        logger.info('Started install');
        const filePath = path.join(os.tmpdir(), 'app.zip');
        const readStream = fs.createReadStream(filePath);
        const form = new FormData();
        logger.info(`host: ${configuration.host}, companyId: ${configuration.companyId}`);
        form.append('file', readStream);

        inquirer.prompt([
            {
                type: 'confirm',
                message: 'Do you want to keep the previous configuration?',
                name: 'keepPreviousConfig'
            }
        ]).then(answers => {
            var keepPreviousConfig = (answers.keepPreviousConfig === true ? 1 : 0);

            form.append('keep_previous_config', keepPreviousConfig);

            var useProxy = configuration.proxyHost && configuration.proxyPort ? true : false;

            if (useProxy)
            {
                logger.info(`Using Proxy ${configuration.proxyHost}:${configuration.proxyPort}`);
            }

            var path = `/api/v1/admin/${configuration.companyId}/apps/${configuration.name}`;

            let buff = new Buffer(`${configuration.proxyUsername}:${configuration.proxyPassword}`);
            let usernamePassBase64 = useProxy ? buff.toString('base64') : ''; 

            const options = {
                protocol: useProxy ? 'http:' : (configuration.port === 443 ? 'https:' : 'http:'),
                host: useProxy ? configuration.proxyHost : configuration.host,
                port: useProxy ? configuration.proxyPort : (configuration.port || 443),
                path: useProxy ? 'https://' + configuration.host + path : path,
                method: 'PUT',
                headers: {
                    'App-Id': configuration.appId,
                    'Auth-Token': configuration.authToken,
                    'Proxy-Authorization' : 'Basic ' + usernamePassBase64
                }
            }

            form.submit(options, (error, response) => {
                if (error) reject(error);
                const statusCode = response.statusCode;
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (statusCode >= 200 && statusCode <= 300) {
                        logger.info('Completed install');
                        resolve(keepPreviousConfig);
                    } else {
                        reject(data);
                    }
                });
            });
        });
    });
}

async function packageAndInstall(argv) {
    try {
        const projectRootPath = process.cwd();
        let configuration = new Configuration(projectRootPath, argv);
        await configuration.validate();
        await configuration.promptConfig();
        await authenticate(configuration);
        await createEntry(configuration);
        await bundle(configuration);
        await zip();

        var formPromise = submitForm(configuration);

        formPromise.then(async (keepPreviousConfig) => {
            if (configuration.appConfig && keepPreviousConfig === 0) {
               await configureApp(configuration);
            }
        });

        await Promise.resolve(formPromise);

    } catch(error) {
        if (error.response && error.response.data) {
            logger.fatal(error.response.data.error || error.response.data);
        }
        logger.fatal(error.stack ? error.stack : error);
    }
}

module.exports = packageAndInstall;
