'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const vm = require('node:vm');
const { build } = require('../scripts/build');
const { createServer } = require('../server');

let server, port;
test.before(async () => {
  build();
  server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
});
test.after(() => server.close());

const get = (p, opts = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: p, method: opts.method || 'GET', headers: opts.headers || {} }, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject);
  req.end();
});

test('home page is served with security headers', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.ok(r.headers['content-security-policy']);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.match(r.body.toString(), /<title>Little Learners<\/title>/);
  assert.match(r.body.toString(), /<section id="splash"[^>]*aria-label="Little Learners"/);
  assert.match(r.body.toString(), /class="splash-logo" src="mascot\.svg"/);
  assert.match(r.body.toString(), /rel="icon" href="mascot\.svg"/);
  assert.match(r.body.toString(), /class="splash-tagline">LEARN[\s\S]*?PLAY[\s\S]*?GROW<\/p>/);
  assert.match(r.body.toString(), /class="app-brand"><strong>Little Learners<\/strong><small>LEARN • PLAY • GROW<\/small>/);
  assert.match(r.body.toString(), /id="welcome-login"[^>]*>Log in/);
  assert.match(r.body.toString(), /id="welcome-signup"[^>]*>Create account/);
  assert.match(r.body.toString(), /id="welcome-guest"[^>]*>Continue as a guest/);
  assert.ok(r.body.toString().indexOf('id="splash"') < r.body.toString().indexOf('id="language"'));
  assert.ok(r.body.toString().indexOf('id="splash"') < r.body.toString().indexOf('id="auth-login"'));
  assert.ok(r.body.toString().indexOf('id="splash"') < r.body.toString().indexOf('id="auth-signup"'));
  assert.ok(r.body.toString().indexOf('id="auth-signup"') < r.body.toString().indexOf('id="app-tour"'));
  assert.ok(r.body.toString().indexOf('id="app-tour"') < r.body.toString().indexOf('id="language"'));
  assert.match(r.body.toString(), /id="app-tour-skip">Skip tour/);
  assert.match(r.body.toString(), /id="app-tour-continue"/);
  assert.ok(r.body.toString().indexOf('id="language"') < r.body.toString().indexOf('id="english-types"'));
  assert.match(r.body.toString(), /id="auth-login"[^>]*hidden/);
  assert.match(r.body.toString(), /id="auth-signup"[^>]*hidden/);
  assert.match(r.body.toString(), /id="auth-signup-first-name"[^>]*autocomplete="given-name"/);
  assert.match(r.body.toString(), /id="auth-login-form"/);
  assert.match(r.body.toString(), /id="auth-signup-form"/);
  assert.match(r.body.toString(), /id="auth-signup-confirmation"[^>]*hidden/);
  assert.match(r.body.toString(), /id="auth-signup-confirmation-email"/);
  assert.match(r.body.toString(), /id="auth-signup-confirmation-resend"/);
  assert.match(r.body.toString(), /id="auth-signup-confirmation-login"/);
  assert.doesNotMatch(r.body.toString(), /id="name"|id="nm"/);
  assert.match(r.body.toString(), /class="learning-mascot"[^>]*aria-hidden="true"/);
  assert.match(r.body.toString(), /class="learning-mascot"[^>]*><img src="mascot\.svg"/);
  assert.match(r.body.toString(), /data-language="English"/);
  assert.match(r.body.toString(), /data-language="Telugu"/);
  assert.match(r.body.toString(), /data-language="Hindi"/);
  assert.match(r.body.toString(), /id="listen-options"[^>]*>🔊 Hear options/);
  assert.match(r.body.toString(), /What would you like to learn\?/);
  assert.match(r.body.toString(), /id="math-entry"/);
  assert.match(r.body.toString(), /class="choice-icon" aria-hidden="true">🧮<\/span><span class="choice-label">Maths/);
  assert.equal((r.body.toString().match(/class="choice-card/g) || []).length, 29);
  for (const topic of ['Addition', 'Multiplication', 'Subtraction', 'Division']) {
    assert.match(r.body.toString(), new RegExp(`data-math-topic="${topic}"`));
  }
  assert.match(r.body.toString(), /id="numbers-entry"/);
  assert.match(r.body.toString(), /id="roman-entry"/);
});

test('sketch practice includes the demo, open picture choices, and painting tools', async () => {
  const [homeResponse, appResponse] = await Promise.all([get('/'), get('/app.js')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  assert.match(html, /id="english-sketch-entry"[^>]*>[\s\S]*?Sketch the diagram/);
  assert.match(html, /id="sketch-demo-canvas"/);
  assert.match(html, /id="sketch-demo-start"/);
  assert.doesNotMatch(html, /id="sketch-level-grid"/);
  assert.match(html, /Choose any picture group to start sketching/);
  assert.match(html, /All original and open-license coloring pictures are ready to choose/);
  assert.match(html, /id="sketch-category-grid"/);
  assert.match(html, /id="sketch-more-grid"/);
  assert.match(html, /id="sketch-picture-grid"/);
  assert.match(html, /id="sketch-practice-canvas"/);
  assert.match(html, /id="sketch-reference-canvas"/);
  assert.match(html, /id="sketch-mix-button"/);
  for (const category of ['Alphabets', 'Numbers', 'Vegetables', 'Fruits', 'Cartoon pictures', 'Animals', 'Game equipment']) {
    assert.ok(script.includes(`name:"${category}"`), `missing sketch category: ${category}`);
  }
  assert.match(script, /\$\("sketch-practice-entry"\)\.onclick=showSketchCategories/);
  assert.match(script, /\$\("sketch-categories-back"\)\.onclick=showSketchHome/);
  assert.match(script, /\$\("sketch-celebration-next"\)\.onclick=showSketchCategories/);
  assert.match(script, /function paintSketchArtworkBrush\(x,y,event\)/);
  assert.match(script, /function hasSketchArtworkLineNearby\(x,y\)/);
  assert.match(script, /const context=sketchArtworkBrushOverlay\.getContext\("2d"\)/);
  assert.match(script, /canvas\.dataset\.brushX===""\?NaN:Number\(canvas\.dataset\.brushX\)/);
  assert.match(script, /globalCompositeOperation="multiply"/);
  assert.match(script, /drag or tap to paint the picture\. The original line art stays on top/);
  assert.match(script, /sketch-completed-canvas/);
  assert.match(script, /context\.setTransform\(context\.canvas\.width\/900,0,0,context\.canvas\.height\/600,0,0\)/);
  assert.match(script, /function mixSketchColors\(\)/);
  assert.match(script, /function showSketchMore\(\)/);
  assert.match(script, /data-sketch-more/);
  assert.match(script, /SKETCH_MORE_ITEMS\.map\(\(item,index\)=>`<button class="sketch-option-card sketch-more-card" type="button" data-sketch-more-item="\$\{index\}"/);
  assert.doesNotMatch(script, /sketchUnlockedLevel|sketchLevelPage|sketchLevel=|Unlock at level|sketch-level-grid/);
  assert.match(script, /\[\.\.\."ABCDEFGHIJKLMNOPQRSTUVWXYZ"\]/);
  assert.match(script, /\[\.\.\."0123456789"\]/);
  for (const drawing of ['Mushroom', 'Lemon', 'Blueberry', 'Coconut', 'Rocket', 'Rainbow', 'Snail', 'Whale', 'Owl', 'Penguin', 'Frisbee', 'Skateboard']) {
    assert.ok(script.includes(`name:"${drawing}"`), `missing sketch drawing: ${drawing}`);
  }
  assert.ok(script.includes('name:"Girl in a sweater"'), 'missing attached-image coloring page');
  for (const drawing of ['Princess and Prince', 'Chef', 'Cat', 'Simple Flower', 'Teddy Bear', 'Sea Turtle', 'Rose', 'Friendly Dragon']) {
    assert.ok(script.includes(`name:"${drawing}"`), `missing open-license sketch drawing: ${drawing}`);
  }
  assert.match(script, /artwork:"images\/sketch\/reference-pages\.jpg"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/princess-prince\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/chef\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/cat-coloring\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/simple-flower-bw\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/teddy-bear-outline\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/rose-outline\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/sea-turtle\.png"/);
  assert.match(script, /artwork:"images\/sketch\/open-license\/dragon\.png"/);
  assert.match(script, /Math\.round\(width\*\(item\.artworkHeight\/item\.artworkWidth\)\)/);
  assert.doesNotMatch(script, /artwork:"[^"]+\.svg"/);
  assert.match(script, /class="sketch-option-art"/);
  assert.match(script, /has-portrait-art/);
  assert.match(script, /sketch-celebration-greeting/);
  assert.match(script, /pauseAfter:550/);
  assert.match(html, /id="sketch-celebration"/);
  assert.match(html, /id="sketch-completed-canvas"/);
  assert.match(html, /id="sketch-spelling"/);
});

test('Little Learners branding is used by the PWA manifest and launch mascot', async () => {
  const [manifestResponse, mascotResponse] = await Promise.all([get('/manifest.webmanifest'), get('/mascot.svg')]);
  const manifest = JSON.parse(manifestResponse.body.toString());
  assert.equal(manifest.name, 'Little Learners - Learn, Play, Grow');
  assert.equal(manifest.short_name, 'Little Learners');
  assert.equal(manifest.icons[0].src, 'mascot.svg');
  assert.equal(mascotResponse.status, 200);
  assert.match(mascotResponse.body.toString(), /A cheerful panda and a little girl sit together on a giant pencil and read a book/);
});

test('the attached original sketch image is bundled unchanged as JPEG', async () => {
  const response = await get('/images/sketch/reference-pages.jpg');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /image\/jpeg/);
  assert.deepEqual([...response.body.subarray(0, 3)], [0xff, 0xd8, 0xff]);
});

test('open-license sketch drawings are bundled as PNG raster images', async () => {
  for (const filename of ['princess-prince.png', 'chef.png', 'cat-coloring.png', 'simple-flower-bw.png', 'teddy-bear-outline.png', 'rose-outline.png', 'sea-turtle.png', 'dragon.png']) {
    const response = await get(`/images/sketch/open-license/${filename}`);
    assert.equal(response.status, 200, `missing sketch image: ${filename}`);
    assert.match(response.headers['content-type'], /image\/png/);
    assert.deepEqual([...response.body.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
});

test('launch offers login and signup before the app tour', async () => {
  const [appResponse, cssResponse] = await Promise.all([get('/app.js'), get('/styles.css')]);
  const script = appResponse.body.toString();
  const styles = cssResponse.body.toString();
  assert.match(script, /function startSplash\(\)/);
  assert.match(script, /\$\("welcome-login"\)\.onclick=showLogin/);
  assert.match(script, /\$\("welcome-signup"\)\.onclick=showSignup/);
  assert.match(script, /\$\("welcome-guest"\)\.onclick=continueAsGuest/);
  assert.match(script, /async function submitAccount\(mode,event\)/);
  assert.match(script, /fetch\(`\/api\/auth\/\$\{mode\}`/);
  assert.match(script, /function enterLearning\(firstName\)/);
  assert.match(script, /function continueAsGuest\(\)\{kid="friend";\$\("account-greeting"\)\.textContent="";\$\("account-logout"\)\.hidden=true;showAppTour\(\)\}/);
  assert.match(script, /\$\("auth-login-form"\)\.onsubmit=event=>submitAccount\("login",event\)/);
  assert.match(script, /\$\("auth-signup-form"\)\.onsubmit=event=>submitAccount\("signup",event\)/);
  assert.match(script, /startSplash\(\);/);
  assert.match(styles, /\.splash-logo[^}]*animation:logo-bob/);
  assert.match(styles, /@keyframes logo-bob/);
  assert.match(styles, /\.welcome-start/);
  assert.match(styles, /\.learning-mascot/);
  assert.match(styles, /@keyframes learning-mascot-float/);
  assert.match(styles, /font-family:"Trebuchet MS","Arial Rounded MT Bold","Segoe UI",sans-serif/);
  assert.match(styles, /--bg:#fff7f0/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});

test('account onboarding uses the account first name without storing credentials', async () => {
  const [homeResponse, appResponse, cssResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  const styles = cssResponse.body.toString();
  assert.ok(html.indexOf('id="auth-signup-first-name"') < html.indexOf('id="app-tour"'));
  assert.match(html, /id="auth-signup-first-name"[^>]*name="firstName"/);
  assert.match(html, /id="auth-signup-email"[^>]*type="email"/);
  assert.match(html, /id="auth-signup-password"[^>]*type="password"[^>]*minlength="10"/);
  assert.match(script, /function enterLearning\(firstName\)\{const value=String\(firstName\|\|""\)\.trim\(\)\.split\(\/\\s\+\/\)\[0\]/);
  assert.match(script, /JSON\.stringify\(values\)/);
  assert.doesNotMatch(script, /sessionStorage\.setItem\("kid"/);
  assert.match(script, /fetch\(`\/api\/auth\/\$\{mode\}`/);
  assert.match(script, /fetch\("\/api\/auth\/session"/);
  assert.match(script, /fetch\("\/api\/auth\/resend-verification"/);
  assert.match(script, /async function logoutAccount\(\)/);
  assert.match(script, /resetSignupConfirmation\(\);showLogin\(\)/);
  assert.match(script, /The account service is not running\. Start Little Learners with `npm run dev`\./);
  assert.match(styles, /\.auth-screen\{/);
  assert.match(styles, /\.auth-form input\{/);
});

test('curriculum paths separate age stages and language learning areas', async () => {
  const [homeResponse, appResponse, stylesResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  const styles = stylesResponse.body.toString();
  assert.match(html, /id="curriculum-menu"/);
  assert.match(html, /id="curriculum-lesson"/);
  assert.match(html, /data-curriculum-stage="nursery"/);
  assert.match(html, /data-curriculum-stage="lkg"/);
  assert.match(html, /id="curriculum-trace-canvas"/);
  assert.match(script, /function showCurriculumMenu\(\)/);
  assert.match(script, /function curriculumAreas\(\)/);
  assert.match(script, /function openCurriculumSection\(section\)/);
  assert.match(script, /Letters & Phonics/);
  assert.match(script, /Achulu · Telugu Vowels/);
  assert.match(script, /Hallulu · Telugu Consonants/);
  assert.match(script, /स्वर · Swar/);
  assert.match(script, /व्यंजन · Vyanjan/);
  assert.match(script, /Touch your head, then clap your hands/);
  assert.match(script, /My family/);
  assert.match(script, /function drawCurriculumTrace\(character\)/);
  assert.match(script, /selectedLanguage==="Telugu"\?loadTeluguWords:loadHindiWords/);
  assert.match(styles, /\.curriculum-stage-picker/);
  assert.match(styles, /\.curriculum-activity\{[^}]*flex:0 0 auto/);
  assert.match(styles, /\.curriculum-flashcard\{[^}]*min-height:clamp\(225px,42vh,340px\)/);
  assert.match(styles, /#curriculum-trace-canvas\{width:min\(100%,520px\);height:clamp\(90px,18vh,145px\)/);
});

test('early-years lessons include expanded picture grids, one-screen letters, and licensed animal audio', async () => {
  const [homeResponse, appResponse, stylesResponse, attributionResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css'), get('/audio/ATTRIBUTIONS.txt')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  const styles = stylesResponse.body.toString();
  const attributions = attributionResponse.body.toString();
  const vocabularySource = script.slice(script.indexOf('const CURRICULUM_VOCABULARY='), script.indexOf('const CURRICULUM_ORAL='));
  const vocabulary = vm.runInNewContext(`${vocabularySource};CURRICULUM_VOCABULARY`);
  const englishThemes = Object.fromEntries(vocabulary.English.map(theme => [theme.id, theme.items.length]));
  const audioSource = script.match(/const CURRICULUM_ANIMAL_SOUNDS=(\{[\s\S]*?\});/);
  assert.ok(audioSource, 'animal recording metadata is present');
  const animalSounds = vm.runInNewContext(`(${audioSource[1]})`);
  assert.equal(englishThemes.family, 15);
  assert.equal(englishThemes.body, 15);
  assert.equal(englishThemes.colours, 12);
  assert.equal(englishThemes.shapes, 12);
  assert.equal(englishThemes.animals, 15);
  assert.equal(Object.keys(animalSounds).length, 15);
  assert.equal(attributionResponse.status, 200);
  assert.match(attributions, /CC BY-SA 4\.0/);
  assert.match(homeResponse.headers['content-security-policy'], /media-src 'self' https:\/\/upload\.wikimedia\.org data: blob:/);
  assert.match(html, /id="curriculum-item-dialog"/);
  assert.match(html, /<span id="curriculum-item-picture" class="curriculum-item-picture" aria-hidden="true"><\/span>/);
  assert.match(html, /id="curriculum-animal-sound"/);
  assert.match(script, /function showCurriculumThemeItem\(index\)/);
  assert.match(script, /function playCurriculumAnimalSound\(name\)/);
  assert.match(script, /function quizLevelLimit\(key\)/);
  assert.match(script, /function curriculumLetterItems\(kind\)/);
  assert.match(script, /data-curriculum-letter="\$\{index\}"/);
  assert.match(script, /galleryPageSize=20/);
  assert.match(script, /class="curriculum-theme-icon" aria-hidden="true">\$\{entry\.icon\|\|"🌟"\}/);
  assert.match(script, /\$\("curriculum-item-picture"\)\.textContent=item\.icon\|\|"🌟"/);
  assert.match(script, /\$\("curriculum-stage-picker"\)\.hidden=true/);
  assert.match(styles, /\.curriculum-stage-picker\[hidden\]\{display:none\}/);
  assert.match(script, /pauseAfter:2000/);
  assert.match(script, /fallbackSpeech:\["Namaskaaram\./);
  assert.match(styles, /\.curriculum-letter-grid\{[^}]*grid-template-columns:repeat\(13,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.curriculum-theme-grid\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.curriculum-item-dialog::backdrop/);
  assert.match(styles, /\.curriculum-item-dialog:not\(\[open\]\)\{display:none\}/);
});

test('localized stories provide ten age-specific stories per genre in Telugu and Hindi', async () => {
  const [pageResponse, catalogResponse, appResponse] = await Promise.all([get('/'), get('/stories-data.js'), get('/app.js')]);
  assert.equal(pageResponse.status, 200);
  assert.equal(catalogResponse.status, 200);
  assert.match(pageResponse.body.toString(), /<script src="stories-data\.js" defer><\/script><script src="app\.js" defer>/);
  const scope = { window: {} };
  vm.runInNewContext(catalogResponse.body.toString(), scope);
  const stories = scope.window.AGE_STORY_CATALOG;
  assert.equal(stories.length, 100);
  for (const ageBand of ['early', 'older']) {
    for (const genre of ['fun', 'adventure', 'wonder', 'mythology', 'horror']) {
      const entries = stories.filter(story => story.ageBand === ageBand && story.genre === genre);
      assert.equal(entries.length, 10, `${ageBand}/${genre}`);
      assert.equal(new Set(entries.map(story => story.id)).size, 10);
      for (const story of entries) {
        for (const language of ['en', 'te', 'hi']) {
          assert.ok(story[`${language}Title`], `${story.id} ${language} title`);
          assert.ok(story[language]?.length >= 2, `${story.id} ${language} paragraphs`);
          assert.ok(story.moral[language], `${story.id} ${language} moral`);
        }
      }
    }
  }
  assert.match(appResponse.body.toString(), /storiesForCurrentLanguage\(\)/);
  assert.match(appResponse.body.toString(), /selectedLanguage==="Hindi"\?"hi":/);
});

test('English lessons filter word lengths and provide a global mute control', async () => {
  const [homeResponse, appResponse, cssResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  const styles = cssResponse.body.toString();
  assert.match(html, /id="mute-toggle"[^>]*hidden[^>]*aria-pressed="false"/);
  assert.match(html, /id="english-types"[^>]*hidden/);
  assert.match(html, /id="english-types-title">Choose the option to start learning<\/h1>/);
  assert.match(html, /id="english-types-back">← Back<\/button>/);
  assert.match(html, /id="english-identify-levels-back">← Back<\/button>/);
  assert.match(html, /id="english-identify-quit">← Back<\/button>/);
  assert.match(html, /id="english-alphabets-back">← Back<\/button>/);
  assert.match(html, /id="english-lesson-back">← Back<\/button>/);
  assert.match(html, /id="name-back"[^>]*>← Back<\/button>/);
  assert.match(html, /Enter your name to get started/);
  assert.match(html, /id="chg"[^>]*>← Back<\/button>/);
  assert.match(html, /data-english-type="two"/);
  assert.match(html, /data-english-type="three"/);
  assert.match(html, /data-english-type="multi"/);
  assert.match(html, /id="english-alphabets-entry"[^>]*>.*Alphabets/s);
  assert.match(html, /id="english-deity-entry"[^>]*>.*Learn Letters: Indian Gods/s);
  assert.match(html, /id="english-warriors-entry"[^>]*>.*Epic Warriors/s);
  assert.match(html, /id="english-stories-entry"[^>]*>.*Stories/s);
  assert.match(html, /id="english-everyday-entry"[^>]*>.*Everyday Objects/s);
  assert.match(html, /id="english-everyday"[^>]*hidden/);
  assert.match(html, /id="everyday-object-image"/);
  assert.match(html, /id="everyday-hear"/);
  assert.match(html, /id="everyday-next"/);
  assert.match(html, /id="animal-trivia-entry"[^>]*>.*Animal Trivia/s);
  assert.match(html, /id="animal-trivia"[^>]*hidden/);
  assert.match(html, /id="animal-trivia-image"/);
  assert.match(html, /id="animal-trivia-hear"/);
  assert.match(html, /id="animal-trivia-next"/);
  assert.match(html, /id="food-nature-entry"[^>]*>.*Food &amp; Nature/s);
  assert.match(html, /id="food-nature"[^>]*hidden/);
  assert.match(html, /id="food-nature-image"/);
  assert.match(html, /id="food-nature-hear"/);
  assert.match(html, /id="food-nature-next"/);
  assert.match(html, /id="stories-genres"[^>]*hidden/);
  assert.match(html, /id="stories-genre-grid"[^>]*role="group"/);
  assert.match(html, /id="stories-list"[^>]*hidden/);
  assert.match(html, /id="stories-reader"[^>]*hidden/);
  assert.match(html, /id="stories-listen"/);
  assert.match(html, /id="stories-stop"/);
  assert.match(html, /id="native-stories-entry"/);
  assert.match(html, /id="english-epic-warriors"[^>]*hidden/);
  assert.match(html, /id="english-warrior-grid"[^>]*role="group"/);
  assert.match(html, /id="english-warriors-back">← Back<\/button>/);
  assert.match(html, /id="english-warrior-dialog"[^>]*aria-labelledby="english-warrior-dialog-title"/);
  assert.match(html, /id="english-warrior-dialog-image"[^>]*hidden/);
  assert.match(html, /id="english-warrior-hear"[^>]*>🔊 Hear introduction<\/button>/);
  assert.match(html, /id="english-deity-letters"[^>]*hidden/);
  assert.match(html, /id="english-deity-grid"/);
  assert.match(html, /real image of an Indian deity/);
  assert.match(html, /id="english-deity-display"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /english-deity-credit/);
  assert.match(html, /id="english-deity-hear"[^>]*>🔊 Hear name<\/button>/);
  assert.match(html, /id="english-identify-entry"[^>]*>.*Identify words/s);
  assert.match(html, /id="english-identify-levels"[^>]*hidden/);
  assert.match(html, /id="english-identify-quiz"[^>]*hidden/);
  assert.match(html, /id="english-identify-next"[^>]*disabled/);
  assert.match(html, /id="english-alphabets"[^>]*hidden/);
  assert.match(html, /id="english-alphabets-grid"/);
  assert.match(html, /id="english-alphabet-display"/);
  assert.match(html, /id="english-alphabet"/);
  assert.match(html, /id="english-word-list"/);
  assert.match(script, /function setMuted\(value\)/);
  assert.match(script, /function englishWordsForLetter\(character\)/);
  assert.match(script, /word\.length===3/);
  assert.match(script, /word\.replace\(\/\[\^a-z\]\/gi,""\)\.length>=4/);
  assert.match(script, /function showEnglishLesson\(type\)/);
  assert.match(script, /\$\("chg"\)\.onclick=\(\)=>\{stopSpeech\(\);/);
  assert.match(script, /\$\("addition-level-back-title"\)\.textContent="← Back"/);
  assert.match(script, /\$\("addition-menu-back"\)\.textContent="← Back"/);
  assert.match(script, /function showEnglishAlphabets\(\)/);
  assert.match(script, /const EVERYDAY_OBJECTS=\[/);
  const everydayData = script.split('const EVERYDAY_OBJECTS=[')[1].split('const EVERYDAY_LESSONS=')[0];
  assert.match(everydayData, /name:"Milk".*facts:\[\["Milk is white\.","white"\]/);
  assert.match(everydayData, /name:"The sky".*The sky is blue on a clear day/);
  assert.match(everydayData, /name:"The sun".*The sun is bright and warm/);
  assert.equal((everydayData.match(/\["[^"]+","[^"]+"\]/g) || []).length, 50);
  assert.doesNotMatch(everydayData, /\.svg/i);
  assert.match(script, /function renderHighlightedText\(element,text,highlight\)/);
  assert.match(script, /function showEverydayObjects\(\)/);
  assert.match(script, /function hearEverydayObject\(\)/);
  assert.match(script, /function moveEverydayObject\(direction\)/);
  assert.match(script, /\$\("english-everyday-entry"\)\.onclick=showEverydayObjects/);
  assert.match(script, /\$\("everyday-next"\)\.onclick=\(\)=>moveEverydayObject\(1\)/);
  assert.match(script, /const ANIMAL_TRIVIA=\[/);
  const animalTriviaData = script.split('const ANIMAL_TRIVIA=[')[1].split('const ANIMAL_TRIVIA_LESSONS=')[0];
  assert.equal((animalTriviaData.match(/\["[^"]+","[^"]+"\]/g) || []).length, 50);
  assert.doesNotMatch(animalTriviaData, /\.svg/i);
  assert.match(animalTriviaData, /The king of the jungle is the lion/);
  assert.match(animalTriviaData, /The tallest animal is the giraffe/);
  assert.match(animalTriviaData, /The bird that cannot fly is the ostrich/);
  assert.match(script, /function showAnimalTrivia\(\)/);
  assert.match(script, /function hearAnimalTrivia\(\)/);
  assert.match(script, /function moveAnimalTrivia\(direction\)/);
  assert.match(script, /\$\("animal-trivia-entry"\)\.onclick=showAnimalTrivia/);
  assert.match(script, /\$\("animal-trivia-next"\)\.onclick=\(\)=>moveAnimalTrivia\(1\)/);
  assert.match(script, /const FOOD_NATURE=\[/);
  const foodNatureData = script.split('const FOOD_NATURE=[')[1].split('const FOOD_NATURE_LESSONS=')[0];
  assert.equal((foodNatureData.match(/\["[^"]+","[^"]+"\]/g) || []).length, 50);
  assert.match(foodNatureData, /Bees make honey/);
  assert.match(foodNatureData, /Plants need water and sunlight to grow/);
  assert.doesNotMatch(foodNatureData, /\.svg/i);
  assert.match(foodNatureData, /name:"Plants",photo:FOOD_NATURE_IMAGES\.plant/);
  assert.match(foodNatureData, /name:"Seeds",photo:FOOD_NATURE_IMAGES\.seeds/);
  assert.match(foodNatureData, /name:"The garden",photo:FOOD_NATURE_IMAGES\.garden/);
  assert.match(foodNatureData, /name:"The seasons",photo:FOOD_NATURE_IMAGES\.seasons/);
  assert.match(foodNatureData, /name:"Rain",photo:FOOD_NATURE_IMAGES\.rain/);
  assert.match(foodNatureData, /name:"Water",photo:FOOD_NATURE_IMAGES\.water/);
  assert.match(script, /plant:\{image:"https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\/7\/75\/Sunflower_seedlings\.jpg/);
  assert.match(script, /seeds:\{image:"https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\/3\/39\/Sunflower_Seeds_Kaldari\.jpg/);
  assert.match(script, /seasons:\{image:"https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\/0\/04\/Four_seasons\.jpg/);
  assert.match(script, /function showFoodNature\(\)/);
  assert.match(script, /function hearFoodNature\(\)/);
  assert.match(script, /function moveFoodNature\(direction\)/);
  assert.match(script, /\$\("food-nature-entry"\)\.onclick=showFoodNature/);
  assert.match(script, /\$\("food-nature-next"\)\.onclick=\(\)=>moveFoodNature\(1\)/);
  assert.match(styles, /@keyframes everyday-object-float/);
  assert.match(script, /const EPIC_WARRIORS=\{/);
  assert.match(script, /A:\{name:"Arjuna",image:"arjuna"/);
  assert.match(script, /H:\{name:"Hidimba"/);
  assert.match(script, /function showEnglishEpicWarriors\(\)/);
  assert.match(script, /function showEnglishEpicWarrior\(character\)/);
  assert.match(script, /function sayEnglishEpicWarriorIntroduction\(\)/);
  assert.match(script, /english-warriors-entry"\)\.onclick=showEnglishEpicWarriors/);
  assert.match(script, /english-warriors-back"\)\.onclick=\(\)=>\{closeEnglishEpicWarrior\(\);showEnglishTypes\(\)\}/);
  assert.match(script, /"english-epic-warriors"/);
  assert.match(script, /EPIC_WARRIOR_IMAGES=\{/);
  assert.match(script, /src:"images\/epic-warriors\/arjuna\.jpg"/);
  assert.match(script, /const INDIAN_DEITY_LETTERS=\{/);
  assert.match(script, /const INDIAN_DEITY_IMAGES=\{/);
  assert.match(script, /class="english-deity-photo" src="\$\{image\.src\}" alt="\$\{image\.alt\}"/);
  assert.doesNotMatch(script, /english-deity-credit/);
  assert.match(script, /animal trivia, food and nature, Indian deity names, epic warrior names, stories, identify words/);
  assert.match(script, /const STORY_GENRES=\[/);
  assert.match(script, /const CHILDREN_STORIES=\[/);
  assert.match(script, /function showStories\(\)/);
  assert.match(script, /function showStoryList\(genreId\)/);
  assert.match(script, /function showStory\(storyId\)/);
  assert.match(script, /preferredVoiceNames:\["Priya","Suhani"\],rate:ageProfile\(\)\.storyRate/);
  assert.match(script, /preferredNames\.map\(name=>matching\.find\(voice=>voice\.name\.toLowerCase\(\)\.includes\(name\.toLowerCase\(\)\)\)\)/);
  assert.match(script, /requiredVoice:native/);
  assert.match(script, /const STORY_MORALS=\{/);
  assert.match(home.body.toString(), /id="stories-reader-moral"/);
  assert.match(home.body.toString(), /id="stories-reader-moral-text"/);
  const storyData = app.body.toString().split('const CHILDREN_STORIES=[')[1].split('const STORY_MORALS=')[0];
  assert.equal((storyData.match(/\{id:"[^"]+",genre:"/g) || []).length, 15);
  assert.match(home.body.toString(), /Moral of the story/);
  assert.match(script, /function showAppTour\(\)/);
  assert.match(script, /\$\("app-tour-skip"\)\.onclick=leaveAppTour/);
  assert.match(script, /\$\("app-tour-continue"\)\.onclick=leaveAppTour/);
  assert.match(script, /function leaveAppTour\(\).*showLanguage\(\)/);
  const storyStyles = await get('/styles.css');
  assert.match(storyStyles.body.toString(), /\.stories-reader-controls \.stories-listen\{[^}]*color:#fff/);
  assert.match(storyStyles.body.toString(), /\.stories-reader-controls \.stories-stop\{[^}]*color:#fff/);
  assert.match(script, /\$\("english-stories-entry"\)\.onclick=showStories/);
  assert.match(script, /\$\("native-stories-entry"\)\.onclick=showStories/);
  assert.match(script, /function showEnglishDeityLetters\(\)/);
  assert.match(script, /function showEnglishDeityLetter\(character\)/);
  assert.match(script, /function sayEnglishDeityLetter\(\)/);
  assert.match(script, /english-deity-entry"\)\.onclick=showEnglishDeityLetters/);
  assert.match(script, /english-deity-hear"\)\.onclick=sayEnglishDeityLetter/);
  assert.match(script, /function showEnglishAlphabet\(character\)/);
  assert.match(script, /function englishAlphabetWords\(character\)/);
  assert.match(script, /const\[word,icon\]=englishAlphabetWords\(character\)\[0\]/);
  assert.match(script, /english-alphabets-entry"\)\.onclick=showEnglishAlphabets/);
  assert.match(script, /const IDENTIFY_STARTER_WORDS=\["banana","dog","cat","apple"/);
  assert.match(script, /function renderEnglishIdentifyLevels\(\)/);
  assert.match(script, /const pool=isEarlyLearner\(\)\?IDENTIFY_EARLY_WORDS:IDENTIFY_QUESTION_WORDS/);
  assert.match(script, /Array\.from\(\{length:visibleCount\},\(_,index\)=>\{const level=start\+index,locked=level>unlocked/);
  assert.match(script, /identifyUnlockedLevel\+\+;saveIdentifyProgress\(\)/);
  assert.match(script, /function identifyQuestionFor\(level,questionIndex\)/);
  assert.match(script, /usedIcons=new Set\(\[target\.icon\]\)/);
  assert.match(script, /function chooseEnglishIdentifyOption\(button,option\)/);
  assert.match(script, /identifyQuestionIndex<9/);
  assert.match(script, /english-identify-next-page"\)\.disabled=unlocked<=end/);
  assert.match(script, /selectedLanguage==="English"\)\{showEnglishTypes\(\);return\}/);
  assert.match(script, /if\(muted\)return/);
  assert.match(script, /function pick\(language="en-IN"/);
  assert.match(script, /typeof item==="string"\?"en-IN":item\.lang/);
  assert.match(script, /u\.lang=language/);
  assert.match(script, /pauseAfter:700/);
  assert.match(script, /\$\("mute-toggle"\)\.hidden=false/);
  assert.match(styles, /\.mute-toggle\{position:fixed/);
  assert.match(styles, /\.english-alphabet\{display:grid/);
  assert.match(styles, /\.english-word-card\{min-height:100px/);
  assert.match(styles, /\.english-types-screen\{justify-content:flex-start/);
  assert.match(styles, /\.english-type-options\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media \(max-width:680px\)\{\.english-type-options\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.alphabet-display-card\{[^}]*animation:alphabet-arrive/);
  assert.match(styles, /\.english-alphabets-grid\{display:grid/);
  assert.match(styles, /\.english-warrior-grid\{[^}]*display:grid/);
  assert.match(styles, /\.english-warrior-dialog::backdrop/);
  assert.match(styles, /@keyframes alphabet-arrive/);
  assert.match(styles, /\.english-identify-options\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.english-identify-option\.is-correct/);
});

test('deity image credits are bundled separately from the activity UI', async () => {
  const r = await get('/images/indian-deities/ATTRIBUTIONS.txt');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/plain/);
  assert.match(r.body.toString(), /CC BY-SA 4\.0/);
  assert.match(r.body.toString(), /https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
});

test('epic warrior images and their licenses are bundled outside the activity UI', async () => {
  const [home, attributions, arjuna, tataka] = await Promise.all([
    get('/'), get('/images/epic-warriors/ATTRIBUTIONS.txt'),
    get('/images/epic-warriors/arjuna.jpg'), get('/images/epic-warriors/tataka.png')
  ]);
  assert.equal(attributions.status, 200);
  assert.match(attributions.body.toString(), /CC BY-SA 4\.0/);
  assert.match(attributions.body.toString(), /https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(attributions.body.toString(), /Arjun hits the target/);
  assert.equal(arjuna.status, 200);
  assert.match(arjuna.headers['content-type'], /image\/jpeg/);
  assert.ok(arjuna.body.length > 1000);
  assert.equal(tataka.status, 200);
  assert.match(tataka.headers['content-type'], /image\/png/);
  assert.doesNotMatch(home.body.toString(), /commons\.wikimedia\.org|creativecommons\.org/);
});

test('English and Telugu story worlds include animated narration and licensed laughter without captions', async () => {
  const [home, app, stylesResponse, attributionResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css'), get('/audio/ATTRIBUTIONS.txt')]);
  const html = home.body.toString();
  const script = app.body.toString();
  const styles = stylesResponse.body.toString();
  const attributions = attributionResponse.body.toString();
  assert.match(html, /id="english-stories-entry"/);
  assert.match(html, /id="native-stories-entry"/);
  assert.match(html, /id="stories-video-stage"[^>]*hidden[^>]*role="region"/);
  assert.match(html, /id="stories-video-caption" hidden/);
  assert.doesNotMatch(styles, /stories-video-caption/);
  assert.match(styles, /\.stories-genre-card\{[^}]*min-height:clamp\(128px,22vh,158px\)/);
  assert.match(styles, /@media \(max-width:640px\)\{\.stories-genre-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(styles, /\.stories-video-stage\.is-playing \.stories-video-character/);
  assert.match(styles, /\.stories-video-stage\.is-playing\[data-action="laugh"\]/);
  assert.match(styles, /\.stories-video-stage\.is-playing>img\{animation:story-scene-drift/);
  assert.match(script, /const ENGLISH_FUN_STORY_SCENES=\{/);
  assert.match(script, /"mango-feast":\[/);
  assert.match(script, /"ticklish-crown":\[/);
  assert.match(script, /"lantern-lunch":\[/);
  assert.match(script, /laugh:true/);
  assert.match(script, /const ENGLISH_STORY_CHARACTER_VOICES=\{prince:\{pitch:1\.2/);
  assert.match(script, /function englishFunStoryScene\(story\)/);
  assert.match(script, /animatedEnglishStory=.*pick\(language,false,\["Zira","Heera"/);
  assert.match(script, /function stopStoryLaugh\(\)/);
  assert.match(script, /Four_Years_Old_child_laughing\.ogg/);
  assert.match(script, /currentStoryLaughText=null;playStoryLaugh\(continueSpeech\)/);
  assert.match(script, /animatedEnglishStory=!?\$\("stories-video-stage"\)\.hidden/);
  assert.doesNotMatch(script, /Ha,\s*ha,\s*ha|Hee,\s*hee/i);
  assert.match(attributions, /Artist: morgantj[\s\S]*Creative Commons Attribution 3\.0[\s\S]*Four_Years_Old_child_laughing\.ogg/);
  assert.match(script, /storiesForCurrentLanguage\(\)\.find\(entry=>entry\.id===currentStoryId\)/);
  const funStorySource = script.slice(script.indexOf('const CHILDREN_STORIES=') + 'const CHILDREN_STORIES='.length, script.indexOf('const STORY_MORALS=')).trim().replace(/;\s*$/, '');
  const funScenesSource = script.match(/const ENGLISH_FUN_STORY_SCENES=(\{[\s\S]*?\n\});/);
  assert.ok(funScenesSource, 'animated scene data is present');
  const englishStories = vm.runInNewContext(funStorySource);
  const funScenes = vm.runInNewContext(`(${funScenesSource[1]})`);
  const funStoryIds = englishStories.filter(story => story.genre === 'fun').map(story => story.id).sort();
  assert.equal(JSON.stringify(Object.keys(funScenes).sort()), JSON.stringify(funStoryIds));
  assert.ok(Object.values(funScenes).flat().some(scene => scene.lines.some(line => line.laugh && line.text && !/ha|hee/i.test(line.text))));
  for (const genre of ['fun', 'adventure', 'wonder', 'mythology', 'horror']) {
    assert.match(app.body.toString(), new RegExp(`id:"${genre}"`));
    const image = await get(`/images/stories/${genre}.svg`);
    assert.equal(image.status, 200, `${genre} story illustration should be bundled`);
    assert.match(image.headers['content-type'], /image\/svg\+xml/);
    assert.match(image.body.toString(), /<svg[\s\S]*<title/);
    assert.match(image.body.toString(), /<desc/);
  }
  assert.match(script, /teTitle:/);
  assert.match(script, /storyRate:\.86/);
  assert.match(script, /requiredVoice:native/);
  assert.match(script, /is-speaking/);
});

test('app asks before showing device-specific guidance for unavailable speech voices', async () => {
  const [homeResponse, appResponse, cssResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  const styles = cssResponse.body.toString();
  assert.match(html, /id="voice-setup-dialog"[^>]*aria-labelledby="voice-setup-title"/);
  assert.match(html, /id="voice-setup-show">Show setup instructions/);
  assert.match(html, /id="voice-setup-skip">Continue with available voices/);
  assert.match(html, /id="voice-setup-recheck">Check voices again/);
  assert.match(script, /function missingSpeechLocales\(voices=\[\]\)/);
  assert.match(script, /\["te-IN","Telugu \(India\)"\],\["hi-IN","Hindi \(India\)"\],\["en-IN","English \(India\)"\]/);
  assert.match(script, /function voiceSetupInstructions\(\)/);
  assert.match(script, /Settings → Accessibility → Spoken Content → Voices/);
  assert.match(script, /Settings → Accessibility → Text-to-speech output/);
  assert.match(script, /Settings → Time & language → Language & region/);
  assert.match(script, /function checkSpeechVoices\(\)/);
  assert.match(script, /voiceSetupPromptShown=true;\$\("voice-setup-missing"\)/);
  assert.match(styles, /\.voice-setup-dialog::backdrop/);
});

test('Maths menu offers a learning or questionaries path for every operation', async () => {
  const [homeResponse, appResponse] = await Promise.all([get('/'), get('/app.js')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  assert.match(html, /id="math-menu"[^>]*hidden/);
  assert.match(html, /id="numbers-entry"[^>]*>.*Numbers/s);
  assert.match(html, /id="roman-entry"[^>]*>.*Roman Numbers/s);
  assert.match(html, /id="math-counting-screen"[^>]*hidden/);
  assert.match(html, /id="math-counting-keyboard"[^>]*role="group"/);
  assert.match(html, /id="math-counting-previous"/);
  assert.match(html, /id="math-counting-next"/);
  assert.match(html, /id="math-counting-display"/);
  assert.match(html, /id="math-mode-screen"[^>]*hidden/);
  assert.match(html, /id="math-learning-entry"[^>]*>.*Learning/s);
  assert.match(html, /id="math-questions-entry"[^>]*>.*Questionaries/s);
  assert.match(html, /id="addition-level-screen"[^>]*hidden/);
  assert.match(html, /id="addition-screen"[^>]*hidden/);
  assert.match(html, /data-math-topic="Subtraction"/);
  assert.match(html, /data-math-topic="Multiplication"/);
  assert.match(html, /data-math-topic="Division"/);
  assert.match((await get('/styles.css')).body.toString(), /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match((await get('/styles.css')).body.toString(), /\.choice-card\{display:flex;flex-direction:column/);
  assert.match((await get('/styles.css')).body.toString(), /\.math-counting-keyboard\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match((await get('/styles.css')).body.toString(), /\.math-counting-digit\{[^}]*font-size:clamp\(4\.5rem,23vmin,11rem\)/);
  assert.match((await get('/styles.css')).body.toString(), /\.math-counting-display\.is-number \.math-counting-digit\{[^}]*background:linear-gradient/);
  assert.match((await get('/styles.css')).body.toString(), /@keyframes counting-result-arrive/);
  assert.match(script, /function showMathMenu\(\)/);
  assert.match(script, /function numberName\(value\)/);
  assert.match(script, /function threeDigitName\(value\)/);
  assert.match(script, /function romanNumber\(value\)/);
  assert.match(script, /NUMBER_SCALES=\["","thousand","million","billion"/);
  assert.match(script, /count=value<=10n\?Number\(value\):0/);
  assert.match(script, /Count icons are shown for numbers 1–10/);
  assert.match(script, /say\(roman\?\[name\]/);
  assert.match(script, /function showCountingScreen\(kind\)/);
  assert.match(script, /function renderCountingPage\(\)/);
  assert.match(script, /function showCountingNumber\(value\)/);
  assert.match(script, /pageSize=BigInt\(ageProfile\(\)\.countingPageSize\)/);
  assert.match(script, /length:Number\(pageSize\)/);
  assert.match(script, /\$\("math-counting-next"\)\.onclick=\(\)=>\{stopSpeech\(\);countingPage\+\+/);
  assert.match(script, /\$\("numbers-entry"\)\.onclick=\(\)=>showCountingScreen\("number"\)/);
  assert.match(script, /\$\("roman-entry"\)\.onclick=\(\)=>showCountingScreen\("roman"\)/);
  assert.match(script, /function showMathTopic\(event\)/);
  assert.match(script, /mathTopic=event\.currentTarget\.dataset\.mathTopic;showMathMode\(\)/);
  assert.match(script, /function showMathMode\(\)/);
  assert.match(script, /function startMathLearning\(\)/);
  assert.match(script, /function startMathQuestions\(\)/);
  assert.match(script, /function mathOperation\(\)/);
  assert.match(script, /function showAdditionLevels\(\)/);
  assert.match(script, /Choose your \$\{mathTopic\} Level/);
  assert.match(script, /Choose a \$\{mathTopic\.toLowerCase\(\)\} level/);
  assert.match(script, /\$\("addition-levels-back"\)\.onclick=\(\)=>\{stopSpeech\(\);showMathMode\(\)\}/);
  assert.match(script, /\$\("math-language-back"\)\.onclick=showLanguage/);
});

test('Addition opens an interactive visual lesson with voice and answer feedback', async () => {
  const [homeResponse, appResponse, cssResponse] = await Promise.all([get('/'), get('/app.js'), get('/styles.css')]);
  const html = homeResponse.body.toString();
  const script = appResponse.body.toString();
  const styles = cssResponse.body.toString();
  assert.match(html, /id="addition-level-title">Choose your Maths Level/);
  assert.match(html, /id="math-learning-entry"/);
  assert.match(html, /id="math-questions-entry"/);
  assert.match(html, /id="addition-level-icon"/);
  assert.match(html, /id="addition-level-intro"/);
  assert.match(html, /id="addition-level-options"[^>]*role="group" aria-label="Choose a level"/);
  assert.match(html, /id="addition-level-hear"/);
  assert.match(html, /id="addition-level-previous"/);
  assert.match(html, /id="addition-level-next"/);
  assert.match(html, /id="addition-level-page-label"/);
  assert.match(html, /id="addition-title">Addition Adventure/);
  assert.match(html, /id="addition-builder"[^>]*aria-label="Choose how many objects in each group"/);
  assert.match(html, /id="addition-first-number-grid"[^>]*role="group"/);
  assert.match(html, /id="addition-second-number-grid"[^>]*role="group"/);
  assert.match(html, /id="addition-second-hint" hidden>Choose a group count that divides the total evenly\./);
  assert.match(html, /id="addition-first-next"[^>]*>Next 15/);
  assert.match(html, /id="addition-second-next"[^>]*>Next 15/);
  assert.match(html, /id="addition-choose-numbers"[^>]*hidden>Choose different numbers/);
  assert.match(html, /id="addition-board"/);
  assert.match(html, /id="addition-status"[^>]*aria-live="polite"/);
  assert.match(html, /id="addition-practice"[^>]*>Try a question/);
  assert.match(html, /id="addition-word-problem"[^>]*hidden/);
  assert.match(html, /id="addition-hear"/);
  assert.match(html, /id="addition-answers"[^>]*role="group"/);
  assert.match(html, /id="addition-next"[^>]*hidden/);
  assert.match(script, /function renderAdditionQuestion\(beginner=false\)/);
  assert.match(script, /function mathAnswer\(first,second\)/);
  assert.match(script, /function mathSecondNumberMaximum\(\)/);
  assert.match(script, /function isValidDivisionGroupCount\(value,total=additionFirst\)/);
  assert.match(script, /mathTopic==="Division"&&!isValidDivisionGroupCount\(value\)/);
  assert.match(script, /You chose \$\{additionFirst\} objects to share\. Now choose how many equal groups\./);
  assert.match(script, /const operation=mathOperation\(\),first=additionFirst,second=additionSecond,answer=mathTopic==="Division"\?first\/second:mathAnswer\(first,second\)/);
  assert.match(script, /mathTopic==="Subtraction"\)\{second=Math\.floor\(Math\.random\(\)\*\(first\+1\)\)\}/);
  assert.match(script, /mathTopic==="Multiplication"\)\{second=1\+Math\.floor\(Math\.random\(\)\*\(isEarlyLearner\(\)\?mathFactorLimitForLevel\(additionLevel\):10\)\)\}/);
  assert.match(script, /mathTopic==="Division"\)\{second=1\+Math\.floor\(Math\.random\(\)\*\(isEarlyLearner\(\)\?mathFactorLimitForLevel\(additionLevel\):10\)\);answer=first;first=answer\*second\}/);
  assert.match(script, /function showAdditionQuestions\(\)/);
  assert.match(script, /if\(beginner\)\{if\(mathTopic==="Addition"\)\{first=1;second=1\}else if\(mathTopic==="Subtraction"\)\{first=2;second=1\}else if\(mathTopic==="Multiplication"\)\{first=1;second=1\}else\{first=2;second=1;answer=2\}\}/);
  assert.match(script, /function animateAdditionResult\(first,second,answer,objects\)/);
  assert.match(script, /say\(\[message\],startAnimation\)/);
  assert.match(script, /function updateAdditionTotal\(count,objects\)/);
  assert.match(script, /Math\.min\(count,20\)/);
  assert.match(script, /function speakStoryExplanation\(details\)/);
  assert.match(script, /groups\[groupIndex\]\.classList\.add\("is-speaking"\)/);
  assert.match(script, /class="math-story-addition"/);
  assert.match(html, /id="math-story-explanation-previous"[^>]*disabled>← Previous step/);
  assert.match(html, /id="math-story-explanation-next"[^>]*>Next step/);
  assert.match(script, /function navigateStoryExplanation\(direction\)/);
  assert.match(script, /speakStoryExplanation\(null,nextStep,false\)/);
  assert.match(script, /\$\("math-story-explanation-next"\)\.onclick=\(\)=>navigateStoryExplanation\(1\)/);
  assert.match(script, /\$\("math-learning-entry"\)\.onclick=startMathLearning/);
  assert.match(script, /\$\("math-questions-entry"\)\.onclick=startMathQuestions/);
  assert.match(script, /Share \$\{first\} \$\{firstName\} equally into \$\{second\} \$\{second===1\?"group":"groups"\}/);
  assert.match(script, /There are \$\{first\} \$\{first===1\?"group":"groups"\} with \$\{second\}/);
  assert.match(script, /const mathLevelPages=\{Addition:0,Subtraction:0,Multiplication:0,Division:0\}/);
  assert.match(script, /mathLevelPages\[mathTopic\]\+\+/);
  assert.match(script, /Choose your \$\{mathTopic\} level\. Levels \$\{start\} to \$\{end\}\./);
  assert.match(script, /function mathResultSpeech\(first,second,answer,objects\)/);
  assert.match(script, /You selected \$\{first\} \$\{firstName\} and \$\{second\} \$\{secondName\}\. Adding them gives \$\{answer\} \$\{answerName\}\./);
  assert.match(script, /You selected \$\{first\} \$\{firstName\} and took away \$\{second\} \$\{secondName\}\./);
  assert.match(script, /You selected \$\{first\} \$\{first===1\?"group":"groups"\} of \$\{second\} \$\{secondName\}\./);
  assert.match(script, /You selected \$\{first\} \$\{firstName\} shared into \$\{second\} equal \$\{second===1\?"group":"groups"\}\./);
  assert.match(script, /function sayAdditionLevels\(\)/);
  assert.match(script, /data-addition-level="\$\{level\}"/);
  assert.match(script, /additionLevel=Number\(button\.dataset\.additionLevel\);showAdditionQuestions\(\)/);
  assert.match(script, /\$\("addition-menu-back"\)\.onclick=\(\)=>\{stopSpeech\(\);if\(mathFlow==="learning"\)showMathMode\(\);else showAdditionLevels\(\)\}/);
  assert.match(script, /function initializeAdditionPickers\(\)/);
  assert.match(script, /function updateSecondPicker\(\)/);
  assert.match(script, /const additionLevelRange=level=>\(\{minimum:\(level-1\)\*10\+1,maximum:level\*10\}\)/);
  assert.match(script, /length:10/);
  assert.match(script, /range\.maximum-range\.minimum\+1/);
  assert.match(script, /Math\.floor\(Math\.random\(\)\*\(range\.maximum-range\.minimum\+1\)\)/);
  assert.match(script, /Math\.floor\(Math\.random\(\)\*\(additionLevelRange\(additionLevel\)\.maximum\+1\)\)/);
  assert.match(script, /function additionIcons\(emoji,count,removed=false\)/);
  assert.match(script, /function mathQuestionIcons\(objects,count,removed=false\)/);
  assert.match(script, /mathQuestionBag\("Friend gives or adding count",second,objects,\{source:true\}\)/);
  assert.match(script, /function mathVisualDivisionResult\(groups,each,objects\)/);
  assert.match(script, /const MATH_PICKER_PAGE_SIZE=15,MATH_PICKER_MAX=105/);
  assert.match(script, /function renderNumberPicker\(which\)/);
  assert.match(script, /function chooseFirstMathNumber\(value\)/);
  assert.match(script, /function chooseSecondMathNumber\(value\)/);
  assert.match(script, /function mathSecondNumberPrompt\(\)/);
  assert.match(script, /Now choose how many to add/);
  assert.match(script, /if\(additionMode==="learn"\)\{/);
  assert.match(script, /data-star-source="true"/);
  assert.match(script, /Array\.from\(\{length:count\},\(\)=>`<span class="addition-icon math-question-icon/);
  assert.match(script, /function updateAdditionBuilder\(\)/);
  assert.match(script, /function renderAdditionBoard\(first,second,objects,total\)/);
  assert.match(script, /function additionObject\(\)/);
  assert.match(script, /Here we have \$\{first\} \$\{firstName\}\. Add \$\{second\} more \$\{secondName\}\./);
  assert.match(script, /function additionSayQuestion\(\)/);
  assert.match(script, /say\(\[mathResultSpeech\(first,second,answer,objects\)\]\)/);
  assert.match(script, /u\.onstart=\(\)=>\{if\(generation!==speechGeneration\)return;begin\(\);cue\(item\)/);
  assert.match(script, /function checkAdditionAnswer\(button,value\)/);
  assert.match(script, /function showAdditionLesson\(\)/);
  assert.match(script, /additionFirst=mathTopic==="Subtraction"\?2:mathTopic==="Division"\?2:1;additionSecond=1/);
  assert.match(script, /function startMathLearning\(\)/);
  assert.match(script, /function startMathQuestions\(\)/);
  assert.match(script, /\$\("addition-next"\)\.disabled=true/);
  assert.match(script, /Wonderful!/);
  assert.match(script, /addition-next"\)\.onclick/);
  assert.match(script, /addition-practice"\)\.onclick/);
  assert.match(script, /speechSynthesis\.speak\(u\)/);
  assert.match(script, /addition-hear"\)\.textContent="🔊 Hear explanation"/);
  assert.match(styles, /\.addition-level-options\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.addition-level-pager\{/);
  assert.match(styles, /\.multiplication-groups\{/);
  assert.match(styles, /\.division-groups\{/);
  assert.match(styles, /\.addition-icon\.is-removed/);
  assert.match(styles, /\.addition-board\{/);
  assert.match(styles, /@keyframes addition-icon-arrive/);
  assert.match(styles, /@keyframes addition-icon-move/);
  assert.match(styles, /\.math-mode-options \.choice-card\{/);
  assert.match(styles, /\.addition-number-grid\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.addition-number-button\[aria-pressed="true"\]/);
  assert.match(styles, /\.addition-total-icons\{/);
  assert.match(styles, /\.addition-icons\{[^}]*font-size:clamp\(1\.3rem,5vw,2\.2rem\)/);
  assert.match(styles, /\.math-story-visual-group\.is-speaking/);
  assert.match(styles, /\.math-story-answer\.is-speaking/);
  assert.match(styles, /\.math-story-addition\{[^}]*display:flex/);
  assert.match(styles, /\.math-story-explanation-navigation\{[^}]*grid-template-columns:1fr auto 1fr/);
  assert.match(styles, /\.addition-answer\{/);
});

test('language selection options can be spoken on screen or replayed', async () => {
  const script = (await get('/app.js')).body.toString();
  assert.match(script, /function sayLanguageOptions\(\)\{say\(/);
  assert.match(script, /What would you like to learn\?/);
  assert.match(script, /"General Knowledge\."/);
  assert.match(script, /function showLanguage\(\)\{hideScreens\(\);\$\("language"\)\.hidden=false;\$\("language-age-label"\)\.textContent=`\$\{ageProfile\(\)\.label\} · \$\{ageProfile\(\)\.display\}`/);
  assert.match(script, /\$\("listen-options"\)\.onclick=sayLanguageOptions/);
});

test('General Knowledge maps all Indian states and union territories to spoken capitals', async () => {
  const html = (await get('/')).body.toString();
  const script = (await get('/app.js')).body.toString();
  const styles = (await get('/styles.css')).body.toString();
  assert.match(html, /id="general-knowledge-entry"/);
  assert.match(html, /id="state-capitals-entry"/);
  assert.match(html, /id="state-capitals-read-all"/);
  assert.match(html, /images\/india\/india-admin1\.svg/);
  const data = script.match(/const INDIA_STATE_CAPITALS=(\[[\s\S]*?\n\]);/);
  assert.ok(data, 'India state and capital data should be defined');
  const entries = vm.runInNewContext(`(${data[1]})`);
  assert.equal(entries.length, 36);
  assert.deepEqual(entries.filter(entry => entry.kind === 'State').map(entry => entry.name), [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ]);
  assert.deepEqual(entries.filter(entry => entry.kind === 'Union Territory').map(entry => entry.name), [
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ]);
  assert.ok(entries.every(entry => entry.name && entry.places.length && entry.places.every(place => Number.isFinite(place.lat) && Number.isFinite(place.lon))));
  const map = (await get('/images/india/india-admin1.svg')).body.toString();
  assert.equal((map.match(/<path /g) || []).length, 36);
  assert.match(script, /function selectIndiaStateCapital\(index\)\{showStateCapitalOnMap\(index\);/);
  assert.match(script, /onStart:\(\)=>showStateCapitalOnMap\(index\)/);
  assert.match(styles, /@media \(max-width:760px\)\{\.state-capitals-content/);
});

test('General Knowledge includes the prime ministers of India in chronological order', async () => {
  const response = await get('/');
  const html = response.body.toString();
  const script = (await get('/app.js')).body.toString();
  const data = script.match(/const INDIA_PRIME_MINISTERS=(\[[\s\S]*?\n\]);/);
  assert.ok(data, 'India prime minister data should be defined');
  const entries = vm.runInNewContext(`(${data[1]})`);
  assert.equal(entries.length, 15);
  assert.deepEqual(entries.map(entry => entry.name), [
    'Jawaharlal Nehru', 'Gulzarilal Nanda', 'Lal Bahadur Shastri', 'Indira Gandhi',
    'Morarji Desai', 'Charan Singh', 'Rajiv Gandhi', 'V. P. Singh', 'Chandra Shekhar',
    'P. V. Narasimha Rao', 'Atal Bihari Vajpayee', 'H. D. Deve Gowda', 'I. K. Gujral',
    'Manmohan Singh', 'Narendra Modi'
  ]);
  assert.ok(entries.every(entry => entry.tenure && entry.image.startsWith('https://') && entry.source.startsWith('https://commons.wikimedia.org/')));
  assert.match(entries[1].tenure, /Acting Prime Minister/);
  assert.match(entries[3].tenure, /1966–1977, 1980–1984/);
  assert.match(entries[10].tenure, /1996, 1998–2004/);
  assert.match(html, /id="prime-ministers-entry"/);
  assert.match(html, /id="prime-ministers"[^>]*hidden/);
  assert.match(html, /id="prime-minister-image"/);
  assert.match(html, /id="prime-minister-previous"/);
  assert.match(html, /id="prime-minister-next"/);
  assert.match(html, /id="india-symbols-entry"[^>]*>[\s\S]*?India &amp; National Symbols/);
  assert.match(html, /id="india-symbols"[^>]*hidden/);
  assert.match(html, /id="india-national-entry"/);
  assert.match(html, /id="india-states-entry"/);
  assert.match(html, /id="india-national-image"/);
  assert.match(html, /id="india-state-animal-image"/);
  assert.match(html, /id="india-state-bird-image"/);
  assert.match(response.headers['content-security-policy'], /img-src[^;]*https:\/\/thumb\.wikimedia\.org/);
  assert.match(script, /\$\("prime-minister-next"\)\.onclick=\(\)=>movePrimeMinister\(1\)/);
  assert.match(script, /function renderPrimeMinister\(index\)/);
  assert.match(script, /function showPrimeMinisters\(\)/);
  const nationalFacts = script.split('const INDIA_NATIONAL_INFORMATION=[')[1].split('let indiaNationalInformationIndex=')[0];
  assert.equal((nationalFacts.match(/\{name:"[^"]+",fact:"/g) || []).length, 50);
  assert.match(nationalFacts, /name:"Capital of India",fact:"New Delhi is the capital of India\."/);
  assert.match(nationalFacts, /name:"National Bird",fact:"The Indian peafowl/);
  assert.match(script, /\$\("india-symbols-entry"\)\.onclick=showIndiaNationalSymbols/);
  assert.match(script, /\$\("india-national-entry"\)\.onclick=showIndiaNationalInformation/);
  assert.match(script, /\$\("india-states-entry"\)\.onclick=showIndiaStatesInformation/);
  assert.match(script, /function showIndiaNationalSymbols\(\)/);
  assert.match(script, /function showIndiaNationalInformation\(\)/);
  assert.match(script, /function renderIndiaStateInformation\(index\)/);
  assert.match(script, /"india-symbols","india-national-information","india-states-information","stories-genres"/);
  const stateData = script.match(/const INDIA_STATE_SYMBOLS=(\[[\s\S]*?\n\])\.map\(\(\[name,capital,animal,bird,animalFile,birdFile\]\)=>/);
  assert.ok(stateData, 'India state symbols should be defined');
  const states = vm.runInNewContext(`(${stateData[1]})`);
  assert.equal(states.length, 28);
  assert.ok(states.some(([name,capital,animal,bird]) => name === 'Telangana' && capital === 'Hyderabad' && animal.includes('Spotted deer') && bird.includes('Indian roller')));
});

test('selecting a language or Maths option cancels speech, including delayed speech', async () => {
  const script = (await get('/app.js')).body.toString();
  assert.match(script, /let [^;]*speechGeneration=0/);
  assert.match(script, /function stopSpeech\(\)\{speechGeneration\+\+;pendingSpeech=null;currentStoryLaughText=null;stopStoryLaugh\(\);if\("speechSynthesis" in window\)speechSynthesis\.cancel\(\)\}/);
  assert.match(script, /generation===speechGeneration/);
  assert.match(script, /function chooseLanguage\(event\)\{stopSpeech\(\);/);
  assert.match(script, /function chooseMath\(\)\{stopSpeech\(\);showMathMenu\(\)\}/);
  assert.match(script, /\$\("math-entry"\)\.onclick=chooseMath/);
});

test('assets have the right MIME types', async () => {
  for (const [p, re] of [['/app.js', /javascript/], ['/styles.css', /css/], ['/manifest.webmanifest', /manifest\+json/],
    ['/icon-192.png', /image\/png/], ['/icon.svg', /svg/], ['/mascot.svg', /svg/],
    ['/images/india/india-admin1.svg', /image\/svg\+xml/],
    ...['agni','brahma','chandra','durga','ganesha','hanuman','indra','jagannath','lakshmi','parvati','rama','saraswati','shiva','tripura-sundari','vamana','vishnu','yama'].map(name=>[`/images/indian-deities/${name}.jpg`,/image\/jpeg/]),
    ['/images/indian-deities/krishna.png',/image\/png/]]) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers['content-type'], re, p);
  }
});

test('Telugu lesson includes character, word, English meaning, and Telugu speech', async () => {
  const [appResponse, wordsResponse, stylesResponse] = await Promise.all([get('/app.js'), get('/telugu-words.json'), get('/styles.css')]);
  const script = appResponse.body.toString();
  const words = JSON.parse(wordsResponse.body.toString());
  const styles = stylesResponse.body.toString();
  assert.equal(appResponse.status, 200);
  assert.equal(wordsResponse.status, 200);
  assert.equal(stylesResponse.status, 200);
  assert.equal(Object.keys(words).length, 51);
  for (const [character, entries] of Object.entries(words)) {
    assert.ok(entries.length >= 20);
    assert.equal(new Set(entries.map(entry => entry.word)).size, entries.length);
    for (const entry of entries) {
      assert.ok(entry.word && entry.transliteration && entry.meaning && entry.emoji);
      assert.ok(entry.transliteration.match(/^[A-Za-z ]+$/));
      assert.ok(entry.word.includes(character === 'అం' || character === 'అః' ? character.slice(-1) : character));
    }
  }
  assert.match(script, /function showTeluguLetter\(character\)/);
  assert.match(script, /teluguWordIndexes\[character\]=\(index\+1\)%wordCount/);
  assert.match(script, /Word \$\{index\+1\} of \$\{wordCount\}/);
  assert.match(script, /class="pronunciation"/);
  assert.match(script, /class="meaning"/);
  assert.match(script, /fetch\("telugu-words\.json"/);
  assert.match(script, /pick\("te-IN",false\)/);
  assert.match(script, /TELUGU_LETTER_SOUNDS/);
  assert.match(script, /letterWordPrompt\(sound,entry\.transliteration\)/);
  assert.match(script, /text:teluguVoice\?character/);
  assert.match(script, /text:teluguVoice\?entry\.word/);
  assert.match(script, /pauseAfter:850/);
  assert.match(script, /function sayLessonWelcome\(language\)/);
  assert.match(script, /Namaskaaram, \$\{kid\}! Telugu nerchukundam\./);
  assert.doesNotMatch(script, /syllabify/);
  assert.match(script, /rate=isEarlyLearner\(\) \? 0\.66 : 0\.72/);
  assert.match(script, /preferredVoiceNames:\["Priya","Suhani"\]/);
  assert.match(script, /classList\.add\("language-lesson-stage"\)/);
  assert.match(script, /classList\.remove\("language-lesson-stage"\)/);
  assert.match(styles, /#stage\.language-lesson-stage \.E\{flex:0 0 auto;font-size:clamp\(2\.8rem,17vmin,9rem\)/);
  assert.match(styles, /#stage\.language-lesson-stage \.W\{flex:0 0 auto;max-width:100%;font-size:clamp\(1\.25rem,5vmin,2\.6rem\)/);
  assert.match(styles, /@media \(max-height:560px\)\{[\s\S]*?#stage\.language-lesson-stage/);
  assert.doesNotMatch(script, /means \$\{meaning\}/);
  assert.match(script, /renderPad\(\)/);
});

test('Hindi lesson includes 20 words per character and Hindi speech', async () => {
  const [appResponse, wordsResponse] = await Promise.all([get('/app.js'), get('/hindi-words.json')]);
  const script = appResponse.body.toString();
  const words = JSON.parse(wordsResponse.body.toString());
  assert.equal(appResponse.status, 200);
  assert.equal(wordsResponse.status, 200);
  assert.equal(Object.keys(words).length, 46);
  for (const entries of Object.values(words)) {
    assert.equal(entries.length, 20);
    assert.equal(new Set(entries).size, entries.length);
  }
  assert.match(script, /function showHindiLetter\(character\)/);
  assert.match(script, /hindiWordIndexes\[character\]=\(index\+1\)%wordCount/);
  assert.match(script, /fetch\("hindi-words\.json"/);
  assert.match(script, /selectedLanguage==="Hindi"\)\{Object\.keys\(hindiWords\)\.forEach\(character=>\{/);
  assert.match(script, /pick\("hi-IN",false\)/);
  assert.match(script, /function hindiWordIcon\(word,index,group\)/);
  assert.match(script, /function hindiWordIconsForGroup\(group\)/);
  assert.match(script, /HINDI_WORD_ICON_FIXES/);
  assert.match(script, /HINDI_EXTRA_ICONS/);
  assert.match(script, /rate=isEarlyLearner\(\) \? 0\.66 : 0\.72/);
  assert.match(script, /function transliterateHindi\(word\)/);
  assert.match(script, /letterWordPrompt\(sound,pronunciation\)/);
  assert.match(script, /HINDI_WORD_PRONUNCIATIONS/);
  assert.match(script, /text:hindiVoice\?/);
  assert.match(script, /text:hindiVoice\?character/);
  assert.match(script, /text:hindiVoice\?word/);
  assert.match(script, /pauseAfter:850/);
  assert.match(script, /function sayLessonWelcome\(language\)/);
  assert.match(script, /Namaste, \$\{kid\}! Hindi seekhen\./);
  assert.match(script, /TELUGU_LETTER_SOUNDS/);
  assert.match(script, /pick\("en-IN"\)/);
  assert.match(script, /hindiWords&&hindiWords\[k\]/);
  assert.match(script, /classList\.add\("language-lesson-stage"\)/);

  const readConstant = name => JSON.parse(script.match(new RegExp(`const ${name}=(\\{.*?\\}|\\[.*?\\]);`))[1]);
  const wordIcons = readConstant('HINDI_WORD_ICONS');
  const iconFixes = readConstant('HINDI_WORD_ICON_FIXES');
  const fallbackIcons = readConstant('HINDI_ICONS');
  const extraIcons = readConstant('HINDI_EXTRA_ICONS');
  for (const wordsForCharacter of Object.values(words)) {
    const assigned = [];
    for (let index = 0; index < wordsForCharacter.length; index++) {
      const word = wordsForCharacter[index];
      const mapped = iconFixes[word] || wordIcons[word];
      const reserved = wordsForCharacter.slice(index + 1)
        .map(next => iconFixes[next] || wordIcons[next]).filter(Boolean);
      let icon = mapped || fallbackIcons[index % fallbackIcons.length];
      if (assigned.includes(icon) || (!mapped && reserved.includes(icon))) {
        icon = [...fallbackIcons, ...extraIcons].find(candidate =>
          !assigned.includes(candidate) && !reserved.includes(candidate)) || icon;
      }
      assigned.push(icon);
    }
    assert.equal(new Set(assigned).size, wordsForCharacter.length);
  }
  assert.equal(iconFixes['गधा'], '🫏');
  assert.equal(iconFixes['चमचा'], '🥄');
  assert.equal(iconFixes['हाथ'], '✋');
});

test('service worker has build hash and precache list injected', async () => {
  const r = await get('/sw.js');
  const t = r.body.toString();
  assert.ok(!t.includes('__BUILD__') && !t.includes('__PRECACHE__'));
  assert.match(t, /little-learners-[0-9a-f]{10}/);
  assert.match(t, /"\/app\.js"/);
});

test('health endpoint', async () => {
  const r = await get('/health');
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(r.body).status, 'ok');
});

test('gzip and ETag/304', async () => {
  const z = await get('/app.js', { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(z.headers['content-encoding'], 'gzip');
  const n = await get('/app.js', { headers: { 'if-none-match': z.headers.etag } });
  assert.equal(n.status, 304);
});

test('path traversal and unknown paths are blocked', async () => {
  for (const p of ['/../server.js', '/%2e%2e/server.js', '/..%2fpackage.json', '/nope.html']) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
  }
});

test('only GET/HEAD allowed', async () => {
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  assert.equal((await get('/', { method: 'HEAD' })).status, 200);
});
