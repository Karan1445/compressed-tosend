import { format, parseISO, isValid } from "date-fns";
function unwrap(val, fieldConfig) {
    if (val && typeof val === "object" && !Array.isArray(val) && "_value" in val) {
        const mainVal = val._value;
        const textVal = val._textInput || "";

        const options = fieldConfig?.options || [];
        const textTriggerOptions = options
            .filter((o) => o && typeof o === 'object' && o.showTextInput === true)
            .map((o) => String(o.value || o.id));
        const shouldReplace = (v) => {
            const sVal = String(v);

            if (textTriggerOptions.length > 0 && textTriggerOptions.includes(sVal))
                return true;

            if (textTriggerOptions.length === 0) {
                return sVal.toLowerCase() === "other" || sVal.toLowerCase() === "others";
            }
            return false;
        };
        if (Array.isArray(mainVal)) {
            if (!textVal)
                return mainVal;
            return mainVal.map((v) => shouldReplace(v) ? textVal : v);
        }
        if (shouldReplace(mainVal)) {
            return textVal || mainVal;
        }
        return mainVal;
    }
    return val;
}

function stringify(val, fieldConfig) {
    if (val === null || val === undefined)
        return "";

    const unwrapped = unwrap(val, fieldConfig);
    if (typeof unwrapped === "string") {

        const dateMatch = unwrapped.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
            try {
                const date = parseISO(unwrapped);
                if (isValid(date)) {
                    const pattern = fieldConfig?.dateFormat || "MM/dd/yyyy";
                    return format(date, pattern);
                }
            }
            catch (e) {

                const year = dateMatch[1];
                const month = dateMatch[2];
                const day = dateMatch[3];
                return `${month}/${day}/${year}`;
            }
        }
        return unwrapped;
    }
    if (typeof unwrapped === "number" || typeof unwrapped === "boolean")
        return String(unwrapped);
    if (Array.isArray(unwrapped)) {

        if (unwrapped.length > 0 && typeof unwrapped[0] === "object") {
            return unwrapped
                .map((entry) => {
                const parts = Object.entries(entry)
                    .filter(([k]) => k !== "_textInput" && k !== "_value")
                    .map(([k, v]) => {

                    const subConfig = fieldConfig?.groupFields?.find((f) => (f.id || f.name) === k)?.configuration;
                    return `${k}: ${stringify(v, subConfig)}`;
                });
                return parts.join(", ");
            })
                .join(" | ");
        }

        return unwrapped.map(v => stringify(v, fieldConfig)).join(", ");
    }
    if (typeof unwrapped === "object") {

        const parts = Object.entries(unwrapped)
            .filter(([k]) => k !== "_textInput" && k !== "_value")
            .map(([_, v]) => stringify(v))
            .filter(Boolean);
        return parts.join(", ");
    }
    return String(unwrapped);
}

function walkPath(current, path, fieldConfig, index) {
    if (!path)
        return unwrap(current, fieldConfig);
    const parts = path.split(".");
    let node = current;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (node === null || node === undefined)
            return undefined;

        if (part === "group") {
            let baseVal = unwrap(node, fieldConfig);

            if (!Array.isArray(baseVal) && typeof baseVal === "object" && baseVal !== null) {
                const keys = Object.keys(baseVal).filter(k => k !== "_textInput" && k !== "_value");
                const allNumeric = keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)));
                if (allNumeric) {
                    baseVal = keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(k => baseVal[k]);
                }
            }
            const entries = Array.isArray(baseVal) ? baseVal : [baseVal];
            const remainingPath = parts.slice(i + 1).join(".");

            const nextPart = parts[i + 1];
            const pathIndex = parseInt(nextPart, 10);
            const targetIndex = !isNaN(pathIndex) ? pathIndex : (index !== undefined ? index : -1);
            if (targetIndex !== -1 && entries[targetIndex] !== undefined) {
                const targetEntry = entries[targetIndex];

                if (!isNaN(pathIndex))
                    i++;
                if (remainingPath) {

                    node = targetEntry;
                    continue;
                }
                return unwrap(targetEntry, fieldConfig);
            }
            else {

                return entries.map(entry => walkPath(entry, remainingPath, fieldConfig, index));
            }
        }
        node = unwrap(node, fieldConfig);
        if (Array.isArray(node)) {
            const explicitIdx = parseInt(part, 10);
            if (!isNaN(explicitIdx)) {
                node = node[explicitIdx];
            }
            else if (index !== undefined && node[index] !== undefined) {

                node = node[index][part];
            }
            else {

                const remainingPath = parts.slice(i).join(".");
                return node.map(item => walkPath(item, remainingPath, fieldConfig, index));
            }
        }
        else if (typeof node === "object") {
            node = node[part];
        }
        else {
            return undefined;
        }
    }
    return unwrap(node, fieldConfig);
}

export function resolveRawValue(answers, questionId, fieldConfig, index) {
    if (!questionId)
        return undefined;

    if (questionId.startsWith("sys.")) {
        return answers[questionId];
    }

    if (questionId.startsWith("role.")) {
        return unwrap(answers[questionId], fieldConfig);
    }

    if (questionId in answers) {
        const val = answers[questionId];
        if (Array.isArray(val) && index !== undefined && val[index] !== undefined) {
            return unwrap(val[index], fieldConfig);
        }
        return unwrap(val, fieldConfig);
    }

    const parts = questionId.split(".");
    const baseId = parts[0];
    const baseObj = answers[baseId];
    if (baseObj === undefined)
        return undefined;
    return walkPath(baseObj, parts.slice(1).join("."), fieldConfig, index);
}

export function resolveAnswerValue(answers, questionId, fieldConfig, index) {
    const raw = resolveRawValue(answers, questionId, fieldConfig, index);

    if (raw === undefined && questionId.startsWith("sys.")) {
        switch (questionId) {
            case "sys.formFilledDate": {
                const now = new Date();
                const m = String(now.getMonth() + 1).padStart(2, "0");
                const d = String(now.getDate()).padStart(2, "0");
                return `${m}/${d}/${now.getFullYear()}`;
            }
            case "sys.currentYear":
                return String(new Date().getFullYear());
            default:
                return "";
        }
    }
    return stringify(raw, fieldConfig);
}

export function evaluateCondition(answer, operator, expectedValue) {

    if (operator === "is_empty") {
        if (answer === undefined || answer === null || answer === "")
            return true;
        if (Array.isArray(answer))
            return answer.length === 0 || answer.every(v => v === "" || v === null || v === undefined);
        return false;
    }
    if (operator === "is_not_empty") {
        if (answer === undefined || answer === null || answer === "")
            return false;
        if (Array.isArray(answer))
            return answer.length > 0 && answer.some(v => v !== "" && v !== null && v !== undefined);
        return true;
    }
    if (answer === undefined || answer === null)
        return false;

    if (operator === "date_is_past" || operator === "date_is_future" || operator === "date_in_range" || operator === "date_is_after" || operator === "date_is_before") {
        const parseDate = (v) => {
            if (!v)
                return null;
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
        };

        const rawValues = Array.isArray(answer) ? answer : [answer];
        const dates = rawValues.map(parseDate).filter((d) => d !== null);
        if (dates.length === 0)
            return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (operator === "date_is_past") {
            return dates.some(d => { const nd = new Date(d); nd.setHours(0, 0, 0, 0); return nd < today; });
        }
        if (operator === "date_is_future") {
            return dates.some(d => { const nd = new Date(d); nd.setHours(0, 0, 0, 0); return nd > today; });
        }
        if (operator === "date_is_after") {
            const targetDate = parseDate(expectedValue);
            if (!targetDate)
                return false;
            targetDate.setHours(23, 59, 59, 999); // Midday normalization alternative: after current day ends
            return dates.some(d => {
                const nd = new Date(d);
                nd.setHours(12, 0, 0, 0);
                return nd > targetDate;
            });
        }
        if (operator === "date_is_before") {
            const targetDate = parseDate(expectedValue);
            if (!targetDate)
                return false;
            targetDate.setHours(0, 0, 0, 0);
            return dates.some(d => {
                const nd = new Date(d);
                nd.setHours(12, 0, 0, 0);
                return nd < targetDate;
            });
        }
        if (operator === "date_in_range") {

            const range = typeof expectedValue === 'string' ? (() => { try {
                return JSON.parse(expectedValue);
            }
            catch {
                return null;
            } })() : expectedValue;
            if (!range || (!range.start && !range.end))
                return true; // No range defined = always match
            const startDate = range.start ? parseDate(range.start) : null;
            const endDate = range.end ? parseDate(range.end) : null;
            if (startDate)
                startDate.setHours(0, 0, 0, 0);
            if (endDate)
                endDate.setHours(23, 59, 59, 999);
            return dates.some(d => {
                const nd = new Date(d);
                nd.setHours(12, 0, 0, 0); // Normalize to midday for comparison
                if (startDate && nd < startDate)
                    return false;
                if (endDate && nd > endDate)
                    return false;
                return true;
            });
        }
    }
    const checkMatch = (val) => {
        if (val === null || val === undefined)
            return false;
        return String(val) === String(expectedValue);
    };
    let isMatch = false;

    const flatten = (arr) => {
        return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
    };
    const values = Array.isArray(answer) ? flatten(answer) : [answer];
    switch (operator) {
        case "equals":
            isMatch = values.some(checkMatch);
            break;
        case "not_equals":
            isMatch = !values.some(checkMatch);
            break;
        case "contains":
            isMatch = values.some(v => String(v || "").toLowerCase().includes(String(expectedValue).toLowerCase()));
            break;
        default:
            isMatch = true;
    }
    return isMatch;
}

export function resolveClauseValue(answers, questionId) {
    return resolveRawValue(answers, questionId);
}

function resolveFromObject(obj, path, fieldConfig, index) {
    const raw = walkPath(obj, path, fieldConfig, index);
    return stringify(raw, fieldConfig);
}
