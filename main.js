import { Hono } from 'hono';

const app = new Hono();

const INSTALLERS = {
  windows: 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64',
  mac: 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=osx&arch=arm64',
  linux: 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=linux&arch=x64',
};

const VERSION_RE = /\/(\d+\.\d+\.\d+)\//;
const parseVersion = (value) => VERSION_RE.exec(value ?? '')?.[1] ?? null;

async function getClientVersion(url, attempts = 2) {
  let status = 0;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await fetch(url, { redirect: 'manual' });
    status = res.status;
    const version = parseVersion(res.headers.get('location'));
    if (version) return { version, status };

    const followed = await fetch(url, { redirect: 'follow' });
    status = followed.status;
    const followedVersion = parseVersion(followed.url);
    if (followed.body) await followed.body.cancel().catch(() => {});
    if (followedVersion) return { version: followedVersion, status };

    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return { version: null, status };
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

  const resolved = { windows, mac, linux };
  const missing = Object.entries(resolved)
    .filter(([, v]) => !v.version)
    .map(([k, v]) => `${k} (${v.status})`);

  if (missing.length > 0) {
    return c.json({ success: false, message: `Client version not found: ${missing.join(', ')}` }, 502);
  }

  const clients = { windows: windows.version, mac: mac.version, linux: linux.version };

  return c.json({ success: true, buildNumber, clients });
});

export default app;
