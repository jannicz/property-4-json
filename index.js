const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

/**
 * Library for inserting new properties (i.e. IDs) into JSON-like structures
 *
 * @example
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

    switch (args.quotation)  {
      case ('none'):
        this.quotation = '';
        break;
      case ('single'):
        this.quotation = "'";
        break;
      default:
        this.quotation = '"';
        break;
    }

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

      const fullFilePath = files.map(file => {
        return path.resolve(workingPath, file);
      });

      // const fullFilePath = [path.resolve(workingPath, 'test_01.json')];
      console.log('fullFilePath =>', fullFilePath);

      fullFilePath.forEach((fileName) => {
        let file = fs.readFileSync(fileName, 'utf8');
        console.log('\n*** Process file', fileName, '\n');

        const output = this.splitStingAndIterate(file, this.depth);

        console.log('\n*** Writing transformed file to', fileName, '\n\n', output, '\n\n');

        this.writeFile(fileName, output);
      });
    }).catch((error) => {
      console.log('Aborted with error', error);
    });
  }

  /**
   * Splits a file into several matches of JSON-like objects
   * @param {string} file - full path and name of current file
   * @param {number} depth - at which nesting level should the property be added
   * @return {string} the modified file as string
   */
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

        // TODO recognize existing property name and overwrite it
        switch (depth) {
          case 1:
            // @see https://regexr.com/4dt7e
            // file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\s*)/m, `{$2"id": ${i},$2`));
            file = file.replace(matchedObject, matchedObject.replace(/^(\s*){(\s*)/m, `{$2${this.quotation}id${this.quotation}: ${i},$2`));
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
   * @param {string} dirname - full directory name relative to the working directory of the script
   * @param {string} filetype - substring that the file should be tested for, i.e. '.json'
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

  /**
   * Overwrites the file into the same folder
   * @param {string} fullFileName - folder and filename
   * @param {string} outputString - the output that should be written
   */
  writeFile(fullFileName, outputString) {
    fs.writeFile(fullFileName, outputString, 'utf8', err => {
    	if (err) {
    		console.log('Error writing file', err);
    	}
    });
  }

  /**
   * @param {string} string - input string
   * @param {RegEx} re - regular expression
   * @return {Array} array of regex matches
   */
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
