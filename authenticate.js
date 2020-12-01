const https = require('https');
const http = require('http');
const inquirer = require('inquirer');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const axios = require('axios');
const httpsProxyAgent = require('https-proxy-agent');

const logger = require('./logger');

async function promptForCompany(companies, configuration, cb) {
    const questions = [{
        type: 'list',
        name: 'companyId',
        message: 'Which company do you wish to install to ?',
        paginated: true,
        choices: companies
    }];
    const answers = await inquirer.prompt(questions);
    configuration.companyId = answers.companyId;
    await authenticate(configuration);
}

async function authenticate(configuration) {
    logger.info('Started authorization');
    const data = JSON.stringify({
        email: configuration.email,
        password: configuration.password
    });
    const protocol = configuration.port === 443 ? 'https' : 'http';
    const URL = configuration.companyId ? `/api/v1/login/admin/${configuration.companyId}` : '/api/v1/login/admin'

    var options = {
        method: 'post',
        url: URL,
        baseURL: `${protocol}://${configuration.host}:${configuration.port}`,
        data: data,
        headers: {
            'App-Id': configuration.appId,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        responseType: 'json'
    };

    var useProxy = configuration.proxyHost && configuration.proxyPort ? true : false;
    if (useProxy)
    {
        logger.info(`Using Proxy ${configuration.proxyHost}:${configuration.proxyPort}`);
        var agent = new httpsProxyAgent(`http://${configuration.proxyUsername}:${configuration.proxyPassword}@${configuration.proxyHost}:${configuration.proxyPort}`);
        options.httpsAgent = agent;
    }

    try {
        const response = await axios(options);
        const json = response.data;
        configuration.authToken = json.auth_token;
        configuration.companyId = json.company_id;
        if (configuration.writeToFile)  
          await configuration.writeToFile();
        logger.info('Completed authorization');
        return configuration;
    } catch(error) {
        if (error.response) {
            if (error.response.status == 400) {
                const json = error.response.data;
                const companies = json._embedded.administrators.map((admin) => {
                    return {
                        name: admin.company_name,
                        value: admin.company_id
                    };
                });
                await promptForCompany(companies, configuration);
            } else if (error.response.error) {
                throw error.response.error;
            } else {
                throw error;
            }
        } else {
            throw error.message;
        }
    }
}

module.exports = authenticate;
