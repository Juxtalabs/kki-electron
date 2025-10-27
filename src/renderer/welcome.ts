import { QUOTES } from '../common/quotes';

declare global {
  interface Window {
    sejati: {
      getUserInfo: () => Promise<{ username: string; today: string; }>;
    }
  }
}

// Pick a random quote
function getRandomQuote(): string {
  const idx = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[idx];
}

async function init() {
  const user = await window.sejati.getUserInfo();
  const userNameEl = document.getElementById('userName');
  const todayEl = document.getElementById('today');
  const quoteEl = document.getElementById('quote');

  if (userNameEl) userNameEl.textContent = user.username || 'User';
  if (todayEl) todayEl.textContent = user.today;
  if (quoteEl) quoteEl.textContent = getRandomQuote();
}

void init();
