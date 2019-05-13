const fs = require('fs');
const path = require('path');
let folders = [];

// @see https://regexr.com/4dqim
const level7re = undefined;
const level6re = undefined;
const level2re = /\{([^{}]*|\{[^{}]*\})*\}/g;
const level1re = /\{[^{}]*\}/g;

/**
 * Inserts references to sources into index.html file.
 * Run using "node ./json-id-inserter --foldername/subfolder OR --foldername/file.json --depth=1"
 */
process.argv.forEach((val, name) => {
    // TODO use npm minimalist to slice options
    console.log('options =>', val, name);
    if (/^--/i.test(val)) {
        folders.push(val.replace('--', ''));
    }
});

console.log('Running json id inserter... parsed options', process.env.PWD);

// Define path and filename, read the file, PWD = working directory when the process was started
const workingPath = path.resolve(process.env.PWD, folders[0]);
const indexFilePath = [path.resolve(workingPath, 'test_01.json')];

// TODO if is folder, use readdir and add all files to [], else just use the one file

indexFilePath.forEach((fileName) => {
    let file = fs.readFileSync(fileName, 'utf8');
    console.log('Process folder', folders, 'and edit file', file);

    const matches = getAllMatchesByRe(file, level2re);

    matches.forEach((match, i) => {
        const matchedObject = match[0];
        console.log('match', i, matchedObject);
        // @see https://regexr.com/4dqls
        // file = file.replace(matchedObject, matchedObject.replace(/^(\s*{\n*)/m, `$1"id": ${i},\n`))
        // file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\n*\s*)/m, `$2"id": ${i},$2`))
        file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\n*\s*)/m, `{$2"id": ${i},$2`))
    });

    console.log('transformed file =>', file);

});

// indexFile = indexFile.replace('</head>', sourceLine)

// Save modified string to file
// fs.writeFile(indexFilePath, indexFile, 'utf8', err => {
// 	if (err) {
// 		console.log('Error writing file', err);
// 	}
// });

function getAllMatchesByRe(str, re) {
    let matches = [];
    let match;

    if (re.global) {
        re.lastIndex = 0;
    } else {
        re = new RegExp(
            re.source, 'g' + (re.multiline ? 'm' : '')
        );
    }

    while (match = re.exec(str)) {
        matches.push(match);
        if (re.lastIndex === match.index) {
            re.lastIndex++;
        }
    }

    return matches;
}
