const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

/**
 * Inserts new properties (i.e. IDs) to JSON like structures
 * Run using "node ./index --folder=foldername/subfolder --filetype=*.json --depth=1"
 */
class Poperty4Json {

  constructor(args) {
    if (!args.folder) {
      throw new Error('Please provide a foldername relative to your project root directory');
    }

    this.folder = args.folder;
    this.filetype = args.filetype | '*.json';
    this.depth = args.depth | 1;

    // @see https://regexr.com/4dt6m
    // BASE: \{[^}{]*\}
    // PREFIX: \{(?:[^}{]+|
    // POSTFIX: )*\}
    this.regex = /\{(?:[^}{]+|\{(?:[^}{]+|\{[^}{]*\})*\})*\}/g;
  }

  parse() {
    console.log('Running Poperty4Json... parsed options', this);

    // Define path and filename, read the file, PWD = working directory when the process was started
    const workingPath = path.resolve(process.env.PWD, this.folder);
    const indexFilePath = [path.resolve(workingPath, 'test_01.json')];

    // TODO if is folder, use readdir and add all files to [], else just use the one file

    indexFilePath.forEach((fileName) => {
      let file = fs.readFileSync(fileName, 'utf8');
      console.log('Process folder', this.folder, 'and edit file', file);

      const matches = this.getAllMatchesByRe(file, this.regex);

      matches.forEach((match, i) => {
        const matchedObject = match[0];
        console.log('match', i, matchedObject);

        // The matched object is an empty leaf
        if (/^{\n*\s*}$/.test(matchedObject)) {
          console.log('THERE IS AN EMPTY OBJECT');
          file = file.replace(matchedObject, matchedObject.replace(/^{(\s*)}/m, `{$1"id": ${i}$1}`));
        } else {
          // @see https://regexr.com/4dt7e
          file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\n*\s*)/m, `{$2"id": ${i},$2`));

          switch (this.depth) {
            case 1:
              break;
            case 2:
              break;
            default:
              break;
          }
        }
      });

      console.log('transformed file =>', file);

    });
  }

  writeFile() {
    // indexFile = indexFile.replace('</head>', sourceLine)

    // Save modified string to file
    // fs.writeFile(indexFilePath, indexFile, 'utf8', err => {
    // 	if (err) {
    // 		console.log('Error writing file', err);
    // 	}
    // });
  }

  getAllMatchesByRe(str, re) {
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
}

const argv = minimist(process.argv.slice(2));
console.log('MIMIMALIST argv =>', argv);

// Create the instance and set the options
const prop4json = new Poperty4Json(argv);
prop4json.parse();
