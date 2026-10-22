import { Hono } from 'hono';

const app = new Hono();

app.get('/buildnumber', async (c) => {
  const login = await fetch('https://discord.com/login');
  if (!login.ok) {
    return c.json({ success: false, message: `Status ${login.status}` }, 502);
  }

  const html = await login.text();
  const scripts = [...html.matchAll(/<script defer src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);

  for (const src of scripts) {
    const js = await (await fetch(`https://discord.com${src}`)).text();
    const buildNumber = js.match(/buildNumber:\s*"(\d+)"/)?.[1];
    if (buildNumber) {
      return c.json({ success: true, buildNumber });
    }
  }

  return c.json({ success: false, message: 'Not found' }, 404);
});

export default app;
