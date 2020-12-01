const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const archive = archiver('zip');

const logger = require('./logger');

async function zip(local = false) {
    return new Promise((resolve, reject) => {
        let filepath = os.tmpdir();
        if (local){
            filepath = "release"
            if (!fs.existsSync("./release"))
                fs.mkdirSync("./release")
        }
        logger.info('Started zip');
        const output = fs.createWriteStream(path.join(filepath, 'app.zip'));
        output.on('close', function () {
            logger.info(archive.pointer() + ' total bytes');
            logger.info('Completed zip');
            resolve();
        });
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                logger.warn(err.message);
            } else {
                reject(err);
            }
        });
        archive.on('error', function (err){
            reject(err);
        });
        archive.pipe(output);
        archive.glob('./manifest.json');
        archive.glob('./**/!(bbug-apps-cli*|manifest.json|app.zip)');
        archive.glob('./*/manifest.json');
        archive.finalize();
    });
}

module.exports = zip;
