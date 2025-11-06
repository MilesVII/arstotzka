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

console.log(Arstotzka.validate(goodData, schema, {allowExtraProperties: false})); // Prints an array of errors
```

### Import:
Arstotzka is an ES6 module, so:
```
import * as Arstotzka from "arstotzka";
```
or, if you are okay with polluting namespace:
```
import { validate, OPTIONAL, ARRAY_OF, ANY_OF, DYNAMIC } from "arstotzka";
```


### Schema format:
Schema is a value that can be either of
- **string**: such schema will make validator check coresponding value's type with [typeof operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof), with exception of "array" constraint -- validator will [treat this type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray) as special case;
`"string"`, `"number"`, `"array"`

- **function**: such schema will make validator call it, pass corresponding value to it, and log an error if returned value is falsy;
`x => !isNaN(x)`, `x => x.length < 10`

- **object**: object schema requires corresponding value to also be an object, and will recursively match it's properties against provided value;
`{name: "string", age: x => x.length > 21}`

- **array**, which elements are any of above. That will require a value it matched against to fullfill *every* requirement;
`["string", x => x != x.trim()]`, `["number", x => x >= 0, x => x % 1 === 0]`

- **Arstotzka.ARRAY_OF()**: the function accepts any of above and returns a special constraint appliable to an array of values;
`Arstotzka.ARRAY_OF("number")`, `Arstotzka.ARRAY_OF({id: "number", text: "string"})`, `Arstotzka.ARRAY_OF(["number", x => x > 0])`, `Arstotzka.ARRAY_OF(Arstotzka.ARRAY_OF("number"))`

- **Arstotzka.ANY_OF()**: the function accepts array or vararg of schemas and returns a special constraint, which will produce a specific error only if every provided schema is violated;
`Arstotzka.ANY_OF(["number", ["string", x => !isNaN(parseInt(x))]])`

- **Arstotzka.DYNAMIC()**: the function accepts a callback that should return a valid schema, allowing to define schema at runtime;
`Arstotzka.DYNAMIC(x => dynSchema[x.type])`

- **Arstotzka.OPTIONAL**: unlike others, this schema doesn't imply any requirements, but prevents validator from logging an error in case it's property is not present in target object;

Applying a schema to a property that is an object can be done by combining **object** schema with anything via **array** schema;


### Available options:
- **allErrors** (default is `true`) : If false, will return errors as soon as encountered, interrupting validation
- **allowExtraProperties** (default is `true`) : If false, adds specific error to a list for every property of target object not present in schema


### Error format
```
{ // Example error item:
	propertyName: 'age', // Name of a property that failed the validation
	id: 'typeMismatch', // String describing type of an error. Can be used to localize error message
	message: 'Provided type is not allowed by schema', // Error message that coressponds to error id
	expected: 'number', // Arbitrary-purpose fields
	got: null
}
```

All error ids and messages can be found at `Arstotzka.ERRORS`


## License
Shared under WTFPL license.
