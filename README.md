# KidsLearningApp

On launch, an animated Kids Learning Fun logo introduces the app before the
language-selection screen. Choose English, Telugu, or Hindi, then enter a name to begin.
English opens the English letters-and-numbers lessons. Hindi opens an independent Hindi
Devanagari lesson with 46 characters, 20 words per character, emoji illustrations, and
Hindi speech. Telugu opens a Telugu letter lesson with Telugu words, emoji illustrations,
English meanings, and speech. The Hindi and Telugu lessons speak the letter sound followed
by the example word (for example, “Aa… Aam” or “Ka… Kalam”) at a slower pace, and show
the pronunciation.
Submitting a learner's name also plays a spoken welcome in the selected lesson language.
If the device has no Telugu speech voice, it speaks the letter sound and the word's
transliteration using an Indian English voice. Repeated taps cycle through
all 20 examples for each Telugu or Hindi character. Hindi speech uses an installed Hindi
voice when available; otherwise the Hindi word is transliterated and spoken with an
Indian English voice. The pronunciation is also shown on screen. The English meaning is
shown but not spoken in Telugu mode.

## Run locally

- `npm run dev` builds the app and starts the local server at http://localhost:3000.
- `npm test` runs the server smoke tests.
