# Property 4 JSON

Node script to automatically enrich static files containing JavaScript objects
with auto-incremented properties without the need of a server.

### What this library can do:
* add a (autoincrement) property to each object in a JSON-like structure
* quickly process large folders containing many static files
* match specific file types by file pattern
* unify unordered or scattered property values to a sequential order across objects of the same level

### Why this library is useful:
* it works with any file type, i.e. `*.js`, `*.ts`
* it does not reformat your file and it preserves whitespaces and respects your indentation
* it does not require valid JSON structures as it is RegExp based

## Setup

Install the lib via `npm i property-4-json -D` as dev dependency and add the following line to your npm scripts:
```
"scripts": {
    "add-properties": "node node_modules/property-4-json --folder=testfiles --filetype=.json"
}
```

Now you can run the the script using
```
npm run add-properties
```

## Options

Pass each option using following syntax `--option=value`

* `--folder` directory (path) of the source files relative to your package.json, i.e. `--folder=assets/files`
* `--filetype` *optional*, change the file type, i.e. `.js`, `.ts`, `.json` etc. of which JSON is the default
* `--prop` *optional*, the property name that should be auto incremented, default is `id`
* `--quotation` *optional*, quotation type in which the parameter should be wrapped, possible values are `none`, `single` and `double` (default)

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

will enrich each object with an incremental ID

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
brackets. Using the algorithm with a `--quotation=none` parameter on the following typescript file

```javascript
interface Car {
    engine: string,
    cylinders: number,
}
```

will result in

```javascript
interface Car {
    id: 0,
    engine: string,
    cylinders: number,
}
```

## Updating existing properties

If your object already contains the property that you want to increment, the script will recognize the
property and update it with a new value. Multiple executions of the script on the file will not
have any negative effect.

```javascript
{"id": 999, "car": true}, {"vehicle": false, "id": 155}
```

would update to the property id and keep the formatting as

```javascript
{"id": 0, "car": true}, {"vehicle": false, "id": 1}
```

## Limitations

* currently it is not possible to add new properties at lower nesting levels than 1
* it should be applied to clean up static data before a build, it is not meant to replace a database

## Upcoming features

* start at higher property numbers, i.e. 100, 101 etc.
* deeper nesting levels at which the parameter should be applied
* pass one filename instead of a file pattern

## Contributing

Please report bugs in the [issues section](https://github.com/jannicz/property-4-json/issues)

## Author & License
- Jan Suwart | MIT License
