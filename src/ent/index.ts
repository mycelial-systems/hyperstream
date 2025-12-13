/**
 * HTML entity encoder
 * Simplified version of the 'ent' package for local use
 * Original package: https://www.npmjs.com/package/ent
 */

interface EncodeOptions {
    named?: boolean;
    numeric?: boolean;
    special?: Record<string, boolean>;
}

const defaultSpecial: Record<string, boolean> = {
    '"': true,
    "'": true,
    '<': true,
    '>': true,
    '&': true
}

// Common HTML entities
const namedEntities: Record<string, string> = {
    '"': 'quot',
    "'": 'apos',
    '<': 'lt',
    '>': 'gt',
    '&': 'amp'
}

/**
 * Encode a string to HTML entities
 */
export function encode (str: string, opts?: EncodeOptions): string {
    if (typeof str !== 'string') {
        throw new TypeError('Expected a String')
    }

    const numeric = opts?.numeric ?? !opts?.named
    const special = opts?.special ?? defaultSpecial

    let result = ''

    for (let i = 0; i < str.length; i++) {
        const char = str[i]
        const charCode = str.charCodeAt(i)

        // Check if this character needs encoding
        const needsEncoding = charCode < 32 || charCode >= 127 || special[char]

        if (needsEncoding) {
            // Try to use named entity if not numeric mode
            if (!numeric && namedEntities[char]) {
                result += '&' + namedEntities[char] + ';'
            } else {
                // Use numeric entity
                result += '&#' + charCode + ';'
            }
        } else {
            result += char
        }
    }

    return result
}

/**
 * Default export for compatibility with 'ent' package
 */
export default { encode }
