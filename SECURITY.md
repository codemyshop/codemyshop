# Security policy

## Reporting a vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue**. Instead, email:

**security@codemyshop.com**

Optional GPG public key: [security-pgp.txt](https://codemyshop.com/security-pgp.txt) (coming soon).

## What to include

- Type of vulnerability (e.g. SQL injection, XSS, auth bypass, RCE)
- Affected version / commit SHA
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Our commitment

- **Acknowledge** within 48 business hours
- **Triage** within 5 business days
- **Fix** for critical issues within 14 days, less critical within 90 days
- **Public disclosure** after fix release, with credit to the reporter (unless you prefer anonymity)
- **No legal action** against good-faith security research consistent with this policy

## Hall of fame

Researchers who responsibly disclosed vulnerabilities will be listed here (with permission).

*(empty for now — be the first!)*

## Out of scope

The following are not considered vulnerabilities for this project:

- Issues in third-party dependencies (please report upstream first)
- Self-XSS requiring user actions (e.g. pasting JS into browser console)
- Missing security headers without exploit demonstration
- Rate-limit bypass without functional impact
- Issues only reproducible on outdated versions (we support latest minor of latest major + previous major minor)

For Managed Standard / Pro customers, additional SLA and remediation timelines apply per the service agreement.

## Hardening checklist for self-hosters

CodeMyShop ships with secure defaults, but you must:

- [ ] Use a strong `HUB_SESSION_SECRET` (≥ 32 random chars, see `openssl rand -hex 32`)
- [ ] Enable HTTPS via Let's Encrypt (the Ansible playbook handles this)
- [ ] Configure UFW to expose only ports 80, 443, and your SSH port
- [ ] Run PostgreSQL bound to localhost or VPN, never public
- [ ] Enable PostgreSQL backups (the Ansible playbook configures S3-compatible backups)
- [ ] Rotate the admin password from the seeded default
- [ ] Subscribe to the [release feed](https://github.com/codemyshop/codemyshop/releases.atom) for security patches
- [ ] Apply security patches within 14 days

## Supply chain

- **Dependencies**: pinned in `package.json` and `package-lock.json`. We avoid wildcard versions.
- **CI**: GitHub Actions runs `npm audit` on every push.
- **Container images**: every `ghcr.io/codemyshop/codemyshop:vX.Y.Z` is signed with [cosign](https://docs.sigstore.dev/cosign/overview/) using keyless OIDC (no static private key — the signing identity is the GitHub Actions workflow itself). Each image also ships a [CycloneDX](https://cyclonedx.org/) SBOM as a cosign attestation. See **Verifying releases** below.
- **No telemetry**: CodeMyShop does not phone home. Period.

## Verifying releases

You can independently verify that a `ghcr.io/codemyshop/codemyshop` image was built by our official GitHub Actions workflow (and not tampered with) before running it.

### Prerequisite

Install [cosign](https://docs.sigstore.dev/cosign/system_config/installation/) (single Go binary, no daemon).

### Verify the image signature

```bash
cosign verify \
  --certificate-identity-regexp '^https://github\.com/codemyshop/codemyshop/\.github/workflows/docker\.yml@refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/codemyshop/codemyshop:0.1.6
```

A successful verification prints the certificate transparency log entry and exits 0. If the image was retagged or rebuilt by anyone other than our workflow, this command fails.

> **Note on tag naming**: the git tag is `v0.1.6` (with leading `v`) but the published Docker image tag strips it: `ghcr.io/.../codemyshop:0.1.6` (no `v`), `:0.1`, `:latest`. Use the no-`v` form when invoking cosign or `docker pull`.

### Download the SBOM (CycloneDX)

```bash
cosign download attestation \
  --predicate-type https://cyclonedx.org/bom \
  ghcr.io/codemyshop/codemyshop:0.1.6 \
  | jq -r '.payload' | base64 -d | jq '.predicate' > codemyshop-sbom.json
```

The SBOM lists every package included in the image with its version and license — useful for compliance audits, CVE scanning (`grype sbom:codemyshop-sbom.json`), and license review.

The SBOM is also attached as a workflow artifact (`sbom-cyclonedx`) on every release run, accessible via the GitHub Actions UI for 90 days.
