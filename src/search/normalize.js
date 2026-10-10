'use strict';

// Search text normalization, applied the same way to what is indexed and to what
// the shopper types, so spelling variants match:
//
// - Arabic: hamza forms of alef (أ إ آ ٱ) -> ا, ى -> ي, ة -> ه, ؤ -> و, ئ -> ي;
//   diacritics (tashkeel) and tatweel removed; Arabic-Indic digits -> 0-9.
// - The definite article: "الإضاءة" and "إضاءة" both become "اضاءه" ("ال", "وال",
//   "بال", "فال", "كال" and "لل" at the start of a word longer than 4 letters).
// - Latin text is lower-cased; punctuation becomes spaces.

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const LETTERS = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const ARTICLE = /^(?:[وبفك]?ال|لل)(?=[ء-ي]{3,})/;

const normalizeWord = (word) => word.replace(ARTICLE, '');

// The article is removed before hamza is normalized: "ألماني" starts with a
// hamza, not with the article, and must stay as it is.
const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf))
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => normalizeWord(word).replace(/[أإآٱىةؤئ]/g, (c) => LETTERS[c]))
    .join(' ');

module.exports = { normalize };
