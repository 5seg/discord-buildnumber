import { Hono } from 'hono';

const app = new Hono();

const INSTALLERS = {
  windows: 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64',
  mac: 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=osx&arch=arm64',
  linux: 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=linux&arch=x64',
};

async function getClientVersion(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  return /\/(\d+\.\d+\.\d+)\//.exec(location)?.[1] ?? null;
}

app.get('/version', async (c) => {
  const [login, windows, mac, linux] = await Promise.all([
    fetch('https://discord.com/login'),
    getClientVersion(INSTALLERS.windows),
    getClientVersion(INSTALLERS.mac),
    getClientVersion(INSTALLERS.linux),
  ]);

  if (!login.ok) {
    return c.json({ success: false, message: `Status ${login.status}` }, 502);
  }

  const html = await login.text();
  const buildNumber = html.match(/"BUILD_NUMBER":"(\d+)"/)?.[1];
  if (!buildNumber) {
    return c.json({ success: false, message: 'Build number not found' }, 404);
  }

  const clients = { windows, mac, linux };
  const missing = Object.entries(clients).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    return c.json({ success: false, message: `Client version not found: ${missing.join(', ')}` }, 502);
  }

  return c.json({ success: true, buildNumber, clients });
});

export default app;
