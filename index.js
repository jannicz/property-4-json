const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

/**
 * Inserts new properties (i.e. IDs) to JSON like structures
 * Run using "node ./index --folder=foldername/subfolder --filetype=.json --depth=1"
 * 
 * @author Jan Suwart
 * @licence MIT
 */
class Poperty4Json {

  constructor(args) {
    if (!args.folder) {
      throw new Error('Please provide a foldername relative to your project root directory');
    }

    if (args.depth > 1) {
      console.warn('Depth of >1 is experimental and not yet recommended - use with caution');
    }

    this.folder = args.folder;
    this.filetype = args.filetype || '.json';
    this.depth = args.depth || 1;

    // @see https://regexr.com/4dt6m
    // BASE: \{[^}{]*\}
    // PREFIX: \{(?:[^}{]+|
    // POSTFIX: )*\}
    this.regex = /\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{[^}{]*\})*\})*\})*\})*\})*\}/g;
  }

  /**
   * Define path and filename, read the folder and filter for files, start splitting algorithm
   */
  parseFiles() {
    console.log('Running Poperty4Json... parsed options', this);

    // PWD = working directory when the process was started
    const workingPath = path.resolve(process.env.PWD, this.folder);
    this.readDirectory(this.folder, this.filetype).then(files => {
      console.log('promised files =>', files);

      const indexFilePath = files.map(file => {
        return path.resolve(workingPath, file);
      });

      // const indexFilePath = [path.resolve(workingPath, 'test_01.json')];
      console.log('indexFilePath =>', indexFilePath);

      indexFilePath.forEach((fileName) => {
        let file = fs.readFileSync(fileName, 'utf8');
        console.log('\nProcess fileName', fileName, 'and edit file length', file.length, '\n');

        const output = this.splitStingAndIterate(file, this.depth);

        console.log('\n***** Transformed File ***** \n', output, '\n\n\n');
      });
    });
  }

  splitStingAndIterate(file, depth) {
    const matches = this.getAllMatchesByRe(file, this.regex);

    matches.forEach((match, i) => {
      const matchedObject = match[0];
      console.log('=> match', i, '- depth', depth, '-', matchedObject);

      // The matched object is an empty leaf
      if (/^{\n*\s*}$/.test(matchedObject)) {
        console.log('THERE IS AN EMPTY OBJECT');
        file = file.replace(matchedObject, matchedObject.replace(/^{(\s*)}/m, `{$1"id": ${i}$1}`));
      } else {

        switch (depth) {
          case 1:
            // @see https://regexr.com/4dt7e
            // file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\n*\s*)/m, `{$2"id": ${i},$2`));
            file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\s*)/m, `{$2"id": ${i},$2`));
            console.log('=> REPLACED string', file);
            break;
          case 2:
            // file = file.replace(matchedObject, matchedObject.replace(/^(?:{)[^{]*(\s*)({)(\s*)((?:.|\s)*?)(?:})$/, `{"id": ${i},`));

            // Remove the outer object brackets
            const removedOuterBrackets = matchedObject.replace(/^{([\S\s]*)}$/, '$1');
            console.log('removedOuterBrackets =>', removedOuterBrackets);
            // console.log('innerMatches =>', innerMatches[0]);

            // const innerMatches = this.getAllMatchesByRe(matchedObject, /{/g);
            // console.log('=> innerMatches', innerMatches);


            // RECURSION
            file = this.splitStingAndIterate(removedOuterBrackets, 1);
            break;
          default:
            break;
        }
      }
    });

    return file;
  }

  /**
   * Reads the directory and returns array of files that match filetype (i.e. .json)
   */
  readDirectory(dirname, filetype) {
    console.log('Reading folder', dirname, 'and filtering for type', filetype, '...');

    return new Promise((resolve, reject) => {
      let fileList = [];

      fs.readdir(dirname, (error, files) => {
        if (error) {
          reject('Unable to read directory', dirname, error);
        }

        files.forEach((file) => {
          if (file.includes(filetype)) {
            console.log('pushing', file);
            fileList.push(file);
          }
        });

        resolve(fileList);
      });
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

  getAllMatchesByRe(string, re) {
    let matches = [];
    let match;

    if (re.global) {
      re.lastIndex = 0;
    } else {
      re = new RegExp(
        re.source, 'g' + (re.multiline ? 'm' : '')
      );
    }

    while (match = re.exec(string)) {
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
prop4json.parseFiles();
