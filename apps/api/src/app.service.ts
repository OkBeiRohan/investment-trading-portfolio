import { Injectable } from '@nestjs/common';
import { version } from '../package.json';

@Injectable()
export class AppService {
  homeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Investment Trading Portfolio - API Home</title>
  <link rel="stylesheet" href="/home.css" />
</head>
<body>
  <div class="container">
    <header>
      <h1>Investment Trading Portfolio</h1>
      <p class="subtitle">API Server Home</p>
    </header>
    <section class="info">
      <div class="version">
        <strong>Version:</strong> <span id="version">loading...</span>
      </div>
      <div class="health">
        <strong>Auth Health:</strong> <span id="health">checking...</span>
      </div>
    </section>
    <section class="actions">
      <a class="frontend-link" id="frontend-link" href="#" target="_blank">Visit Frontend</a>
    </section>
    <footer>
      <p>&copy; 2025 Investment Trading Portfolio</p>
    </footer>
  </div>
  <script src="/home.js"></script>
</body>
</html>`;

  homeCss = `body {
  background: linear-gradient(135deg, #e3eafe 0%, #f5f7fa 100%);
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  margin: 0;
  padding: 0;
}
.container {
  max-width: 480px;
  margin: 48px auto;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.08);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
header {
  text-align: center;
}
h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #6366f1;
}
.subtitle {
  font-size: 1.1rem;
  color: #6b7280;
}
.info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 1rem;
}
.version, .health {
  display: flex;
  gap: 8px;
  align-items: center;
}
.actions {
  text-align: center;
}
.frontend-link {
  display: inline-block;
  background: #6366f1;
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  font-size: 1rem;
  transition: background 0.2s;
}
.frontend-link:hover {
  background: #4f46e5;
}
.frontend-link.error {
  background: #ef4444;
}
footer {
  text-align: center;
  color: #9ca3af;
  font-size: 0.95rem;
}`;

  homeJs = `document.addEventListener('DOMContentLoaded', async () => {
  // Fetch version info
  const versionSpan = document.getElementById('version');
  try {
    const res = await fetch('/api/version');
    const data = await res.json();
    versionSpan.textContent = data.version || 'unknown';
  } catch {
    versionSpan.textContent = 'error';
  }

  // Fetch health status
  const healthSpan = document.getElementById('health');
  try {
    const res = await fetch('/api/auth/ok');
    const data = await res.json();
    
    healthSpan.textContent = data.ok ? 'Healthy' : 'Unhealthy';
    healthSpan.style.color = data.ok ? '#22c55e' : '#ef4444';
  } catch {
    healthSpan.textContent = 'error';
    healthSpan.style.color = '#ef4444';
  }

  // Set frontend link
  const frontendLink = document.getElementById('frontend-link');
  try {
    const res = await fetch('/api/frontend-url');
    const data = await res.json();
    frontendLink.href = data.url || '#';
  } catch {
    frontendLink.classList.add('error');
    frontendLink.textContent = 'Frontend URL Unavailable';
    frontendLink.href = '#';
  }
});`;

  getHome(): string {
    return this.homeHtml;
  }

  getHomeCss(): string {
    return this.homeCss;
  }

  getHomeJs(): string {
    return this.homeJs;
  }

  getVersion() {
    return { version: version || 'unknown' };
  }

  getFrontendUrl() {
    const url = process.env.FRONTEND_URL || 'unknown';
    return { url };
  }
}
