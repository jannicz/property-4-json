# Property 4 JSON

### What this library can do:
* add (successive) IDs for JSON-like structures afterwards
* process large folders with many files using file pattern

### Why this library is useful:
* it also works with other filetypes, i.e. *.js, *.ts
* it does not reformat your file and it preserves whitespaces and respects your indentation
* it does not require valid JSON structures as it is RegEx based

# Setup

Add the following line to your npm scripts:
```
"scripts": {
    "addIds": "node index.js --folder=testfiles --filetype=.json"
}
```

# Options

Each option shall be passed using the syntax `--option=value`

* `--folder`: directory (path) of the source files relative to your package.json, i.e. `--folder=src/my-json-files`
* `--filetype`: the filetype with the syntax `.js`, `.ts`, `.json` etc.
* `--quotation`: quotation type in which the id parameter should be wrapped, possible values are `single`, `double`, `none`

# Examples

Running the algorithm on the following JSON file containing an array of objects

```
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

```
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

```
interface Car {
    engine: string,
    cylinders: number,
}
```

will result in

```
interface Car {
    id: 0,
    engine: string,
    cylinders: number,
}
```

# Limitations

* currently the maximal depth (nesting) of your JSON-like objects can only be 6
* currently it is not possible to add new properties at lower nesting levels than 1

# ToDo

* recognize existing IDs and overwrite it with new value
* name your id parameter, i.e. 'uuid' (custom property)
* start at higher property numbers, i.e. 100, 101 etc.
* deeper nesting levels at which the parameter should be applied