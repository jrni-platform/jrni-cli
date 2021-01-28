
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


async function package(argv) {
    try {
        const projectRootPath = process.cwd();
        let configuration = new Configuration(projectRootPath, argv);
        await configuration.validate();
        await createEntry(configuration);
        await bundle(configuration);
        await zip(true);


    } catch(error) {
        if (error.response && error.response.data) {
            logger.fatal(error.response.data.error || error.response.data);
        }
        logger.fatal(error.stack ? error.stack : error);
    }
}

module.exports = package;
