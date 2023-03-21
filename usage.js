import * as Arstotzka from "./index.js";

// This value will be validated against schema described below
const value = {
	title: "1337",
	array: [1, 2, 3],
	arrayOfObjs: [
		{id: 0, name: "_"},
		{id: 1, name: "second"},
		{id: 2, name: "3"},
	],
	matrix: [
		[1, 2, 3],
		[4, 5, 6],
		[1, 2, 0]
	],
	positiveArray: [Infinity, 1, 4, 5],
	nested: {
		parseableNumber: "777",
		anotherNest: {
			phrase:"henlo there",
			wordCount: 2
		},
		justBeThere: 0
	},
	booleanOrNumber: 0,
	dynamic: 69
};

const schema = { // Require value to be an object
	// Require typeof value.title to be "string"
	title: "string",
	
	//Require value.array to be an array of numbers AND to be longer than 1 element
	array: [Arstotzka.ARRAY_OF("number"), x => x.length > 1],

	// Require each element of value.arrayOfObjs to be valid according to provided schema
	arrayOfObjs: Arstotzka.ARRAY_OF({
		id: "number",
		name: "string"
	}),

	// Require each element of value.matrix to be an array of numbers
	matrix: Arstotzka.ARRAY_OF(Arstotzka.ARRAY_OF("number")),

	// Require each element of value.positiveArray be larger than zero, regardless of type
	positiveArray: Arstotzka.ARRAY_OF(x => x > 0),

	// Require value.nested to be an object
	nested: {
		// Require value.nested.parseableNumber to make this function return true
		parseableNumber: x => !isNaN(parseInt(x, 10)),
		// Require value.nested.anotherNest to be an object AND make provided function return true
		anotherNest: [{
			phrase: "string",
			wordCount: "number"
		}, x => x.phrase.split(" ").length == x.wordCount],
		// Require value.nested.justBeThere to be present
		justBeThere: []
	},

	// Require value.optional to be of type "number", but only if present
	optional: ["number", Arstotzka.OPTIONAL],

	// Require value.booleanOrNumber to be either boolean, or 0 or 1
	booleanOrNumber: Arstotzka.ANY_OF("boolean", x => x === 0 || x === 1),

	// Require value.dynamic to be valid according to schema returned from provided callback (always "number" in that case)
	dynamic: Arstotzka.DYNAMIC(x => "number")
};

// You can call validate() without providing any options. Below are all options with default values
const optionalValidationOptions = {
	allowExtraProperties: true,
	allErrors: true
};

const errors = Arstotzka.validate(value, schema, optionalValidationOptions);

console.log(errors); // Empty, meaning validation is passed