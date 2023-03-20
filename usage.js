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
		anotherNest: [{
			phrase: "string",
			wordCount: "number"
		}, x => x.phrase.split(" ").length == x.wordCount],
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
};

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
};

const schema1 = Arstotzka.DYNAMIC(x => dynSchema[x.type]);
const dynSchema = [
	{
		type: "number",
		zero: "string"
	},
	{
		type: "number",
		one: ["number", x => x === 1]
	}
];
const testSubject2 = {
	type: 0,
	zero: "0"
};

const parseableIntSchema = Arstotzka.ANY_OF(
	"number",
	["string", x => !isNaN(parseInt(x))]
);

const tests = [
	[null, "array"],
	[testSubject0, schema], // Only an error caused by invalid validator
	[testSubject1, schema], // Full of errors
	["miles", "string"],    // Any value can be validated, not only objects
	[7, "string"],
	[testSubject2, schema1],
	["7", parseableIntSchema]
];

const TEST_SELECTOR = 0;
console.log(Arstotzka.validate(tests[TEST_SELECTOR][0], tests[TEST_SELECTOR][1], {allowExtraProperties: false}));