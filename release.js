
const path = require('path');
const os = require('os');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const url = require('url');

const bundle = require('./bundle');
const zip = require('./zip');
const authenticate = require('./authenticate');
const configureApp = require('./configure-app');
const createEntry = require('./create-entry');
const logger = require('./logger');

var inquirer = require('inquirer');
const AWS = require('aws-sdk');

async function doInstall(config, release_number){

    const projectRootPath = process.cwd();

    let current = config.manifest.version.split(".")

    if (current.length < 2)
        current.push("0")
    if (current.length < 2)
        current.push("0")

    let version = `${current[0]}.${current[1]}`

    const data =  JSON.stringify({
        deployer: config.email,
        manifest: config.manifest,
        name:  config.manifest.name,
        unique_name:  config.manifest.unique_name,
        stable:  true,
        edge: true,
        public: true,
        version: version,
        release_number: release_number,
        location: config.location
    });

    const options = {
        url: "https://app-auth.jrni.com/api/v5/admin/37000/apps/app_release_manager/scripts/releaseApp",
        baseURL: "https://app-auth.jrni.com",
        method: 'post',
        data: data,
        headers: {
            'App-Id': config.auth.appId,
            'Auth-Token': config.auth.authToken,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        responseType: 'json'
    }


    try {
        const response = await axios(options);
        const json = response.data;
        logger.info('Completed install');
        return json;
    } catch(error) {
        if (error.response) {
            console.error(error.response)
        }
        throw error
    }

}


async function getUrl(config){

    const projectRootPath = process.cwd();

    const manifest = require(path.resolve(projectRootPath, 'manifest.json'));

    const data =  JSON.stringify({
        email: config.email,
        name:  manifest.unique_name,
        version: manifest.version
    });

    const options = {
        url: "https://app-auth.jrni.com/api/v5/admin/37000/apps/app_release_manager/scripts/getReleaseUrl",
        baseURL: "https://app-auth.jrni.com",
        method: 'post',
        data: data,
        headers: {
            'App-Id': config.auth.appId,
            'Auth-Token': config.auth.authToken,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        },
        responseType: 'json'
    }


    try {
        const response = await axios(options);
        const json = response.data;
        logger.info('Completed getting deploy path');
        return json.data;
    } catch(error) {
        if (error.response) {
            console.error(error.response)
        }
        throw error
    }

}

async function doRelease(config, releaseNumber){

    // furst update the version
    let current = config.manifest.version.split(".")

    if (current.length < 2)
        current.push("0")
    if (current.length < 2)
        current.push("0")

    let version = `${current[0]}.${current[1]}.${releaseNumber}`

    config.manifest.version = version

    const projectRootPath = process.cwd();

    const content = JSON.stringify(config.manifest, null, 2)

    await new Promise((resolve, reject) => {
        fs.writeFile('manifest.json', content, resolve);
    });


    await createEntry(config);
    await bundle(config);
    await zip(true);


    logger.info("Completed Build")

}

async function deploy(argv) {
    try {
        const projectRootPath = process.cwd();

        const config = {
            host: "app-auth.jrni.com",
            port: 443,
            email: process.env.APP_INSTALL_EMAIL,
            password: process.env.APP_INSTALL_PASSWORD,
            appId: '302e48d75f4b55016aaf2c81f5ddf80f039e3f863277',
            manifest: require(path.resolve(projectRootPath, 'manifest.json')),
            isDev: function() {return false},
            rootPath: projectRootPath

        }

        // authenticate
        const res = await authenticate(config)
        config.auth = res

        // get a signed url
        const urlData = await getUrl(config)

        await doRelease(config, urlData.releaseNumber)

        // load the data
        const fileContent = fs.readFileSync('./release/app.zip');

        // and push to s3 using the signed url
        const xres = await axios.put(urlData.signedUrl, fileContent, {
            'x-amz-acl': 'public-read',
            'Content-Type': 'application/zip, application/octet-stream'
        }); 

        if (xres && xres.status == 200)
        {
            // confirm the release
            config.location = urlData.url
            const install = await doInstall(config, urlData.releaseNumber)

            logger.info("*********************************************************")
            logger.info(`* Sucessfully released: ${config.manifest.name}, version: ${config.manifest.version}`)
            logger.info("*********************************************************")

        }  else {
            logger.fatal("Failure to upload app: ", xres.status, xres.statusText)
        }


    } catch(error) {
        if (error.response && error.response.data) {
            logger.fatal(error.response.data.error || error.response.data);
        }
        logger.fatal(error.stack ? error.stack : error);
    }
}

module.exports = deploy;
