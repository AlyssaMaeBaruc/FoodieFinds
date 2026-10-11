// "batch cook" -> "Batch cook": sentence case for names stored in lowercase (tags, ingredients)
export const sentenceCase = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
