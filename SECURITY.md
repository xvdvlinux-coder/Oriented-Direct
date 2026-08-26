# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 1.4.x | Yes |
| < 1.4.0 | No |

## Reporting a Vulnerability

If you discover a security vulnerability in Oriented-Direct, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please send a detailed report to: **security@oriented-direct.dev**

Include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Affected versions
- Potential impact assessment
- Suggested fix, if available

## Disclosure Timeline

- **Acknowledgment**: Within 48 hours of receiving the report.
- **Initial Assessment**: Within 7 days.
- **Patch Release**: Within 30 days for confirmed vulnerabilities.
- **Public Disclosure**: After the patch has been released and users have had reasonable time to update.

## Scope

The following are considered security issues:

- Remote code execution via crafted .osp source files
- Path traversal in the dev server or asset pipeline
- Arbitrary file read or write during compilation or bundling
- Denial of service through malformed input that crashes the compiler

The following are not considered security issues:

- Bugs in transpiled output that do not lead to code execution vulnerabilities
- Feature requests or general bug reports
- Issues in third-party dependencies not bundled with the project
