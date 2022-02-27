// <snippet_trimParam>
/**
 * 
 * @param str
 * @returns {string}
 */
export const trimParam = (str: string): string => (typeof str === 'string' ? str.trim() : '');
