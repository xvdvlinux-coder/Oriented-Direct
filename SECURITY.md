# Security Policy

The Oriented-Direct team takes the security of our compiler, dev server, bundler, and CLI tooling seriously. We appreciate the efforts of the security research community to help keep our project and its users safe.

---

## Supported Versions

Security updates and patches are actively maintained for the latest stable minor release.

| Version | Supported          | Status                                      |
| :------ | :----------------- | :------------------------------------------ |
| 1.4.x   | Yes                | Current stable release; receives patches    |
| < 1.4.0 | No                 | End of life; upgrade to 1.4.x is recommended|

---

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

If you believe you have discovered a vulnerability in Oriented-Direct, report it responsibly via private email:

- **Email**: `security@oriented-direct.dev`
- **Subject**: `[SECURITY] Vulnerability Report: <Brief Description>`

### Information to Include

To help us investigate and resolve the issue quickly, include the following details in your report:

1. **Description**: A clear summary of the issue and its potential impact.
2. **Affected Components**: Specific subsystem (e.g., `transpiler`, `bundler`, `server`, `lexer`, `parser`, `cli`).
3. **Affected Versions**: The exact versions of `@xvdxlinux/oriented-direct` or `ospc` affected.
4. **Reproduction Steps**: A minimal, reproducible `.osp` code snippet or command sequence.
5. **Proof of Concept (PoC)**: Sample exploit scripts, payloads, or diagnostic logs if applicable.
6. **Suggested Fix**: Any recommended patches or mitigations (optional).

---

## Responsible Disclosure Timeline

We adhere to a coordinated, responsible disclosure process:

1. **Initial Acknowledgment**: You will receive an acknowledgment of your report within **48 hours**.
2. **Triage and Assessment**: The team will investigate, replicate, and assess the severity of the vulnerability within **5 business days**.
3. **Fix Development**: We will develop and test a fix in a private repository or private fork.
4. **Coordinated Release**: A patched version of `@xvdxlinux/oriented-direct` will be published to npm alongside a GitHub Security Advisory detailing the issue and crediting the reporter (unless anonymity is requested).
5. **Public Disclosure**: Full details are published following release, typically within a standard 30 to 90-day window from the initial report.

---

## Scope and Qualification

### What Qualifies as a Security Vulnerability

The following types of issues qualify for security reporting:

- **Transpiler / Bundler Code Injection**: Bugs in `src/transpiler` or `src/bundler` where crafted `.osp` source code escapes sanitization and injects arbitrary malicious JavaScript into output builds.
- **Directory Traversal / Unauthorized File Access**: Vulnerabilities in the built-in development server (`src/server/server.js`) allowing requests outside the intended static asset directory.
- **Denial of Service (DoS)**: Parser, lexer, or bundler bugs where specific input causes catastrophic backtracking (ReDoS), infinite loops, or uncontrolled memory consumption.
- **CLI Command Injection**: Vulnerabilities in `bin/ospc.js` or `src/cli/` that allow arbitrary command execution via unescaped arguments.

### What Does Not Qualify

- Vulnerabilities in user-authored application code outside of the compiler toolchain.
- Issues related to development server instances exposed to public, untrusted networks (the `ospc dev` server is explicitly designed for local development).
- Vulnerabilities requiring physical or root/administrator access to the host machine.
- Theoretical vulnerabilities without a demonstrated practical impact or proof of concept.

---

## Security Best Practices for Users

- Always keep your installation of `@xvdxlinux/oriented-direct` updated to the latest minor version (`npm install -g @xvdxlinux/oriented-direct@latest`).
- Review generated JavaScript code in `public/` or `dist/` before deploying applications to production environments.
- Run `ospc dev` exclusively in trusted local development environments.
