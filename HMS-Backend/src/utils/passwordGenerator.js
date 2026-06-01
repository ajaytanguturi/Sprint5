const crypto = require('node:crypto');

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;
const PASSWORD_LENGTH = 12;

const pickRandom = (charset) => charset[crypto.randomInt(0, charset.length)];

const cryptoShuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/** 
 @returns {string} 
 */
const generateTemporaryPassword = () => {
    const required = [pickRandom(UPPERCASE), pickRandom(LOWERCASE), pickRandom(DIGITS), pickRandom(SPECIAL)];
    const filler = Array.from(
        { length: PASSWORD_LENGTH - required.length },
        () => pickRandom(ALL_CHARS)
    );
    return cryptoShuffle([...required, ...filler]).join('');
};

module.exports = { generateTemporaryPassword };