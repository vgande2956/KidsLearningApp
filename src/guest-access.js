'use strict';

(() => {
  const GUEST_KEY = 'little-learners-guest';
  const guestLoginButton = document.getElementById('guest-login-button');
  const levelGridSelectors = [
    '.english-identify-level-grid',
    '#addition-level-options',
  ];
  const guestHiddenIds = [
    'general-knowledge-entry',
    'roman-entry',
    'english-deity-entry',
    'english-warriors-entry',
    'english-stories-entry',
    'english-everyday-entry',
    'animal-trivia-entry',
    'food-nature-entry',
    'english-sentence-entry',
    'english-sketch-entry',
    'math-story-entry',
    'native-stories-entry',
  ];
  const englishEntryIds = new Set([
    'english-alphabets-entry',
    'english-identify-entry',
    'english-spelling-entry',
  ]);
  const blockedPageButtonIds = [
    'math-counting-previous',
    'math-counting-next',
    'addition-first-previous',
    'addition-first-next',
    'addition-second-previous',
    'addition-second-next',
    'addition-level-previous',
    'addition-level-next',
    'english-identify-previous',
    'english-identify-next-page',
    'math-story-previous',
    'math-story-next-page',
    'quiz-previous',
    'quiz-next-page',
  ];
  const originalHiddenStates = new Map();

  function isGuest() {
    return sessionStorage.getItem(GUEST_KEY) === 'true';
  }

  function setGuestHidden(element, shouldHide) {
    if (!originalHiddenStates.has(element)) originalHiddenStates.set(element, element.hidden);
    const hidden = shouldHide || originalHiddenStates.get(element);
    if (element.hidden !== hidden) element.hidden = hidden;
  }

  function restoreGuestVisibility() {
    for (const [element, wasHidden] of originalHiddenStates) {
      element.hidden = wasHidden;
    }
    originalHiddenStates.clear();
  }

  function isLevelOne(button) {
    const level = Number(button.dataset.level);
    if (Number.isFinite(level) && level > 0) return level === 1;
    const label = (button.innerText || button.textContent || '').trim();
    return /^1$/.test(label) || /\blevel\s*1\b/i.test(label);
  }

  function restrictLevelChoices() {
    for (const selector of levelGridSelectors) {
      document.querySelectorAll(selector).forEach(grid => {
        grid.querySelectorAll('button').forEach(button => {
          setGuestHidden(button, !isLevelOne(button));
        });
      });
    }

    document.querySelectorAll('.math-counting-keyboard button, .addition-number-grid button').forEach(button => {
      const value = Number((button.innerText || button.textContent || '').trim());
      if (Number.isFinite(value)) setGuestHidden(button, value < 1 || value > 10);
    });

    for (const id of blockedPageButtonIds) {
      const button = document.getElementById(id);
      if (button) setGuestHidden(button, true);
    }
  }

  function applyGuestRestrictions() {
    let guest = isGuest();
    const logoutButton = document.getElementById('account-logout');
    if (guest && logoutButton && !logoutButton.hidden) {
      sessionStorage.removeItem(GUEST_KEY);
      guest = false;
    }
    document.body.classList.toggle('guest-mode', guest);

    const authFlowVisible = ['splash', 'auth-login', 'auth-signup', 'app-tour']
      .some(id => !document.getElementById(id).hidden);
    const hideGuestLogin = !guest || authFlowVisible;
    if (guestLoginButton.hidden !== hideGuestLogin) guestLoginButton.hidden = hideGuestLogin;

    if (!guest) {
      restoreGuestVisibility();
      return;
    }

    for (const id of guestHiddenIds) {
      const entry = document.getElementById(id);
      if (entry) setGuestHidden(entry, true);
    }

    document.querySelectorAll('.english-type-options button').forEach(button => {
      const isBasicWordType = ['two', 'three'].includes(button.dataset.englishType);
      setGuestHidden(button, !isBasicWordType && !englishEntryIds.has(button.id));
    });

    document.querySelectorAll('.native-type-options button').forEach(button => {
      setGuestHidden(button, !['native-letters-entry', 'native-quiz-entry'].includes(button.id));
    });

    restrictLevelChoices();
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#welcome-guest')) {
      sessionStorage.setItem(GUEST_KEY, 'true');
      applyGuestRestrictions();
    } else if (target?.closest('#guest-login-button')) {
      document.getElementById('welcome-login').click();
    }
    requestAnimationFrame(applyGuestRestrictions);
  }, true);

  const observer = new MutationObserver(applyGuestRestrictions);
  observer.observe(document.body, { childList: true, subtree: true });
  applyGuestRestrictions();
})();
