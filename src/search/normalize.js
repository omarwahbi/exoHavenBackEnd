'use strict';

// Search text normalization, applied the same way to what is indexed and to what
// the shopper types, so spelling variants match:
//
// - Arabic: hamza forms of alef (أ إ آ ٱ) -> ا, ى -> ي, ة -> ه, ؤ -> و, ئ -> ي;
//   diacritics (tashkeel) and tatweel removed; Arabic-Indic digits -> 0-9.
// - The definite article: "الإضاءة" and "إضاءة" both become "اضاءه" ("ال", "وال",
//   "بال", "فال", "كال" and "لل" before at least 3 more letters).
// - Latin text is lower-cased; punctuation becomes spaces.

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const LETTERS = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const ARTICLE = /^(?:[وبفك]?ال|لل)(?=[ء-ي]{3,})/;

const normalizeWord = (word) => word.replace(ARTICLE, '');

// Hamza is normalized before the article is removed, so a word typed with or
// without it ("ألعاب" / "العاب") ends up the same ("عاب"). Words that really start
// with أل lose those letters too, on both sides, so they still match.
const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf))
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => normalizeWord(word.replace(/[أإآٱىةؤئ]/g, (c) => LETTERS[c])))
    .join(' ');

module.exports = { normalize };
