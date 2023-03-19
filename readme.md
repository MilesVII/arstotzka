# Arstotzka
JS data validation tool featuring laconic schema format and a sexy name.

## Usage

See detailed usage example in **[usage.js](https://github.com/MilesVII/arstotzka/blob/master/usage.js)**

```
const schema = {
	id: "number",
	username: ["string", x => x.length < 10],
	post: "string",
	comments: Arstotzka.ARRAY_OF({
		author: ["string", Arstotzka.OPTIONAL],
		text: "string"
	})
}

const goodData = {
	id: 1337,
	username: "mr.hands",
	post: "Henlo there",
	comments: [
		{author: "Johnny", text: "henlo"},
		{text: "hey hey"},
		{author: "miles", text: "birb"},
	]
}

console.log(Arstotzka.validate(goodData, schema, {allowExtraProperties: false}));
```

### Import:
`import * as Arstotzka from "Arstotzka";`

### Schema format:
- You build a schema, an object describing requirements for each property of object you wish to validate, then pass target object, that schema and options to `validate()` function and receive an array of detailed errors in return.
- `const arrayOfErrors = Arstotzka.validate(objectToCheck, schema, options);`
- Aforemetioned requirements are called **constraints**. 
- Plain string constraints check porperty's type with [typeof operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof), with exception of "array" constraint -- validator will [treat this type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray) as special case.
- Examples: `name: "string"`, `id: "number"`, `list: "array"`
- You can also specify custom constraint by providing a validation function. Validator will pass property value to it and will add an error if returned value is falsy. Exception thrown inside validation function will be catched and added as errors into output
- Examples: `notaNaN: x => !isNaN(x)`, `nickname: x => x.length < 10`
- It is possible to validate nested objects by passing a schema object instead of constraint:
- `user: {name: "string", age: "number"}`
- If needed, you can still add constraints to the nested object itself, passing them to it's `_self` property. Name of the property can be changed in the options.
- `phrase: {_self: x => x.text.length == x.letterCount, text: "string", letterCount: "number"}`
- You can combine different constraints by passing an array of them.
- Just like that: `nickname: ["string",  x => x.length < 10]`, `count: ["number",  x => x >= 0,  x => x % 1 == 0]`
- There are special constraints that serve as flags. (The only) one of them is **Arstotzka.OPTIONAL**. It allows to validate a property but prevents validator from adding an error if that property is not present in target object.
- `commentary: ["string", Arstotzka.OPTIONAL]`
- Finally, you can apply constraints to array's elements with **Arstotzka.ARRAY_OF()**. All the constraints passed to that function will be applied for each element. 
- `numberArray: Arstotzka.ARRAY_OF("number")`, `posts: Arstotzka.ARRAY_OF({id: "number", text: "string"})`, `positives: Arstotzka.ARRAY_OF(["number", x = x > 0])`, or even `matrix: Arstotzka.ARRAY_OF(Arstotzka.ARRAY_OF("number"))`

### Available options:
- **allErrors** (default is `true`) : If false, will return errors as soon as encountered, interrupting validation
- **allowExtraProperties** (default is `true`) : If false, adds specific error to a list for every property of target object not present in schema
- **selfAlias** (default is `"_self"`): Schema property name for referring nested object itself

### Error format
```
{ // Example error item:
	propertyName: 'age', // Name of a property that failed validation
	id: 'typeMismatch', // String describing type of an error. Can be used to localize error message
	message: 'Provided type is not allowed by schema', // Error message that coressponds to error id
	expected: 'number', // Arbitrary-purpose fields
	got: null
}
```
All error ids and messages can be found at `Arstotzka.ERRORS`

## License
Shared under WTFPL license.
