export const ERRORS = {
	noProperty: "Required property not present",
	typeMismatch: "Provided type is not allowed by schema",
	customFail: "Custom validation function failed",
	extraProperty: "Provided object contains properties not present in schema",
	exceptionOnCustom: "Exception thrown during constraint validation"
};

export const NOT_NULL = x => x !== null;
export const IS_ARRAY = x => Array.isArray(x);
const TYPE = t => x => typeof x == t;
export const OPTIONAL = Symbol();

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

const VALIDATION_DEFAULTS = {
	allErrors: true,
	allowExtraProperties: true,
	selfAlias: "_self"
};

function constraint(f, failMessageId, expected){
	return {
		validation: f,
		failMessageId: failMessageId,
		expected: expected
	};
}

function arrayOfConstraints(raw, selfAlias){
	if (Array.isArray(raw)){
		return raw;
	} else {
		if (typeof raw == "object"){
			if (raw.hasOwnProperty(selfAlias)){
				return arrayOfConstraints(raw[selfAlias]);
			} else {
				return ["object"];
			}
		} else {
			return [raw];
		}
	}
}

function stricterConstraints(raw){
	const r = [];
	for (let c of raw){
		switch (typeof c){
		case ("string"): {
			if (c == "array")
				r.push(constraint(IS_ARRAY, "typeMismatch", c))
			else
				r.push(constraint(TYPE(c), "typeMismatch", c))
			break;
		}
		case ("function"): {
			r.push(constraint(c, "customFail", undefined));
			break;
		}
		}
	}
	return r;
}

/**
* @param options Validation options:
*
* - allErrors (true) : return all errors instead of interrupting after first fail
* - allowExtraProperties (true) : If false, adds specific error to a list for every property of target object not present in schema
* - selfAlias ("_self"): Schema property name for referring nested object
* @return Array of errors
 */
export function validate(target = {}, schema = {}, options = {}){
	options = Object.assign(VALIDATION_DEFAULTS, options)
	const errors = [];

	const targetKeys = Object.keys(target);
	const schemaKeys = Object.keys(schema);

	for (let sKey of schemaKeys){
		if (!options.allErrors && errors.length > 0)
			return errors;

		const rawPropertySchema = schema[sKey];
		const schemaAsArray = arrayOfConstraints(rawPropertySchema, options.selfAlias);
		const flags = schemaAsArray.filter(c => typeof c == "symbol");
		const constraints = stricterConstraints(schemaAsArray);

		if (!targetKeys.includes(sKey)){
			if (!flags.includes(OPTIONAL)){
				errors.push(error(sKey, "noProperty"));
			}
			continue;
		}

		for (let constraint of constraints){
			const [success, validationResult] = safe(() => constraint.validation(target[sKey]));
			if (!success){
				errors.push(error(sKey, "exceptionOnCustom", undefined, validationResult.toString()));
			} else if (!validationResult){
				errors.push(error(sKey, constraint.failMessageId, constraint.expected, target[sKey]));
			}
			continue;
		}

		if (typeof rawPropertySchema == "object" && !Array.isArray(rawPropertySchema)){
			delete rawPropertySchema[options.selfAlias];

			const nestedErrors = validate(target[sKey], rawPropertySchema, options);
			const mappedErrors = nestedErrors.map(e => {
				e.propertyName = `${sKey}.${e.propertyName}`;
				return e;
			});
			errors.push(...mappedErrors);
		}
	}

	if (!options.allowExtraProperties){
		const extraProperties = targetKeys.filter(k => !schemaKeys.includes(k));
		if (extraProperties.length > 0){
			errors.push(...extraProperties.map(k => error(k, "extraProperty")))
		}
	}

	return errors;
}