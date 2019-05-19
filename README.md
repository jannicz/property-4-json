# Property 4 JSON

What this library can do:
* add (successive) IDs for JSON like structures afterwards
* process large folders with many files using file pattern

Why this library can do more than a regular string replace:
* it also works with other filetypes, i.e. *.js, *.ts
* it does not reformat your file as it is RegEx based
* it preserves whitespaces and respects the indentation
* it does not require valid JSON structures

# Setup

Add the following line to your npm scripts:
```
"scripts": {
    "addIds": "node index.js --folder=testfiles --filetype=.json"
}
```

# Output

The following JSON example file

```
[
  {
    "foo": { },
    "bar": true,
    "baz": {
      "tra" : ["far"]
    }
  },
  {
    "bar" : {
      "baz" : false
    }
  }
]
```

will become

```
[
  {
    "id": 0,
    "foo": { },
    "bar": true,
    "baz": {
      "tra" : ["far"]
    }
  },
  {
    "id": 1,
    "bar" : {
      "baz" : false
    }
  }
]
```