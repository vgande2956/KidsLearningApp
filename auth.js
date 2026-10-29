'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const scrypt = promisify(crypto.scrypt);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 1024;
const JSON_BODY_LIMIT = 8192;

function json(res, status, value, headers = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    return Promise.reject(Object.assign(new Error('Content-Type must be application/json.'), { status: 415 }));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      length += chunk.length;
      if (length > JSON_BODY_LIMIT) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return reject(Object.assign(new Error('Request body must be a JSON object.'), { status: 400 }));
        }
        resolve(body);
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cookieValue(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function createAuthHandler(options = {}) {
  const dbPath = path.resolve(options.dbPath || process.env.AUTH_DB_PATH || path.join(__dirname, 'data', 'accounts.sqlite'));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new Database(dbPath);
  if (process.platform !== 'win32') fs.chmodSync(dbPath, 0o600);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      first_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token_hash TEXT,
      verification_expires_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  `);

  const smtpHost = options.smtpHost ?? process.env.SMTP_HOST;
  const smtpPort = Number(options.smtpPort ?? process.env.SMTP_PORT ?? 587);
  const smtpSecure = options.smtpSecure ?? process.env.SMTP_SECURE === 'true';
  const smtpUser = options.smtpUser ?? process.env.SMTP_USER;
  const smtpPassword = options.smtpPassword ?? process.env.SMTP_PASSWORD;
  const mailFrom = options.smtpFrom ?? process.env.SMTP_FROM ?? 'Little Learners <littlelearner1325@gmail.com>';
  const transport = options.sendEmail ? null :
    smtpHost && smtpPort && mailFrom && (!smtpUser || smtpPassword)
      ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined,
      })
      : null;
  const sendEmail = options.sendEmail || (message => transport.sendMail({ from: mailFrom, ...message }));
  const configuredAppBaseUrl = options.appBaseUrl || process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL;
  const appBaseUrl = new URL(configuredAppBaseUrl || `http://localhost:${process.env.PORT || 3000}`);
  if (appBaseUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(appBaseUrl.hostname)) {
    throw new Error('APP_BASE_URL must use HTTPS outside localhost.');
  }
  if (process.env.NODE_ENV === 'production' && !configuredAppBaseUrl) {
    throw new Error('Set APP_BASE_URL to the deployed HTTPS origin before starting in production.');
  }
  const secureCookie = options.secureCookie ?? process.env.NODE_ENV === 'production';
  const cookie = (token, maxAge) =>
    `ll_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie ? '; Secure' : ''}`;
  const rateLimits = new Map();
  const userByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const insertUser = db.prepare(`
    INSERT INTO users (first_name,email,password_salt,password_hash,verification_token_hash,verification_expires_at,created_at)
    VALUES (?,?,?,?,?,?,?)
  `);
  const issueSession = db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)');
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const sessionUser = db.prepare(`
    SELECT users.id, users.first_name FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.email_verified = 1
  `);
  const dummySalt = crypto.randomBytes(16).toString('hex');
  const dummyHash = crypto.randomBytes(64);

  function rateLimited(req, res) {
    const key = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    if (rateLimits.size > 10000) {
      for (const [address, limit] of rateLimits) {
        if (limit.resetAt <= now) rateLimits.delete(address);
      }
    }
    const previous = rateLimits.get(key);
    if (!previous || previous.resetAt <= now) {
      rateLimits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return false;
    }
    previous.count += 1;
    if (previous.count <= 12) return false;
    json(res, 429, { error: 'Too many attempts. Please wait a little and try again.' }, { 'Retry-After': String(Math.ceil((previous.resetAt - now) / 1000)) });
    return true;
  }

  async function sendVerification(user, token) {
    if (!transport && !options.sendEmail) throw new Error('Email delivery is not configured.');
    const verifyUrl = new URL('/api/auth/verify-email', appBaseUrl);
    verifyUrl.searchParams.set('token', token);
    const firstName = escapeHtml(user.first_name);
    await sendEmail({
      to: user.email,
      subject: 'Confirm your Little Learners account',
      text: `Hello ${user.first_name},\n\nConfirm your email address to start learning:\n${verifyUrl.href}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this message.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;padding:32px;border-radius:20px;background:#fff7f0;color:#3f4963"><p style="font-size:30px">✨</p><h1>One little step to get started</h1><p>Hello ${firstName}, confirm your email to activate your Little Learners account.</p><p style="margin:28px 0"><a href="${verifyUrl.href}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#385d8d;color:white;text-decoration:none;font-weight:bold">Confirm email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this message.</p></div>`,
    });
  }

  async function signup(req, res) {
    if (rateLimited(req, res)) return;
    const body = await readJson(req);
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!firstName || firstName.length > 40 || /[\u0000-\u001f\u007f]/.test(firstName)) {
      return json(res, 400, { error: 'Enter a first name of 1 to 40 characters.' });
    }
    if (!validEmail(email)) return json(res, 400, { error: 'Enter a valid email address.' });
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      return json(res, 400, { error: `Use a password between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.` });
    }
    if (!transport && !options.sendEmail) return json(res, 503, { error: 'Email confirmation is not configured on this server yet.' });
    if (userByEmail.get(email)) {
      return json(res, 202, { message: 'If this address can be used, a confirmation email will be sent.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await scrypt(password, salt, 64);
    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    let result;
    try {
      result = insertUser.run(firstName, email, salt, passwordHash.toString('hex'), hashToken(token), now + VERIFICATION_TTL_MS, now);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return json(res, 202, { message: 'If this address can be used, a confirmation email will be sent.' });
      }
      throw error;
    }
    const user = { id: Number(result.lastInsertRowid), first_name: firstName, email };
    try {
      await sendVerification(user, token);
    } catch (error) {
      db.prepare('DELETE FROM users WHERE id = ? AND email_verified = 0').run(user.id);
      console.error('Could not send account verification email:', error.message);
      return json(res, 503, { error: 'We could not send the confirmation email. Check the email service configuration and try again.' });
    }
    return json(res, 202, { message: 'Check your email for a confirmation link. It expires in 24 hours.' });
  }

  async function login(req, res) {
    if (rateLimited(req, res)) return;
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!validEmail(email) || password.length > PASSWORD_MAX_LENGTH) {
      return json(res, 401, { error: 'Email or password is incorrect.' });
    }
    const user = userByEmail.get(email);
    const salt = user?.password_salt || dummySalt;
    const expected = Buffer.from(user?.password_hash || dummyHash.toString('hex'), 'hex');
    const actual = await scrypt(password, salt, 64);
    if (!user || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      return json(res, 401, { error: 'Email or password is incorrect.' });
    }
    if (!user.email_verified) return json(res, 403, { error: 'Confirm your email before logging in.', code: 'EMAIL_NOT_VERIFIED' });

    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    issueSession.run(hashToken(token), user.id, now + SESSION_TTL_MS, now);
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    return json(res, 200, { firstName: user.first_name }, {
      'Set-Cookie': cookie(token, Math.floor(SESSION_TTL_MS / 1000)),
    });
  }

  async function resendVerification(req, res) {
    if (rateLimited(req, res)) return;
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    if (validEmail(email) && (transport || options.sendEmail)) {
      const user = userByEmail.get(email);
      if (user && !user.email_verified) {
        const token = crypto.randomBytes(32).toString('base64url');
        db.prepare('UPDATE users SET verification_token_hash = ?, verification_expires_at = ? WHERE id = ?')
          .run(hashToken(token), Date.now() + VERIFICATION_TTL_MS, user.id);
        try {
          await sendVerification(user, token);
        } catch (error) {
          console.error('Could not resend account verification email:', error.message);
          return json(res, 503, { error: 'We could not send the confirmation email. Please try again later.' });
        }
      }
    }
    return json(res, 202, { message: 'If the address has an unconfirmed account, a new confirmation email will be sent.' });
  }

  function verifyEmail(req, res, url) {
    const token = url.searchParams.get('token') || '';
    if (!/^[\w-]{43}$/.test(token)) return verificationPage(res, false);
    const user = db.prepare(`
      SELECT id FROM users
      WHERE verification_token_hash = ? AND verification_expires_at > ? AND email_verified = 0
    `).get(hashToken(token), Date.now());
    if (!user) return verificationPage(res, false);
    const now = Date.now();
    db.prepare('UPDATE users SET email_verified = 1, verification_token_hash = NULL, verification_expires_at = NULL WHERE id = ?').run(user.id);
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    issueSession.run(hashToken(sessionToken), user.id, now + SESSION_TTL_MS, now);
    res.writeHead(302, {
      Location: '/?verified=1',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie(sessionToken, Math.floor(SESSION_TTL_MS / 1000)),
    });
    res.end();
  }

  function verificationPage(res, success) {
    const title = success ? 'Email confirmed!' : 'This link has expired';
    const message = success
      ? 'Your account is ready. Let’s start learning!'
      : 'Ask for a new confirmation email from the signup screen.';
    const body = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} · Little Learners</title><body style="font-family:Arial,sans-serif;max-width:520px;margin:15vh auto;padding:24px;color:#3f4963;text-align:center;background:#fff7f0"><h1>${title}</h1><p>${message}</p><a href="/" style="display:inline-block;margin-top:16px;padding:14px 22px;border-radius:14px;background:#385d8d;color:white;text-decoration:none">Open Little Learners</a></body></html>`;
    res.writeHead(success ? 200 : 400, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  function getSession(req, res) {
    const token = cookieValue(req, 'll_session');
    if (!token || token.length !== 43) return json(res, 401, { error: 'Not logged in.' });
    const user = sessionUser.get(hashToken(token), Date.now());
    if (!user) return json(res, 401, { error: 'Not logged in.' });
    return json(res, 200, { firstName: user.first_name });
  }

  function logout(req, res) {
    const token = cookieValue(req, 'll_session');
    if (token) deleteSession.run(hashToken(token));
    return json(res, 200, { message: 'Logged out.' }, { 'Set-Cookie': cookie('', 0) });
  }

  const handleAuthRequest = async function handleAuthRequest(req, res) {
    const url = new URL(req.url, appBaseUrl);
    try {
      if (url.pathname === '/api/auth/verify-email' && req.method === 'GET') return verifyEmail(req, res, url);
      if (url.pathname === '/api/auth/session' && req.method === 'GET') return getSession(req, res);
      if (url.pathname === '/api/auth/signup' && req.method === 'POST') return await signup(req, res);
      if (url.pathname === '/api/auth/login' && req.method === 'POST') return await login(req, res);
      if (url.pathname === '/api/auth/resend-verification' && req.method === 'POST') return await resendVerification(req, res);
      if (url.pathname === '/api/auth/logout' && req.method === 'POST') return logout(req, res);
      if (url.pathname.startsWith('/api/auth/')) return json(res, 404, { error: 'Account endpoint not found.' });
      return false;
    } catch (error) {
      if (error.status) return json(res, error.status, { error: error.message });
      console.error('Account request failed:', error);
      return json(res, 500, { error: 'The account service could not complete this request.' });
    }
  };
  handleAuthRequest.close = () => db.close();
  return handleAuthRequest;
}

module.exports = { createAuthHandler };
