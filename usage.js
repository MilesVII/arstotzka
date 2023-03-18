import * as Arstotzka from "./index.js";


const schema = {
	title: "string",
	array: [Arstotzka.ARRAY_OF("number"), x => x.length > 1],
	arrayOfObjs: Arstotzka.ARRAY_OF({
		id: "number",
		name: "string"
	}),
	notArray: Arstotzka.ARRAY_OF("string"),
	arrayOof: Arstotzka.ARRAY_OF(Arstotzka.ARRAY_OF("number")),
	positiveArray: Arstotzka.ARRAY_OF(x => x > 0),
	nested: {
		parseableNumber: [x => !isNaN(parseInt(x, 10))],
		anotherNest: {
			_self: [x => x.phrase.split(" ").length == x.wordCount],
			phrase: "string",
			wordCount: "number"
		},
		missing: []
	},
	invalidValidator: [x => null.invalid],
	optional: ["number", Arstotzka.OPTIONAL]
};

const testSubject0 = {
	title: "1337",
	array: [1, 2, 3],
	arrayOfObjs: [
		{id: 0, name: "_"},
		{id: 1, name: "second"},
		{id: 2, name: "3"},
	],
	notArray: [],
	arrayOof: [
		[1, 2, 3],
		[4, 5, 6],
		[1, 2]
	],
	positiveArray: [Infinity, 1, 4, 5],
	nested: {
		parseableNumber: "777",
		anotherNest: {
			phrase:"henlo",
			wordCount: 1
		},
		missing: 0
	},
	invalidValidator: "uhm"
}

const testSubject1 = {
	title: 1337,
	array: [1, null, 3],
	arrayOfObjs: [
		{id: 0, name: "_"},
		{id: 0,},
		{id: "0", name: "_"}
	],
	notArray: "[1, 2, 3]",
	arrayOof: [
		[1, 2, 3],
		[4, "5", 6],
		null,
		[1, 2]
	],
	positiveArray: [0, 1, 4, -5],
	nested: {
		parseableNumber: "seven",
		extraProperty: "hey",
		anotherNest: {
			phrase:"henlo",
			wordCount: 2
		}
	},
	invalidValidator: "uhm"
}

console.log(Arstotzka.validate(testSubject1, schema, {allowExtraProperties: false}));
