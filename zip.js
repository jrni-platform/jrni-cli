const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const archive = archiver('zip');

const logger = require('./logger');

function zip(cb) {
    const output = fs.createWriteStream(path.join(os.tmpdir(), 'app.zip'));
    const dir = path.basename(process.cwd());
    logger.info(process.cwd());
    process.chdir('..');
    output.on('close', function () {
        logger.info(archive.pointer() + ' total bytes');
        cb();
    });
    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            logger.warn(err.message);
        } else {
            cb(err);
        }
    });
    archive.on('error', function (err){
        cb(err);
    });
    archive.pipe(output);
    archive.glob(`${dir}/**/!(bbug-apps-cli*)`);
    archive.finalize();
}

module.exports = zip;
