const fs = require('fs');
const glob = require('glob');
const simpleGit = require('simple-git')('../sampledata');

const arguments = process.argv;
const justChangedFiles = arguments.includes('--just-changed-files');
const allFiles = arguments.includes('--all-files');

if(justChangedFiles && allFiles) {
    console.error('Just one mode is allowed');
    return process.exit(-1);
}

const stage = 'production';

async function run() {
    let filePaths = [];
    if(justChangedFiles) {
        filePaths = await _listChangedViews();
    }

    if(allFiles) {
        filePaths = await _listAllViews();
    }

    const viewDefinitions = filePaths.map(filePath => {
        console.log(filePath);
        const file = fs.readFileSync(`../sampledata/${filePath}`);

        let viewDefinition = JSON.parse(file);
        viewDefinition = _convertViewDefinition(viewDefinition);
        return viewDefinition;
    });

    const requestBody = JSON.stringify({
        views: viewDefinitions
    }, null, 2);

    console.info('[VMC-Service]', `Converted ${viewDefinitions.length} view-definitions.`);
    fs.writeFileSync('request.json', requestBody, (error) => {
        if(error) {
            throw error;
        }
    });
}

/**
 * This function lists all changed views from the production folder.
 * @returns {Promise<any>}
 * @private
 */
function _listChangedViews() {
    return new Promise((resolve) => {
        simpleGit.diffSummary(function (error, data) {
            const { files: changedFiles } = data;
            const _changedFiles = [];

            const regex = new RegExp(`^${stage}.*\\/views\\/view.*\\.json$`);
            changedFiles.forEach((changedFile) => {
                const filePath = changedFile.file;

                if (filePath.match(regex)) {
                    _changedFiles.push(changedFile.file);
                }
            });

            resolve(_changedFiles);
        });
    });
}

/**
 * This function lists all views from the production folder
 */
function _listAllViews() {
    return new Promise((resolve) => {
        glob(`../sampledata/${stage}/FLOWFACT/**/views/*.json`, {}, (error, files) => {
            const allFiles = files.map(filePath => filePath.replace('../sampledata/', ''));
            resolve(allFiles);
        });
    });
}

function _convertViewDefinition(viewDefinition) {
    const schemaNameRegex = /\${schemaId-(.*)}/;
    const schemaId = viewDefinition.schemaId;
    const match = schemaNameRegex.exec(schemaId);
    const schemaName = match[1];

    delete viewDefinition.id;
    delete viewDefinition.schemaId;

    viewDefinition.schemaName = schemaName;

    switch(viewDefinition.name) {
        case 'EntityRelationView':
            viewDefinition.type = 'ENTITY_RELATION';
            break;
        case 'card': {
            viewDefinition.type = 'CARD';
            break;
        }
        case 'list': {
            viewDefinition.type = 'LIST';
            break;
        }
        case 'calendar': {
            viewDefinition.type = 'CALENDAR';
            break;
        }
        case 'map': {
            viewDefinition.type = 'MAP';
            break;
        }
        case schemaName: {
            viewDefinition.type = 'DEFAULT';
            break;
        }
    }

    return viewDefinition;
}

// noinspection JSIgnoredPromiseFromCall
run();
