import * as Arstotzka from "./index.js";

const schema = {
	title: "string",
	array: "array",
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

const testSubject = {
	title: 1337,
	array: [1, 2, 3],
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

console.log(Arstotzka.validate(testSubject, schema, {allowExtraProperties: false}));