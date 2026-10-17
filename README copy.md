# Kids Learning Fun - Web App (Node.js)

Tap a letter (A-Z) or number (0-9) to see a big picture and hear the word spoken.
Works on phones, tablets and PCs, installs to the home screen, and works offline.

- Zero dependencies - only Node.js 18+ is needed (no `npm install` required)
- `npm run build`  copies `src/` to `dist/` and stamps the offline cache version
- `npm start`      serves `dist/` (builds automatically if `dist/` is missing)
- `npm test`       builds and runs the server tests

## Run locally
```
npm run dev
```
Open http://localhost:3000

## Deploy (pick one)

**Render (free, easiest)** - push this folder to GitHub, then Render > New > Blueprint
(it reads `render.yaml`). Or New > Web Service with Build `npm run build`, Start `npm start`.

**Railway / Heroku** - connect the GitHub repo. Both detect Node, run `npm run build`
and `npm start` (a `Procfile` is included). They provide HTTPS automatically.

**Docker (any server, Fly.io, Cloud Run, Azure, AWS)**
```
docker build -t kids-learning-fun .
docker run -p 3000:3000 kids-learning-fun
```

**Your own Windows/Linux server**
```
npm run build
set PORT=80        (Windows)   or   PORT=80 npm start   (Linux)
npm start
```
Keep it running with PM2: `npm i -g pm2 && pm2 start server.js --name kids`.

## Install on phones
Open your deployed **https** address, then:
- Android Chrome: menu > Install app / Add to Home screen
- iPhone Safari: Share > Add to Home Screen
(HTTPS is required for install and offline mode; the hosts above give it for free.)

## Voice / sound tips
Uses the phone/PC's built-in speech. Turn up media volume, switch off the iPhone silent
switch, and open the site in Chrome/Safari (not an in-app viewer). Each tap also plays a beep.

## Editing words
Words and pictures are in the `D` list at the top of `src/app.js`; rebuild after editing.
