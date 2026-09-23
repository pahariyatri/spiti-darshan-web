// Minimal stand-in for the astro:actions virtual module in unit tests.
export const isInputError = (e: unknown) => typeof e === 'object' && e !== null && 'fields' in e;
