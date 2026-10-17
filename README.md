# KidsLearningApp

On launch, an animated Kids Learning Fun logo introduces the app before the
language-selection screen. The sound toggle appears after the logo and can mute
speech and sound effects throughout the app. The app checks for Telugu (India),
Hindi (India), and English (India) speech voices on the device. If any are not
available, it asks whether you want to view device-specific setup instructions;
the web app cannot install system voices itself. Choose English, Telugu, or Hindi,
then enter a name to begin.
The Maths option opens Addition, Subtraction, Multiplication, and Division. Each
operation has a separate level picker with ten selectable levels (Level 1: 1–10,
Level 2: 11–20, continuing through Level 10: 91–100), followed by a spoken, visual
lesson and practice questions. Use Previous/Next to browse any number of ten-level
batches without completion locks; each new batch continues the number ranges by 100.
The level heading is spoken once when the picker opens. Lessons speak the selected
numbers and result when a number is chosen and when a practice answer is correct.
Addition and subtraction show objects being combined
or taken away; multiplication shows equal groups; division practices equal sharing
with exact answers. The selected range controls the first addend, starting amount,
number of groups, or objects in each share respectively; multiplication uses 1–10
objects per group, while division uses 2–10 groups. Object illustrations are capped
for readability at large number levels, with the exact count still displayed.
Each activity includes number selectors, spoken guidance, multiple-choice questions,
and feedback.
The language-selection screen reads its heading and available options aloud; use
“Hear options” to replay the voice guidance.
English opens a word-length menu for two-letter, three-letter, and multi-letter
words. Choose a letter to browse matching illustrated words; selecting a word
speaks its pronunciation using the English (India) locale and an Indian English
voice when available. Hindi opens an independent Hindi Devanagari lesson with
46 characters, 20 words per character, emoji illustrations, and Hindi speech.
Telugu opens a Telugu letter lesson with Telugu words, emoji illustrations, English
meanings, and speech. The Hindi and Telugu lessons speak the letter sound followed
by the example word (for example, “Aa… Aam” or “Ka… Kalam”) at a slower pace with a
short pause between them, and show the pronunciation.
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
