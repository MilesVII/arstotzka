export const ERRORS = {
	noProperty: "Required property not present",
	typeMismatch: "Provided type is not allowed by schema",
	customFail: "Custom validation function failed",
	extraProperty: "Provided object contains properties not present in schema",
	exceptionOnCustom: "Exception thrown during constraint validation",
	notArray: "Tried using ARRAY_OF constraint on non-array value",
	targetIsNull: "Passed object or array item is null",
	functionExpected: "Expected function as dynamic constraint",
	objectExpected: "Expected object"
};

export const OPTIONAL = Symbol();
export function ARRAY_OF(constraints){
	if (arguments.length > 1){
		console.error("Got more than one argument to ARRAY_OF. Did you mean to pass an array of constraints?");
	}
	return constraint(FC_ARRAY, null, constraints);
}
export function DYNAMIC(constraints){
	return constraint(FC_DYNAMIC, null, constraints);
}

const TYPE = t => x => typeof x == t;

const CONSTRAINT = Symbol();
const FC_ARRAY = Symbol(); // https://www.youtube.com/watch?v=qSqXGeJJBaI
const FC_DYNAMIC = Symbol();
const FC_NESTED = Symbol();

const VALIDATION_DEFAULTS = {
	allErrors: true,
	allowExtraProperties: true
};

function safe(cb){
	try {
		return [true, cb()];
	} catch (e) {
		return [false, e];
	}
}

function error(propertyName, id, expected, got){
	return {
		propertyName,
		id,
		message: ERRORS[id],
		expected,
		got
	};
}

function constraint(f, failMessageId, expected){
	return {
		type: CONSTRAINT,
		validation: f,
		failMessageId: failMessageId,
		expected: expected
	};
}

function parseSchema(schemaProperty){
	function unify(raw){
		if (raw.type == CONSTRAINT) return raw;

		if (Array.isArray(raw)){
			return raw.map(c => unify(c));
		} else {
			switch (typeof raw){
				case ("string"): {
					if (raw == "array")
						return constraint(IS_ARRAY, "typeMismatch", raw);
					else
						return constraint(TYPE(raw), "typeMismatch", raw);
				}
				case ("function"): {
					return constraint(raw, "customFail", undefined);
				}
				case ("object"): {
					return constraint(FC_NESTED, null, raw);
				}
				case ("symbol"): {
					return raw;
				}
			}
		}
	}
	
	let intermediate = unify(schemaProperty);
	if (!Array.isArray(intermediate))
		intermediate = [intermediate];
	return [
		intermediate.filter(i => i.type == CONSTRAINT),
		intermediate.filter(i => i.type != CONSTRAINT && typeof i == "symbol")
	];
}

function checkValue(propertyName, value, constraints, options){
	const errors = [];
	for (let constraint of constraints){
		if (typeof constraint.validation == "function"){
			const [success, validationResult] = safe(() => constraint.validation(value));
			if (!success){
				errors.push(error(propertyName, "exceptionOnCustom", undefined, validationResult.toString()));
			} else if (!validationResult){
				errors.push(error(propertyName, constraint.failMessageId, constraint.expected, value));
			}
			continue;
		}

		switch(constraint.validation){
			case FC_NESTED: {
				if (typeof value != "object" || value === null || value == undefined){
					errors.push(error(propertyName, "objectExpected", "object", value));
					break;
				}

				const targetKeys = Object.keys(value);
				const schemaKeys = Object.keys(constraint.expected);

				for (let key of schemaKeys){
					const [subConstraints, flags] = parseSchema(constraint.expected[key]);

					if (!targetKeys.includes(key)){
						if (!flags.includes(OPTIONAL)){
							errors.push(error(`${propertyName}.${key}`, "noProperty"));
						}
						continue;
					}

					const subErrors = checkValue(`${propertyName}.${key}`, value[key], subConstraints, options);
					errors.push(...subErrors);
				}

				if (!options.allowExtraProperties){
					const extraProperties = targetKeys.filter(k => !schemaKeys.includes(k));
					if (extraProperties.length > 0){
						errors.push(...extraProperties.map(k => error(`${propertyName}.${k}`, "extraProperty")))
					}
				}

				break;
			}
			case FC_ARRAY: {
				if (!Array.isArray(value)){
					errors.push(error(propertyName, "notArray", "array", typeof value))
					break;
				}

				const [subConstraints, flags] = parseSchema(constraint.expected);

				let indexCounter = 0;
				for (let item of value){
					const subErrors = checkValue(`${propertyName}[${indexCounter}]`, item, subConstraints, options);
					errors.push(...subErrors);
					++indexCounter;
				}

				break;
			}
			case FC_DYNAMIC: {
				const constraintCallback = constraint.expected;

				if (typeof constraintCallback != "function"){
					errors.push(error(propertyName, "functionExpected", "function", typeof constraintCallback))
					break;
				}

				const [subConstraints, flags] = parseSchema(constraintCallback(value))
				const subErrors = checkValue(propertyName, value, subConstraints, options);
				errors.push(...subErrors);

				break;
			}
		}

		if (!options.allErrors && errors.length > 0) break;
	}
	return errors;
}

/**
* @param options Validation options:
*
* - allErrors (true) : return all errors instead of interrupting after first fail
* - allowExtraProperties (true) : If false, adds specific error to a list for every property of target object not present in schema
* @return Array of errors
 */
export function validate(target, schema = {}, options = {}){
	options = Object.assign(VALIDATION_DEFAULTS, options)

	const [constraints, flags] = parseSchema(schema);

	if (flags.length > 0) {
		console.error("Flags can't be used at schema's root")
	}

	const errors = checkValue("", target, constraints, options);

	errors.forEach(e => {
		if (e.propertyName?.startsWith("."))
			e.propertyName = e.propertyName.slice(1);
	});

	return errors;
}