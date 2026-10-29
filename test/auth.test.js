'use strict';

const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createServer } = require('../server');

async function createFixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'little-learners-auth-'));
  const dbPath = path.join(directory, 'accounts.sqlite');
  const server = createServer({
    auth: {
      dbPath,
      appBaseUrl: 'http://localhost:3000',
      ...options,
    },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const request = (pathname, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      path: pathname,
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });

  return { dbPath, request };
}

test('Render external URL is used for production email confirmation links', async t => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRenderUrl = process.env.RENDER_EXTERNAL_URL;
  const messages = [];
  process.env.NODE_ENV = 'production';
  process.env.RENDER_EXTERNAL_URL = 'https://kids-learning-fun.onrender.com';

  let fixture;
  try {
    fixture = await createFixture(t, {
      appBaseUrl: undefined,
      sendEmail: async message => messages.push(message),
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousRenderUrl === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = previousRenderUrl;
  }

  const signup = await fixture.request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Avery', email: 'avery@example.com', password: 'a secure password' },
  });
  assert.equal(signup.status, 202);
  assert.match(messages[0].text, /https:\/\/kids-learning-fun\.onrender\.com\/api\/auth\/verify-email\?token=/);
});

test('email signup, confirmation, session, login, and logout use hashed credentials', async t => {
  const messages = [];
  const { dbPath, request } = await createFixture(t, {
    sendEmail: async message => messages.push(message),
  });

  const signup = await request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Avery', email: ' Avery@example.com ', password: 'a secure password' },
  });
  assert.equal(signup.status, 202);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'avery@example.com');

  const confirmationToken = new URL(messages[0].text.match(/http:\/\/localhost:3000\/api\/auth\/verify-email\?token=[\w-]+/)[0]).searchParams.get('token');
  const database = new Database(dbPath, { readonly: true });
  const user = database.prepare('SELECT * FROM users WHERE email = ?').get('avery@example.com');
  assert.ok(user.password_hash);
  assert.notEqual(user.password_hash, 'a secure password');
  assert.notEqual(user.password_salt, 'a secure password');
  assert.notEqual(user.verification_token_hash, confirmationToken);
  database.close();

  const unverifiedLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'avery@example.com', password: 'a secure password' },
  });
  assert.equal(unverifiedLogin.status, 403);
  assert.equal(JSON.parse(unverifiedLogin.body).code, 'EMAIL_NOT_VERIFIED');

  const confirmation = await request(`/api/auth/verify-email?token=${confirmationToken}`);
  assert.equal(confirmation.status, 302);
  assert.equal(confirmation.headers.location, '/?verified=1');
  assert.ok(confirmation.headers['content-security-policy']);
  assert.match(confirmation.headers['set-cookie'][0], /HttpOnly/);
  assert.match(confirmation.headers['set-cookie'][0], /SameSite=Lax/);
  const sessionCookie = confirmation.headers['set-cookie'][0].split(';')[0];

  const session = await request('/api/auth/session', { headers: { Cookie: sessionCookie } });
  assert.equal(session.status, 200);
  assert.deepEqual(JSON.parse(session.body), { firstName: 'Avery' });

  const logout = await request('/api/auth/logout', { method: 'POST', headers: { Cookie: sessionCookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
  const expiredSession = await request('/api/auth/session', { headers: { Cookie: sessionCookie } });
  assert.equal(expiredSession.status, 401);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'AVERY@example.com', password: 'a secure password' },
  });
  assert.equal(login.status, 200);
  assert.deepEqual(JSON.parse(login.body), { firstName: 'Avery' });
});

test('resend confirmation uses the configured email sender and rotates the token', async t => {
  const messages = [];
  const { request } = await createFixture(t, {
    sendEmail: async message => messages.push(message),
  });

  await request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Kai', email: 'kai@example.com', password: 'another safe password' },
  });
  const firstToken = new URL(messages[0].text.match(/http:\/\/localhost:3000\/api\/auth\/verify-email\?token=[\w-]+/)[0]).searchParams.get('token');

  const resend = await request('/api/auth/resend-verification', {
    method: 'POST',
    body: { email: 'kai@example.com' },
  });
  assert.equal(resend.status, 202);
  assert.equal(messages.length, 2);
  const secondToken = new URL(messages[1].text.match(/http:\/\/localhost:3000\/api\/auth\/verify-email\?token=[\w-]+/)[0]).searchParams.get('token');
  assert.notEqual(secondToken, firstToken);
  assert.equal((await request(`/api/auth/verify-email?token=${firstToken}`)).status, 400);
  assert.equal((await request(`/api/auth/verify-email?token=${secondToken}`)).status, 302);
});

test('auth rejects non-JSON and invalid signup input with explicit responses', async t => {
  const { request } = await createFixture(t, {
    sendEmail: async () => {},
  });

  const unsupportedContentType = await request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Avery', email: 'avery@example.com', password: 'a secure password' },
    headers: { 'Content-Type': 'text/plain' },
  });
  assert.equal(unsupportedContentType.status, 415);

  const invalidEmail = await request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Avery', email: 'not-an-email', password: 'a secure password' },
  });
  assert.equal(invalidEmail.status, 400);
});

test('signup reports missing email configuration instead of leaving a pending account', async t => {
  const { dbPath, request } = await createFixture(t, {
    smtpHost: '',
    smtpFrom: '',
  });

  const signup = await request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Avery', email: 'avery@example.com', password: 'a secure password' },
  });
  assert.equal(signup.status, 503);
  assert.match(JSON.parse(signup.body).error, /not configured/i);

  const database = new Database(dbPath, { readonly: true });
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
  database.close();
});

test('Gmail OAuth2 credentials configure Nodemailer XOAUTH2 transport', async t => {
  let transportOptions;
  let sentMessage;
  const { request } = await createFixture(t, {
    smtpAuthMethod: 'oauth2',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: 'littlelearner1325@gmail.com',
    googleOAuthClientId: 'client-id',
    googleOAuthClientSecret: 'client-secret',
    googleOAuthRefreshToken: 'refresh-token',
    createTransport: options => {
      transportOptions = options;
      return { sendMail: async message => { sentMessage = message; } };
    },
  });

  const signup = await request('/api/auth/signup', {
    method: 'POST',
    body: { firstName: 'Avery', email: 'avery@example.com', password: 'a secure password' },
  });

  assert.equal(signup.status, 202);
  assert.deepEqual(transportOptions.auth, {
    type: 'OAuth2',
    user: 'littlelearner1325@gmail.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    refreshToken: 'refresh-token',
  });
  assert.equal(sentMessage.from, 'Little Learners <littlelearner1325@gmail.com>');
  assert.equal(sentMessage.to, 'avery@example.com');
});
