# KidsLearningApp

Little Learners uses original panda-and-reader mascots throughout its launch and
learning screens. On launch, a pastel welcome screen with the animated logo and a
Start Learning button opens a name-entry screen, followed by a short animated,
spoken app tour. The tour can be skipped; either way, the learner proceeds to
language and subject selection. The learner's name is used in greetings in English,
Telugu, and Hindi. The sound toggle appears after the welcome screen and can mute speech
and sound effects throughout the app. The app checks for Telugu (India),
Hindi (India), and English (India) speech voices on the device. If any are not
available, it asks whether you want to view device-specific setup instructions;
the web app cannot install system voices itself. Choose English, Telugu, Hindi,
or Maths to begin. The interface uses a coordinated pastel theme, rounded type,
and consistent button and activity-card styling.
The Maths option opens Addition, Subtraction, Multiplication, and Division. Each
operation offers separate Learning and Questionaries choices. In Learning, children
choose each number from paged buttons (15 choices per page, from 1 to 105); after
the first choice, the app asks aloud for the second. Matching object icons animate
into the result with a spoken explanation. Questionaries opens a level
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
displayed. Story questions include an Answer & explanation screen with operation-
specific visual models, spoken answers, and Previous/Next step navigation for
addition, subtraction, multiplication, and division. Learning activities include
number selectors and spoken guidance. Division learning asks for the total first,
then offers only group counts that divide it evenly so the visual groups match
the quotient. Questionaries include multiple-choice answers and feedback.
The Maths menu also includes Numbers and Roman Numbers. Each opens a keyboard
showing 15 consecutive values at a time, with Previous/Next navigation and no
fixed final page. Numbers show the selected digit, its English name, and up to ten
star icons. Larger numbers keep the digit and name without icon counting. The
selected number is large, colorful, and animated; Roman Numbers show the Arabic
value and its Roman numeral. Both options speak the selected value.
The language-selection screen reads its heading and available options aloud; use
“Hear options” to replay the voice guidance.
English opens a menu for Alphabets, Learn Letters: Indian Gods, Epic Warriors,
Stories, Identify Words, and two-letter, three-letter, and multi-letter words.
Identify Words has ten picture questions per level, four
image choices per question, and unlocks the next level after each level is
completed. Its ten-level pages continue without a fixed limit as levels unlock,
and progress is saved on the device. Alphabets opens an interactive A–Z screen
that animates each selected uppercase/lowercase letter with an example picture
and spoken word. Learn Letters: Indian Gods presents an A–Z letter picker with
real, bundled deity images, short descriptions, and spoken guidance; image
licenses and attributions are included in
`src/images/indian-deities/ATTRIBUTIONS.txt`.
Epic Warriors displays an A–Z grid of characters from the Ramayana and
Mahabharata. Selecting a letter opens a compact popup with a picture where
available, a short introduction, and voice playback that can be repeated.
Letters without a suitable warrior match are identified instead of filled with
a deity name. Warrior image credits and licenses are kept separately in
`src/images/epic-warriors/ATTRIBUTIONS.txt`. In the word lessons, choose a
letter to browse matching illustrated words; letters without a widely used
English transliteration are clearly identified. Selecting a word speaks its
pronunciation using the English
(India) locale and an Indian English voice when available. Hindi opens an independent Hindi Devanagari lesson with
46 characters, 20 words per character, emoji illustrations, and Hindi speech.
English and Telugu each include a Stories button with three stories in each of
five genres: Fun, Adventure, Visual Wonder, Indian Mythology, and gentle Horror.
Each story opens an illustrated reader with a moral, starts expressive narration of
the story and moral in the selected language, highlights the passage currently
being read, and can be replayed or stopped. Narration prefers installed
Natural/Neural voices in the selected language when available; voice quality
depends on the device and browser, and the app does not provide recorded human
audio.
The story artwork is custom-made and bundled locally. Telugu narration needs an
installed Telugu text-to-speech voice on the device. Telugu opens a Telugu letter
lesson with Telugu words, emoji illustrations, English
meanings, and speech. The Hindi and Telugu lessons speak the letter sound followed
by the example word (for example, “Aa… Aam” or “Ka… Kalam”) at a slower pace with a
short pause between them, and show the pronunciation.
Starting a Telugu or Hindi lesson opens its learning choices directly without a
learner-name prompt. If the device has no Telugu speech voice, the app speaks the
letter sound and word transliteration using an Indian English voice. Repeated taps
cycle through all 20 examples for each Telugu or Hindi character. Hindi speech uses
an installed Hindi voice when available; otherwise the Hindi word is transliterated
and spoken with an Indian English voice. The pronunciation is also shown on screen.
The English meaning is shown but not spoken in Telugu mode.

## Run locally

- `npm run dev` builds the app and starts the local server at http://localhost:3000.
- `npm test` runs the server smoke tests.
