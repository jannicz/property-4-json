const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

/**
 * Library for inserting new properties (i.e. IDs) into JSON-like structures
 *
 * @example
 * Run using "node ./index [options] with following option possibilities:
 * --folder=folder/subfolder
 * --filetype=.json
 * --prop=name
 * --quotation=none
 * --stopwords=import,export
 * --startvalue=100
 * --delimiter='='
 * --endline=semicolon
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

    // Configuration variables
    this.folder = args.folder;
    this.prop = args.prop || 'id';
    this.filetype = args.filetype || '.json';
    this.stopwords = args.stopwords || null;
    this.delimiter = args.delimiter ? args.delimiter.replace(/'/g, '') : ':';
    this.endline = args.endline === 'semicolon' ? ';' : ',';
    this.startvalue = args.startvalue || 0;
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

    // Private variables
    this.count = this.startvalue;
    this.linesChanged = 0;

    // @see https://regexr.com/4em88
    // BASE: \{[^}{]*\}
    // PREFIX: \{(?:[^}{]+|
    // POSTFIX: )*\}
    this.regex = new RegExp(
      (this.stopwords ? `^\\s*(?!${this.stopwords.split(',').join('|')}).*?` : '') +
      `\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{(?:[^}{]+|\{[^}{]*\})*\})*\})*\})*\})*\}`,
      'gm'
    );

    // console.log('REGEX =>', this.regex);
  }

  /**
   * Define path and filename, read the folder and filter for files, start splitting algorithm
   */
  parseFiles() {
    // PWD = working directory when the process was started
    const workingPath = path.resolve(process.env.PWD, this.folder);

    console.log('Running property-4-json...');

    this.readDirectory(this.folder, this.filetype).then(files => {

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
        // console.log('\nProcess file', fileName, '\n');

        const output = this.splitStingAndIterate(file, this.depth);

        if (file != output) {
          this.writeFile(fileName, output);
        } else {
          console.log('No matches in', fileName, 'file remains unchanged');
        }
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
    const existingPropRe = new RegExp(
      // @see https://regexr.com/4em88
      `(${this.quotation}${this.prop}${this.quotation}${this.delimiter})\\s*([^},]+)*?(,|\\s|\})`
    );
    const matches = this.getAllMatchesByRe(file, this.regex);

    this.linesChanged = 0;

    // console.log('EXISTING REGEX =>', existingPropRe);

    matches.forEach((match) => {
      const matchedObject = match[0];
      // console.log('=> match', i, '- depth', depth, '-', matchedObject);

      if (/^{\n*\s*}$/.test(matchedObject)) {
        // The matched object is an empty leaf object
        file = file.replace(
          matchedObject,
          matchedObject.replace(/^{(\s*)}/m, `{$1${this.quotation}${this.prop}${this.quotation}${this.delimiter} ${this.count}$1}`)
        );
        this.linesChanged++;
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
                  `$1 ${this.count}$3`
                )
              );
              this.linesChanged++;
            } else {
              // The property is not yet in this object, create it
              file = file.replace(
                matchedObject,
                matchedObject.replace(
                  // @see https://regexr.com/4emol
                  /^(.*?\s*){(\s*)/m,
                  `$1{$2${this.quotation}${this.prop}${this.quotation}${this.delimiter} ${this.count}${this.endline}$2`
                )
              );
              this.linesChanged++;
            }
            // console.log('=> REPLACED string', file);
            break;
          case 2:
            // file = file.replace(matchedObject, matchedObject.replace(/^(?:{)[^{]*(\s*)({)(\s*)((?:.|\s)*?)(?:})$/, `{"id": ${this.count},`));

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
      this.count++;
    });

    return file;
  }

  /**
   * Reads the directory and returns array of files that match filetype (i.e. .json)
   * @param {string} dirname - full directory name relative to the working directory of the script
   * @param {string} filetype - substring that the file should be tested for, i.e. '.json'
   */
  readDirectory(dirname, filetype) {
    console.log('Reading folder "' + dirname + '" and filtering for type "' + filetype + '"');

    return new Promise((resolve, reject) => {
      let fileList = [];

      fs.readdir(dirname, (error, files) => {
        if (error) {
          reject(error);
        } else {
          files.forEach((file) => {
            if (file.includes(filetype)) {
              console.log('Found', file);
              fileList.push(file);
            }
          });

          resolve(fileList);
        }
      });
    });
  }

  /**
   * Overwrites the file into the same folder
   * @param {string} fullFileName - folder and filename
   * @param {string} outputString - the output that should be written
   */
  writeFile(fullFileName, outputString) {
    console.log('Write', this.linesChanged, 'changes to file', fullFileName);

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
