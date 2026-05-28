const crypto = require('crypto');

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;
const PASSWORD_LENGTH = 12;

/**
 * Picks one random character from a character set using
 * a cryptographically secure random integer.
 */
const pickRandom = (charset) => charset[crypto.randomInt(0, charset.length)];

/**
 * Fisher–Yates shuffle using crypto.randomInt instead of Math.random,
 * satisfying SonarQube rule S2245 (no pseudo-random in security contexts).
 */
const cryptoShuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Generates a temporary password that always contains at least one
 * uppercase letter, one lowercase letter, one digit, and one special character.
 * @returns {string} A 12-character random password.
 */
const generateTemporaryPassword = () => {
    const required = [
        pickRandom(UPPERCASE),
        pickRandom(LOWERCASE),
        pickRandom(DIGITS),
        pickRandom(SPECIAL),
    ];

    const filler = Array.from(
        { length: PASSWORD_LENGTH - required.length },
        () => pickRandom(ALL_CHARS)
    );

    return cryptoShuffle([...required, ...filler]).join('');
};

module.exports = { generateTemporaryPassword };