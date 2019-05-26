const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

/**
 * Library for inserting new properties (i.e. IDs) into JSON-like structures
 *
 * @example
 * Run using "node ./index --folder=foldername/subfolder --filetype=.json --prop=name --stopwords=import,export"
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
    this.stopwords = args.stopwords || null;
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

    // @see https://regexr.com/4em88
    // BASE: \{[^}{]*\}
    // PREFIX: \{(?:[^}{]+|
    // POSTFIX: )*\}
    this.regex = new RegExp(
      (this.stopwords ? `^\\s*(?!${this.stopwords.split(',').join('|')}).*?` : '') +
      `\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{[^}{]*\})*\})*\})*\})*\})*\}`,
      'gm'
    );

    console.log('REGEX =>', this.regex);
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
        console.log('\nProcess file', fileName, '\n');

        const output = this.splitStingAndIterate(file, this.depth);

        console.log('Writing transformed file to', fileName, '\n', output);

        this.writeFile(fileName, output);
      });
    }).catch((error) => {
      console.log('Could not read directory because of error', error);
      console.log('No files modified');
    });
  }

  /**
   * Splits a file into several matches of JSON-like objects
   * @param {string} file - full path and name of current file
   * @param {number} depth - at which nesting level should the property be added
   * @return {string} the modified file as string
   */
  splitStingAndIterate(file, depth) {
    // @see https://regexr.com/4em88
    const existingPropRe = new RegExp(`(${this.quotation}${this.prop}${this.quotation}:)\\s*([^},]+)*?(,|\\s|\})`);
    const matches = this.getAllMatchesByRe(file, this.regex);

    // console.log('EXISTING REGEX =>', existingPropRe);

    matches.forEach((match, i) => {
      const matchedObject = match[0];
      console.log('=> match', i, '- depth', depth, '-', matchedObject);

      if (/^{\n*\s*}$/.test(matchedObject)) {
        // The matched object is an empty leaf object
        file = file.replace(
          matchedObject,
          matchedObject.replace(/^{(\s*)}/m, `{$1${this.quotation}${this.prop}${this.quotation}: ${i}$1}`)
        );
      } else {
        // The matched object includes properties
        switch (depth) {
          case 1:
            // The property is already inside this object, update it
            if (existingPropRe.test(matchedObject)) {
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
              // FIXME Having Car as part of the match contradicts the second regex ^
              // FIXME it will not catch the Car interface because it does not start empty
              file = file.replace(
                matchedObject,
                matchedObject.replace(
                  /^(\s*){(\s*)/m,
                  `$1{$2${this.quotation}${this.prop}${this.quotation}: ${i},$2`
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
          reject(error);
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
   * @param {RegExp} regexp - regular expression
   * @return {Array} array of regex matches
   */
  getAllMatchesByRe(string, regexp) {
    let matches = [];
    let match;

    if (regexp.global) {
      regexp.lastIndex = 0;
    } else {
      regexp = new RegExp(regexp.source, 'g' + (regexp.multiline ? 'm' : ''));
    }

    while (match = regexp.exec(string)) {
      matches.push(match);

      if (regexp.lastIndex === match.index) {
        regexp.lastIndex++;
      }
    }

    return matches;
  }
}

const argv = minimist(process.argv.slice(2));

// Create the instance and set the options
const prop4json = new Poperty4Json(argv);
prop4json.parseFiles();
