# Security Policy

## Overview

The **Investment Trading Portfolio** is an algorithmic trading platform handling real money and sensitive financial data. Security is paramount across all components:

- **algo-worker**: Real-time trading engine with direct broker API access
- **training-pipeline**: ML model training with proprietary strategies
- **authentication**: User credentials, sessions, 2FA, passkeys
- **api**: Backend with database access and user data
- **web**: Dashboard with financial information display

---

## Supported Versions

We follow semantic versioning and provide security updates for the following versions:

| Version | Supported          | Status                   | End of Support |
| ------- | ------------------ | ------------------------ | -------------- |
| 0.0.2   | :white_check_mark: | Current Development      | Active         |
| 0.0.1   | :x:                | Legacy (pre-better-auth) | Deprecated     |

**Note**: Currently in active development (v0.0.x). Production release (v1.0.0) will follow a stricter LTS policy:

- Latest major version: Full security + feature support
- Previous major version: Security updates for 12 months
- Older versions: End of life (no support)

---

## Security Architecture

### Critical Components

1. **algo-worker (Trading Engine)**
   - Real-time order execution
   - Direct Upstox API integration
   - Position tracking and exit management
   - SEBI compliance (Algo ID, rate limiting, audit trail)
   - **Risk Level**: CRITICAL - Handles live trades

2. **authentication Package**
   - better-auth integration
   - Session management (httpOnly cookies)
   - 2FA (TOTP), Passkeys (WebAuthn)
   - OAuth (Google, GitHub, Discord)
   - Organization multi-tenancy
   - **Risk Level**: CRITICAL - User credentials

3. **training-pipeline (ML Models)**
   - Proprietary trading strategies
   - Model training (8 ensemble models)
   - ONNX export with FP16 quantization
   - Walk-forward validation
   - **Risk Level**: HIGH - Intellectual property

4. **database Package**
   - MongoDB (positions, users, audit trail)
   - QuestDB (tick data, time-series)
   - Redis (hot state, event bus)
   - **Risk Level**: HIGH - Financial data

5. **market-sdk**
   - Broker API integrations (Upstox, Binance)
   - Rate limiting and circuit breakers
   - **Risk Level**: HIGH - API keys

---

## Security Features

### Authentication & Authorization

- ✅ **Password Security**: Automatic bcrypt hashing (12 rounds) via better-auth
- ✅ **Session Security**: httpOnly cookies, 7-day expiry, automatic refresh
- ✅ **CSRF Protection**: Automatic state parameters, PKCE for OAuth
- ✅ **Rate Limiting**: Endpoint-specific (5/min login, 3/hour signup)
- ✅ **XSS Protection**: httpOnly cookies prevent token theft
- ✅ **2FA**: TOTP with backup codes (bcrypt hashed)
- ✅ **Passkeys**: WebAuthn with replay attack prevention
- ✅ **Role-Based Access Control**: AuthGuard, RolesGuard, @Roles decorator

### Data Security

- ✅ **Encryption at Rest**: MongoDB encryption (via WiredTiger)
- ✅ **Encryption in Transit**: TLS/HTTPS for all API calls
- ✅ **Environment Variables**: AUTH_SECRET (32+ chars), API keys in .env
- ✅ **Database Security**: Parameterized queries via Mongoose ODM
- ✅ **Audit Trail**: 5-year retention in MongoDB (SEBI compliance)

### Trading Security (SEBI Compliance)

- ✅ **Algo ID Generation**: `ENTITY-YYYYMMDD-VERSION-STRATEGY` format
- ✅ **Pre-Trade Risk Checks**: Position size limits, capital allocation
- ✅ **Rate Limiting**: 10 orders/second (Upstox limit)
- ✅ **Kill Switch**: Emergency stop-all-orders mechanism
- ✅ **Audit Logging**: All orders logged with timestamps, risk checks, execution details

### Infrastructure Security

- ✅ **Local Deployment**: algo-worker runs on local RTX GPU (no cloud exposure)
- ✅ **VPN/SSH Tunnels**: Secure cloud-to-local communication
- ✅ **Firewall Rules**: Only essential ports open (MongoDB 27017, Redis 6379, QuestDB 9000)
- ✅ **UPS Backup**: 15-30 min power backup for graceful shutdown
- ✅ **Dependency Scanning**: Dependabot daily checks for security-critical packages

---

## Reporting a Vulnerability

### Where to Report

**DO NOT** create public GitHub issues for security vulnerabilities.

Report security issues privately via one of:

1. **GitHub Security Advisories** (Recommended)
   - Go to: https://github.com/YOUR_USERNAME/investment-trading-portfolio/security/advisories
   - Click "Report a vulnerability"
   - Fill in details using the template below

2. **Email** (Alternative)
   - Send to: `security@yourdomain.com` (replace with your actual email)
   - Subject: `[SECURITY] Brief description`
   - Use PGP encryption if possible (key: [link to your PGP key])

3. **Private Message**
   - Contact maintainers directly via GitHub or other secure channels

---

### What to Include

Please provide as much detail as possible:

```markdown
**Component**: algo-worker / authentication / training-pipeline / api / web / other

**Severity**: Critical / High / Medium / Low

**Description**:
Brief summary of the vulnerability

**Steps to Reproduce**:

1. Step one
2. Step two
3. ...

**Impact**:
What could an attacker achieve? (e.g., unauthorized trades, credential theft, data exfiltration)

**Affected Versions**:
Which versions are vulnerable?

**Suggested Fix** (optional):
If you have ideas for remediation

**Proof of Concept** (optional):
Code snippet, screenshot, or video demonstrating the issue

**Your Contact Information**:
Email or GitHub username for follow-up
```

---

### Response Timeline

| Stage                  | Timeline        | Action                                                  |
| ---------------------- | --------------- | ------------------------------------------------------- |
| **Acknowledgment**     | Within 48 hours | We confirm receipt of your report                       |
| **Initial Assessment** | Within 5 days   | We assess severity and impact                           |
| **Status Update**      | Weekly          | Regular updates on investigation progress               |
| **Fix Development**    | Varies          | Critical: 1-7 days, High: 7-14 days, Medium: 14-30 days |
| **Patch Release**      | After fix ready | Security patch released (private initially)             |
| **Public Disclosure**  | 90 days max     | Coordinated disclosure after patch is available         |

### Severity Levels

**Critical** (Fix within 1-7 days):

- Remote code execution (RCE)
- Unauthorized trading execution
- Authentication bypass
- Database compromise
- API key leakage

**High** (Fix within 7-14 days):

- Privilege escalation
- Session hijacking
- Cross-site scripting (XSS) leading to account takeover
- SQL/NoSQL injection
- Sensitive data exposure (PII, financial data)

**Medium** (Fix within 14-30 days):

- CSRF vulnerabilities (not covered by existing protection)
- Information disclosure (non-sensitive)
- Denial of Service (DoS)
- Rate limiting bypass

**Low** (Fix within 30-60 days):

- Configuration issues
- Minor information leakage
- UI/UX security issues

---

### What to Expect

#### If Accepted:

1. **Acknowledgment**: We'll confirm the vulnerability
2. **Credit**: You'll be credited in release notes (unless you prefer anonymity)
3. **Bounty**: Currently no formal bug bounty program (project is self-funded)
4. **Updates**: Regular communication on fix progress
5. **Disclosure**: Coordinated public disclosure after patch release

#### If Declined:

1. **Explanation**: We'll explain why it's not considered a vulnerability
2. **Alternative**: We may suggest filing a regular GitHub issue for feature requests
3. **Reconsideration**: You can provide additional information if you disagree

---

## Security Best Practices for Contributors

### Code Review Checklist

Before submitting PRs, ensure:

- [ ] No hardcoded credentials (API keys, passwords, secrets)
- [ ] No sensitive data in logs (mask PII, financial data)
- [ ] Input validation for all user-supplied data
- [ ] Parameterized queries (no string concatenation for SQL/NoSQL)
- [ ] Rate limiting on API endpoints
- [ ] HTTPS/TLS for all external communication
- [ ] Authentication required for sensitive endpoints
- [ ] Authorization checks (user can only access their own data)
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are up-to-date (run `pnpm audit`)

### Environment Variables

**Never commit** `.env` files. Required secrets:

```bash
# Authentication (CRITICAL)
AUTH_SECRET="minimum-32-characters-cryptographically-secure"

# Database (HIGH)
MONGODB_URI="mongodb://localhost:27017/trading"
REDIS_URL="redis://localhost:6379"
QUESTDB_URL="http://localhost:9000"

# Broker API (CRITICAL)
UPSTOX_API_KEY="your_api_key"
UPSTOX_API_SECRET="your_api_secret"
UPSTOX_ACCESS_TOKEN="your_access_token"

# OAuth (MEDIUM)
GOOGLE_CLIENT_ID="xxx"
GOOGLE_CLIENT_SECRET="xxx"
GITHUB_CLIENT_ID="xxx"
GITHUB_CLIENT_SECRET="xxx"

# Email (MEDIUM)
SENDGRID_API_KEY="xxx"
SMTP_PASSWORD="xxx"

# SEBI Compliance (HIGH)
SEBI_ENTITY_CODE="YOUR_ENTITY_CODE"
```

**Generate secure secrets**:

```bash
# AUTH_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use OpenSSL
openssl rand -base64 32
```

---

## Security Audits

### Automated Scanning

1. **Dependabot**: Daily checks for security-critical packages (algo-worker, authentication)
2. **npm audit**: Run `pnpm audit` in CI/CD pipeline
3. **CodeQL**: Static analysis for TypeScript/JavaScript (if using GitHub Advanced Security)
4. **Snyk**: Third-party dependency scanning (optional)

### Manual Audits

**Recommended Schedule**:

- **Before production deployment**: Full security audit
- **Quarterly**: Review authentication flows, API security
- **After major version bump**: Re-audit changed components
- **Post-incident**: Root cause analysis

**Audit Scope**:

1. Authentication & Authorization
2. Data encryption (at rest, in transit)
3. API security (rate limiting, input validation)
4. Trading logic (pre-trade checks, kill switch)
5. Database security (access controls, backups)
6. Infrastructure (firewalls, SSH keys, TLS certificates)

---

## Incident Response Plan

### 1. Detection

- Monitor logs for suspicious activity
- Set up alerts for failed login attempts (>10/min)
- Track unauthorized API calls
- Monitor abnormal trading patterns

### 2. Containment

**Immediate Actions** (within 5 minutes):

1. Trigger kill switch (stop all trading)
2. Revoke compromised API keys
3. Invalidate all sessions (force re-login)
4. Isolate affected systems (block network access)

### 3. Investigation

- Collect logs (MongoDB audit trail, QuestDB metrics, Redis events)
- Identify attack vector
- Assess scope (affected users, data, trades)
- Preserve evidence for potential law enforcement

### 4. Eradication

- Patch vulnerability
- Remove backdoors/malware
- Reset all credentials
- Update firewall rules

### 5. Recovery

- Restore from clean backups
- Gradually re-enable systems
- Monitor for re-infection
- Verify data integrity

### 6. Post-Incident

- Document timeline and lessons learned
- Update security controls
- Notify affected users (if PII compromised)
- File regulatory reports (if required by SEBI)

**Emergency Contacts**:

- Primary: [Your Name] - [Your Email] - [Your Phone]
- Secondary: [Team Member] - [Email] - [Phone]
- SEBI Cybersecurity Cell: [Contact Info]

---

## Compliance

### SEBI (Securities and Exchange Board of India)

**Algo Trading Regulations**:

- ✅ Algo ID generation and logging
- ✅ Pre-trade risk checks (position limits)
- ✅ Rate limiting (10 OPS - Orders Per Second)
- ✅ 5-year audit trail retention
- ✅ Kill switch mechanism
- ✅ Regular backtesting and validation

**Reference**: SEBI Circular SEBI/HO/MRD/DP/CIR/P/2019/76 (Algo Trading)

---

### GDPR (If handling EU users)

**Compliance Checklist**:

- [ ] User consent for data collection
- [ ] Right to access (user can download their data)
- [ ] Right to erasure (user can delete their account)
- [ ] Data portability (export in machine-readable format)
- [ ] Data breach notification (within 72 hours)
- [ ] Privacy policy and terms of service

---

### PCI DSS (If handling payment cards)

**Not Applicable**: This project does not handle credit card information directly. Broker integrations (Upstox) handle payment processing.

---

## Security Resources

### Documentation

- [Authentication Security](./packages/authentication/docs/SECURITY.md) - better-auth security features
- [Deployment Architecture](./DEPLOYMENT_ARCHITECTURE.md) - Local-cloud hybrid security
- [Copilot Instructions](./.github/copilot-instructions.md) - Security coding guidelines

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SEBI Algo Trading Guidelines](https://www.sebi.gov.in/)
- [better-auth Security Docs](https://better-auth.com/docs/security)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Contact

**Security Team**: security@yourdomain.com (replace with your email)

**Maintainers**: @mguay22 (replace with your GitHub username)

**Public Discussions**: Use GitHub Discussions for non-sensitive security questions

---

## Acknowledgments

We thank all security researchers who responsibly disclose vulnerabilities. Contributors will be listed here:

- _No vulnerabilities reported yet_

---

**Last Updated**: December 12, 2024  
**Version**: 0.0.2  
**Review Schedule**: Quarterly
