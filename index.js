const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

/**
 * Library for inserting new properties (i.e. IDs) into JSON-like structures
 *
 * @example
 * Run using "node ./index --folder=foldername/subfolder --filetype=.json --prop=name --depth=1"
 *
 * TODO read only one file by filename
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
    this.prop = args.prop || 'id';
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
    console.log('Running property-4-json...');

    // PWD = working directory when the process was started
    const workingPath = path.resolve(process.env.PWD, this.folder);
    this.readDirectory(this.folder, this.filetype).then(files => {
      // console.log('promised files =>', files);

      if (!files.length) {
        console.log(`No files inside the folder "${workingPath}" matched the file type "${this.filetype}"`);
        console.log('No files modified');
        return;
      }

      const fullFilePath = files.map(file => {
        return path.resolve(workingPath, file);
      });

      // console.log('fullFilePath =>', fullFilePath);

      fullFilePath.forEach((fileName) => {
        let file = fs.readFileSync(fileName, 'utf8');
        console.log('\n*** Process file', fileName, '\n');

        const output = this.splitStingAndIterate(file, this.depth);

        console.log('\n*** Writing transformed file to', fileName, '\n', output, '\n');

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
    // const existingPropRe = new RegExp(`${this.quotation}${this.prop}${this.quotation}:`, 'm');
    // @see https://regexr.com/4el15
    const existingPropRe = new RegExp(`(${this.quotation}${this.prop}${this.quotation}:)\s*([^},]+)*?(,|\s|})`);

    matches.forEach((match, i) => {
      const matchedObject = match[0];
      // console.log('=> match', i, '- depth', depth, '-', matchedObject);

      // The matched object is an empty leaf object
      if (/^{\n*\s*}$/.test(matchedObject)) {
        file = file.replace(
          matchedObject,
          matchedObject.replace(/^{(\s*)}/m, `{$1${this.quotation}${this.prop}${this.quotation}: ${i}$1}`)
        );
      } else {
        // The matched object includes other properties
        switch (depth) {
          case 1:
            if (existingPropRe.test(matchedObject)) {
              // The property is already inside this object, update it
              // console.log('UPDATE PROPERTY', existingPropRe.exec(matchedObject));
              file = file.replace(
                matchedObject,
                matchedObject.replace(
                  existingPropRe,
                  `$1 ${i}$3`
                )
              );
            } else {
              // The property is not yet in this object, create it
              // @see https://regexr.com/4dt7e
              file = file.replace(
                matchedObject,
                matchedObject.replace(
                  /^(\s*){(\s*)/m,
                  `{$2${this.quotation}${this.prop}${this.quotation}: ${i},$2`
                )
              );
            }
            // console.log('=> REPLACED string', file);
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
            console.log('reading', file, '...');
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
   * @param {RegExp} re - regular expression
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

// Create the instance and set the options
const prop4json = new Poperty4Json(argv);
prop4json.parseFiles();
