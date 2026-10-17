# KidsLearningApp

On launch, an animated Kids Learning Fun logo introduces the app before the
language-selection screen. The sound toggle appears after the logo and can mute
speech and sound effects throughout the app. The app checks for Telugu (India),
Hindi (India), and English (India) speech voices on the device. If any are not
available, it asks whether you want to view device-specific setup instructions;
the web app cannot install system voices itself. Choose English, Telugu, or Hindi,
then enter a name to begin.
The Maths option opens Addition, Subtraction, Multiplication, and Division. Each
operation offers separate Learning and Questionaries choices. Learning starts with
a beginner-friendly example and lets children choose numbers to see object counts
animate into the result, with spoken explanations. Questionaries opens a level
picker with ten selectable levels (Level 1: 1–10, Level 2: 11–20, continuing
through Level 10: 91–100), then starts the visual quiz immediately. Use
Previous/Next to browse any number of ten-level batches without completion locks;
each new batch continues the number ranges by 100. The level heading is spoken
once when the picker opens. Questions speak the prompt and explain the answer.
Addition and subtraction show objects being combined
or taken away; multiplication shows equal groups; division practices equal sharing
with exact answers. The selected level controls question ranges; multiplication
uses 1–10 objects per group, while division uses 1–10 groups. Object illustrations
are capped for readability at large number levels, with the exact count still
displayed. Learning activities include number selectors and spoken guidance;
questionaries include multiple-choice answers and feedback.
The language-selection screen reads its heading and available options aloud; use
“Hear options” to replay the voice guidance.
English opens a menu for Alphabets, Identify Words, and two-letter, three-letter,
and multi-letter words. Identify Words has ten picture questions per level, four
image choices per question, and unlocks the next level after each level is
completed. Its ten-level pages continue without a fixed limit as levels unlock,
and progress is saved on the device. Alphabets opens an interactive A–Z screen
that animates each selected uppercase/lowercase letter with an example picture
and spoken word. In the word lessons, choose a letter to browse matching
illustrated words; selecting a word speaks its pronunciation using the English
(India) locale and an Indian English voice when available. Hindi opens an independent Hindi Devanagari lesson with
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
