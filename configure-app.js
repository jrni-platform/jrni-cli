const axios = require('axios');
const httpsProxyAgent = require('https-proxy-agent');

const logger = require('./logger');

async function configureApp(configuration) {
    logger.info('Started config');
    const data = JSON.stringify(configuration.appConfig);
    logger.info(`Config: '${data}'`);
    const protocol = configuration.port === 443 ? 'https' : 'http';
    const URL = `/api/v1/admin/${configuration.companyId}/apps/${configuration.name}/configure`;

    var options = {
        method: 'post',
        url: URL,
        baseURL: `${protocol}://${configuration.host}:${configuration.port}`,
        data: data,
        headers: {
            'App-Id': configuration.appId,
            'Auth-Token': configuration.authToken,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        responseType: 'json'
    }

    var useProxy = configuration.proxyHost && configuration.proxyPort ? true : false;
    if (useProxy)
    {
        logger.info(`Using Proxy ${configuration.proxyHost}:${configuration.proxyPort}`);
        var agent = new httpsProxyAgent(`http://${configuration.proxyUsername}:${configuration.proxyPassword}@${configuration.proxyHost}:${configuration.proxyPort}`);
        options.httpsAgent = agent;
    }

    await axios(options);
    logger.info('Completed config');
}

module.exports = configureApp;
