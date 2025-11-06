export const ERRORS = {
	noProperty: "Required property not present",
	typeMismatch: "Provided type is not allowed by schema",
	customFail: "Custom validation function failed",
	extraProperty: "Provided object contains properties not present in schema",
	exceptionOnCustom: "Exception thrown during constraint validation",
	notArray: "Tried using ARRAY_OF constraint on non-array value",
	targetIsNull: "Passed object or array item is null",
	functionExpected: "Expected function as dynamic constraint",
	objectExpected: "Expected object",
	anyFailed: "None of ANY_OF constraints are met",
	parsingError: "Schema parsing error",
	deadError: "This error never occurs (i guess)"
};

const TYPE = (t: string) => (x: any) => typeof x == t;
const IS_ARRAY = (x: any) => Array.isArray(x);

const CONSTRAINT = Symbol();
const FC_ARRAY = Symbol(); // https://www.youtube.com/watch?v=qSqXGeJJBaI
const FC_ANY = Symbol();
const FC_DYNAMIC = Symbol();
const FC_NESTED = Symbol();

const VALIDATION_DEFAULTS = {
	allErrors: true,
	allowExtraProperties: true
};

/**
* @param options Validation options:
*
* - allErrors (true) : return all errors instead of interrupting after first fail
* - allowExtraProperties (true) : If false, adds specific error to a list for every property of target object not present in schema
* @return Array of errors
 */
export function validate(target: any, schema: Schema = {}, options: ValidationOptions = {}) {
	options = Object.assign(VALIDATION_DEFAULTS, options)

	const parseErrors: Error[] = [];
	const [constraints, flags] = parseSchema(schema, parseErrors);

	if (flags.length > 0) {
		console.error("Flags can't be used at schema's root")
	}

	const errors = checkValue("", target, constraints, options);
	errors.push(...parseErrors)
	errors.forEach(e => {
		if (e.propertyName?.startsWith("."))
			e.propertyName = e.propertyName.slice(1);
	});

	return errors;
}

function parseSchema(schemaProperty: Schema, errors: Error[]): [Constraint[], OptionalFlag[]] {
	function translate(raw: Schema): Constraint | Constraint[] | OptionalFlag | null {
		if (!raw) return null;

		if (
			typeof raw === "object" &&
			"type" in raw &&
			raw.type === CONSTRAINT
		)
			return raw as Constraint;

		if (Array.isArray(raw)) {
			return raw.map(translate).filter(raw => raw) as Constraint | Constraint[] | OptionalFlag;
		} else {
			switch (typeof raw) {
				case ("string"): {
					if (raw == "array")
						return constraint(IS_ARRAY, "typeMismatch", raw);
					else
						return constraint(TYPE(raw as TypeofValueSchema), "typeMismatch", raw);
				}
				case ("function"): {
					return constraint(raw as FunctionSchema, "customFail", raw);
				}
				case ("object"): {
					return constraint(FC_NESTED, "deadError", raw);
				}
				case ("symbol"): {
					return raw as OptionalFlag;
				}
			}
		}
		errors.push(error("<schema>", "parsingError", undefined, raw));
		return null;
	}

	const intermediate = translate(schemaProperty) || [];

	function wrap(
		translated: OptionalFlag | Constraint | Constraint[]
	): (OptionalFlag | Constraint)[] {
		if (!Array.isArray(translated))
			return [translated];
		return translated;
	}

	const wrapped = wrap(intermediate);
	const constraints = wrapped.filter(i => typeof i !== "symbol" && i.type == CONSTRAINT);
	const flags       = wrapped.filter(i => typeof i === "symbol");

	return [
		constraints as Constraint[],
		flags       as OptionalFlag[]
	];
}

function checkValue(
	propertyName: keyof any,
	value: any,
	constraints: Constraint[],
	options: ValidationOptions
): Error[] {
	const errors = [];

	function constraintFunctional(v: Constraint["validation"]): v is (value: any) => any {
		return typeof v == "function";
	}

	for (let constraint of constraints) {
		const validationCall = constraint.validation;
		if (constraintFunctional(validationCall)) {
			const [success, validationResult] = nothrow(() => validationCall(value));
			if (!success) {
				errors.push(error(propertyName, "exceptionOnCustom", undefined, validationResult?.toString()));
			} else if (!validationResult) {
				errors.push(error(propertyName, constraint.failMessageId, "[function]", value));
			}
			continue;
		}

		switch(constraint.validation) {
			case FC_NESTED: {
				if (typeof value != "object" || !value) {
					errors.push(error(propertyName, "objectExpected", "object", value));
					break;
				}

				const targetKeys = Object.keys(value);
				const schemaKeys = Object.keys(constraint.expected!);

				for (let key of schemaKeys) {
					// @ts-ignore // FC_NESTED guarantees expected scheme to be an object
					const [subConstraints, flags] = parseSchema(constraint.expected[key], errors);

					if (!targetKeys.includes(key)) {
						if (!flags.includes(OPTIONAL)) {
							errors.push(error(`${stringifyKey(propertyName)}.${key}`, "noProperty"));
						}
						continue;
					}

					const subErrors = checkValue(`${stringifyKey(propertyName)}.${key}`, value[key], subConstraints, options);
					errors.push(...subErrors);
				}

				if (!options.allowExtraProperties) {
					const extraProperties = targetKeys.filter(k => !schemaKeys.includes(k));
					if (extraProperties.length > 0) {
						errors.push(...extraProperties.map(k => error(`${stringifyKey(propertyName)}.${k}`, "extraProperty")))
					}
				}

				break;
			}
			case FC_ARRAY: {
				if (!Array.isArray(value)) {
					errors.push(error(propertyName, "notArray", "array", typeof value))
					break;
				}

				const [subConstraints, flags] = parseSchema(constraint.expected, errors);

				let indexCounter = 0;
				for (let item of value) {
					const subErrors = checkValue(`${stringifyKey(propertyName)}[${indexCounter}]`, item, subConstraints, options);
					errors.push(...subErrors);
					++indexCounter;
				}

				break;
			}
			case FC_ANY: {
				const subSchemas = constraint.expected as Schema[];

				const subErrors = [];
				let passed = false;
				let counter = 0;

				for (let subSchema of subSchemas) {
					const subParseErrors: Error[] = [];
					const [subConstraints, flags] = parseSchema(subSchema, subParseErrors);
					const caseErrors = checkValue(`${stringifyKey(propertyName)}.<any#${counter}>`, value, subConstraints, options);
					caseErrors.push(...subParseErrors);
					++counter;
					subErrors.push(caseErrors);
					if (caseErrors.length == 0) {
						passed = true;
						break;
					}
				}

				if (!passed) errors.push(error(propertyName, "anyFailed", undefined, subErrors));

				break;
			}
			case FC_DYNAMIC: {
				const constraintCallback = constraint.expected;

				if (typeof constraintCallback != "function") {
					errors.push(error(propertyName, "functionExpected", "function", typeof constraintCallback))
					break;
				}

				const [subConstraints, flags] = parseSchema(constraintCallback(value), errors)
				const subErrors = checkValue(propertyName, value, subConstraints, options);
				errors.push(...subErrors);

				break;
			}
		}

		if (!options.allErrors && errors.length > 0) break;
	}
	return errors;
}

function nothrow<T>(cb: () => T): [true, T] | [false, unknown] {
	try {
		return [true, cb()];
	} catch (e) {
		return [false, e];
	}
}

function stringifyKey(k: keyof any): string {
	return typeof k === "symbol" ? "[symbol]" : String(k);
}

function error(
	propertyName: keyof any,
	id: ErrorID,
	expected?: string,
	got?: any
) {
	return {
		propertyName: stringifyKey(propertyName),
		id,
		message: ERRORS[id],
		expected,
		got
	};
}

function constraint(
	f: Constraint["validation"],
	failMessageId: Constraint["failMessageId"],
	expected: Constraint["expected"]
): Constraint {
	return {
		type: CONSTRAINT,
		validation: f,
		failMessageId: failMessageId,
		expected: expected
	};
}

export const OPTIONAL = Symbol();
export function ARRAY_OF(constraints: Schema) {
	if (arguments.length > 1) {
		console.error("Got more than one argument to ARRAY_OF. Did you mean to pass an array of constraints?");
	}
	return constraint(FC_ARRAY, "deadError", constraints);
}
export function ANY_OF(constraints: Schema[]) {
	if (arguments.length > 1) {
		return constraint(FC_ANY, "deadError", Array.from(arguments));
	} else {
		if (Array.isArray(constraints)) {
			return constraint(FC_ANY, "deadError", constraints);
		} else {
			return constraint(FC_ANY, "deadError", [constraints]);
		}
	}
}
export function DYNAMIC(constraints: Schema) {
	return constraint(FC_DYNAMIC, "deadError", constraints);
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
	return Boolean(value);
}

export type ErrorID = keyof typeof ERRORS;

type TypeofValueSchema = 
	| "bigint"
	| "boolean"
	| "function"
	| "number"
	| "object"
	| "string"
	| "symbol"
	| "undefined"
	| "array"; // array is special case
type FunctionSchema = (value: any) => boolean | any;
type OptionalFlag = typeof OPTIONAL;

type ForbiddenConstraintFlag =
	| typeof FC_ARRAY
	| typeof FC_ANY
	| typeof FC_DYNAMIC
	| typeof FC_NESTED
type Constraint = {
	type: typeof CONSTRAINT,
	validation:
		| ((value: any) => any)
		| ForbiddenConstraintFlag,
	failMessageId: ErrorID,
	expected: Schema
}

export type Schema = 
	| TypeofValueSchema
	| FunctionSchema
	| OptionalFlag
	| { [property: keyof any]: Schema }
	| Schema[]
	| Constraint;

type ValidationOptions = Partial<typeof VALIDATION_DEFAULTS>;

type Error = {
	propertyName: string,
	id: ErrorID,
	message: string,
	expected: any,
	got: any
};