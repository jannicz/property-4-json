# Property 4 JSON

Build script to automatically enrich static files containing JavaScript objects
with auto-incremented properties without the need of a database.

### What this library can do:
* add (autoincrement) properties to each object in a JSON-like structure
* quickly process large folders containing __many static files__
* match specific file types by __file pattern__
* unify unordered or scattered property values to a __sequential order__ across objects of the same level

### Why this library is useful:
* it works with any file type, i.e. `.js`, `.ts` or `.json`
* it does not reformat your file and it __preserves whitespaces__ and respects your indentation
* it does __not require valid__ JSON structures as it is RegExp based
* it is idempotent (multiple executions will not have any other effect as the initial execution)

## Setup

Install the lib via `npm i property-4-json -D` as dev dependency and add the following line to your npm scripts:
```
"scripts": {
    "autoincrement-ids": "node node_modules/property-4-json --folder=dir/subdir --filetype=.json"
}
```

Now you can run the the script using
```
npm run autoincrement-ids
```

## Options

Pass each option using following syntax `--option=value`

* `folder` directory of the source files relative to your __package.json__, i.e. `--folder=assets/files`
* `filetype` *optional*, change the file type, i.e. `.js`, `.ts`, `.json` etc. of which __JSON__ is default
* `prop` *optional*, the property name that should be auto incremented, __id__ is default
* `quotation` *optional*, quotation type in which the parameter should be wrapped, possible values are `none`, `single` and `double` (default)
* `stopwords` *optional*, list of comma separated stopwords, i.e. `--stopwords=import,export` - will not match an object if a stopword is ahead the opening bracket
* `startvalue` *optional*, start value of incremental variable other than 0 - the value will keep incrementing across multiple matched files
* `delimiter` *optional*, changes the key-value delimiter from colon to custom character, i.e. setting `--delimiter='='` will make use of `=` symbol

## Examples

Running the algorithm on the following JSON file containing an array of objects

```javascript
[
  {
    "foo": { },
    "bar": []
  },
  {
    "bar" : {
      "baz" : false
    }
  }
]
```

will enrich each object with an incremental __id__ after the opening bracket

```javascript
[
  {
    "id": 0, // <- here
    "foo": { },
    "bar": []
  },
  {
    "id": 1, // <- and here
    "bar" : {
      "baz" : false
    }
  }
]
```

You are not limited to JSON files, the algorithm can be applied to any structure wrapped in curly
brackets. Using the algorithm with with following parameters on a typescript file

```
node node_modules/property-4-json --folder=dir/subdir --filetype=.ts --prop=count --quotation=none --delimiter=' =' --stopwords=interface,export --endline=semicolon
```

```javascript
class Car {
  engine: Engine;
  cylinders: number;
}
export { Car };
```

will result in

```javascript
class Car {
  count = 0; // <- here
  engine: Engine;
  cylinders: number;
}
export { Car };
```

regardless how many __class__ objects are contained across all files, each will be incremented with its
own unique `count` variable. Curly braced objects after statements like `export`, `interface` etc. will be omitted.

## Updating existing properties

If your object already contains the property that you want to increment, the script will recognize the
property and update it with a new value. Multiple executions of the script on the same file will not
have any negative effect.

```javascript
{"id": 999, "car": true}, {"vehicle": false, "id": 155}
```

would be updated by __id__ while keeping the formatting as

```javascript
{"id": 0, "car": true}, {"vehicle": false, "id": 1}
```

no matter how often the script is applied on that file.

## Limitations

* it is not possible to add new properties at lower nesting levels than 1 (the RegExp will always match the first opening bracket of the object)
* this script is not meant to replace a database autoincrement feature, it was developed to clean up static data before a production build

## Upcoming features

* deeper nesting levels at which the parameter should be applied
* pass one filename instead of a file pattern or folder name

## Contributing

Please report bugs in the [issues section](https://github.com/jannicz/property-4-json/issues)

## Author & License
- Jan Suwart | MIT License
