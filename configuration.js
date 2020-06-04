const argv = require('yargs').argv;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const Ajv = require('ajv');
const ajv = new Ajv({verbose: true, extendRefs: true});
var metaSchema = require('ajv/lib/refs/json-schema-draft-04.json');
metaSchema.$id = metaSchema.id;
delete metaSchema.id
ajv.addMetaSchema(metaSchema);
const yargs = require('yargs');
const axios = require('axios');

const logger = require('./logger');

class Configuration {
    constructor(rootPath, argv) {

        this.rootPath = rootPath;

        this._validateAppStructure();

        this.manifest = require(path.resolve(this.rootPath, 'manifest.json'));

        this._validateManifest();
        this._validateCustomObjects();
        this._validateScripts();

        this.bbugrcPath = path.join(process.cwd(), '.bbugrc');

        this.email = argv.email;
        this.password = argv.password;
        this.host = argv.host;
        this.companyId = argv.companyId && argv.companyId.toString();
        this.port = argv.port;
        this.dev = argv.dev;
        this.name = this.manifest.unique_name;
        
        this.proxyHost = argv.proxyHost;
        this.proxyPort = argv.proxyPort;
        this.proxyUsername = argv.proxyUsername;
        this.proxyPassword = argv.proxyPassword;

        this.appId = '302e48d75f4b55016aaf2c81f5ddf80f039e3f863277';
        this.configSchema = fs.readJsonSync(path.join(process.cwd(), 'config.json'), { throws: false });
    }

    _validateAppStructure(){
        if (!fs.existsSync(path.resolve(this.rootPath, 'manifest.json'))) {
            logger.fatal('Please define manifest.json file within the app package!');
            process.exit(0);
        }
    }

    _validateManifest(){
        this._validate('manifest.schema.json', null, 'manifest.json')
    }

    _validateCustomObjects() {
        this._validate('object/manifest.schema.json', 'objects', 'manifest.json');
        this._validate('object/fields.schema.json', 'objects', 'fields.json');
        this._validate('object/relations.schema.json', 'objects', 'relations.json');
    }

    _validateScripts() {
        this._validate('script/manifest.schema.json', 'script_packs', 'manifest.json');
    }

    _validate(schemaFile, type, file) {
        const schema = fs.readJsonSync(path.join(__dirname, 'node_modules', '@bookingbug', 'app-manifest', schemaFile));
        if (!type) {
            this._validateFile('', file, schema);
        } else if (this.manifest[type]) {
            this.manifest[type].forEach((folder) => {
                this._validateFile(folder, file, schema);
            });
        }
    }

    _validateFile(folder, file, schema) {
        const filePath = path.join(process.cwd(), folder, file);
        if (fs.existsSync(filePath)) {
            const fields = fs.readJsonSync(filePath);
            const valid = ajv.validate(schema, fields);
            if (!valid) {
                logger.fatal(`${filePath} validation error`);
                logger.fatal(ajv.errorsText());
                process.exit(0);
            }
        }
    }

    isDev(){
        this.dev === true;
    }

    _mapSchemaToQuestions(schema) {
        return Object.entries(schema.properties).reduce((list, pair) => {
            const [name, item] = pair;
            list.push({
                type: 'input',
                name: name,
                message: item.description
            });
            return list
        }, []);
    }

    promptConfig() {
        const config = fs.readJsonSync(path.join(process.cwd(), '.bbugrc'), {throws: false});
        if (config) this.appConfig = config.appConfig;
        if (this.appConfig) {
            return Promise.resolve();
        } else {
            return new Promise((resolve, reject) => {
                if (this.configSchema) {
                    if (!this.configSchema.properties) {
                        logger.warn('config.json has no properties');
                        resolve();
                    } else {
                        console.log("\nApp config\n");
                        const questions = this._mapSchemaToQuestions(this.configSchema);
                        inquirer.prompt(questions).then(answers => {
                            this.appConfig = answers;
                            resolve()
                        }, reject);
                    }
                } else {
                    resolve();
                }
            })
        }
    }

    promptAuth() {
        return new Promise((resolve, reject) => {
            console.log("\nBookingBug login\n");
            let questions = [{
                type: 'input',
                name: 'email',
                message: 'Email address used to log into BookingBug'
            }, {
                type: 'input',
                name: 'password',
                message: 'Password used to log into BookingBug'
            }, {
                type: 'input',
                name: 'host',
                message: 'Destination host server for app install'
            }];
            questions = questions.filter((question) => {
                return !this[question.name];
            });
            inquirer.prompt(questions).then(answers => {
                questions.forEach((question) => {
                    this[question.name] = answers[question.name];
                });
                resolve();
            }, reject);
        });

    }

    validate() {
        return new Promise((resolve, reject) => {
            if (this.email && this.password && this.host) {
                if (this.configSchema) {
                    if (ajv.validateSchema(this.configSchema)) {
                        resolve();
                    } else {
                        reject('config.json is not valid json schema');
                    }
                } else {
                    resolve();
                }
            } else {
                this.promptAuth().then(resolve, reject);
            }
        });
    }

    writeToFile() {
        return fs.outputJson(this.bbugrcPath, {
            email: this.email,
            password: this.password,
            companyId: this.company_id,
            host: this.host,
            port: this.port,
            appConfig: this.appConfig
        }, {spaces: 2});
    }
}

module.exports = Configuration;
