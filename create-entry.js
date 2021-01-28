const fs = require('fs');
const path = require('path');

async function createPanelsEntry(configuration) {
    let content = configuration.manifest.panels.reduce((lines, folder) => {
         lines.push(`import './${folder}/**/!(*.spec).js'`);
        return lines;
    }, []).join("\n");

    if (content) {
        await new Promise((resolve, reject) => {
            fs.writeFile('entry.js', content, resolve);
        });
    }
}

async function createLauncherEntry(configuration) {
    const launchers = configuration.manifest.launchers;

    const rootPath = process.cwd();

    let content = `
let exp = {apps:{}};
`
    for (const launcher of launchers){
        let manifest = require(path.resolve(rootPath + `/${launcher}`, 'manifest.json'));
        content = content + `
import ${manifest.unique_name} from './${launcher}/${manifest.entry}';
exp.apps['${manifest.unique_name}'] = {
    Component: ${manifest.unique_name},
    AppDefinition: ${JSON.stringify(manifest)}
   };
    `;
    }
    content += `
export default exp; 
    `
    await new Promise((resolve, reject) => {
        fs.writeFile('launcher.js', content, resolve);
    });
}

async function createJextEntry(configuration) {
    const content = configuration.manifest.jext.reduce((lines, folder) => {
        lines.push(`import './${folder}/**/!(*.spec).js'`);
        return lines;
    }, []).join("\n");
    if (content) {
        await new Promise((resolve, reject) => {
            fs.writeFile('entry-jext.js', content, resolve);
        });
    }
}

async function createEntry(configuration) {
    if (configuration.manifest.panels) await createPanelsEntry(configuration);
    if (configuration.manifest.launchers) await createLauncherEntry(configuration);
    if (configuration.manifest.jext) await createJextEntry(configuration);
}

module.exports = createEntry;
