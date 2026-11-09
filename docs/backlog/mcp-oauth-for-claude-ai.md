---
priority: p2
depends_on: [ai-worker-agent-access]
components: [backend]
---
# MCP: OAuth sign-in so Claude.ai can connect

## Objective
Claude Code connects to `POST /mcp` with an agent token in an `Authorization` header. Claude.ai's custom connectors (and other hosted MCP clients) sign in with OAuth 2.1 instead and cannot send a static header. Let them connect without weakening the token rules.

## Why this is not built
It adds an authorization server (authorize and token endpoints, dynamic client registration, discovery documents at `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`, a consent screen) and so a new sign-in surface and probably a gem. That is a decision for Alex (see "No new infrastructure without asking" in `docs/rules/conventions.md`), so `ai-worker-agent-access` ships tokens only.

## Requirements
- Decide first: build the OAuth server in Rails, or leave Claude.ai out and document Claude Code and REST as the supported clients.
- If built: the person who consents must be a Space owner, picks the Space (and optional folder) and read-only or read-write, and the result is an ordinary `AgentToken` (hashed, revocable, listed on the settings screen) so every existing scoping and revocation rule still holds. Access tokens are short lived with refresh tokens that revoke with the agent token.
- `/mcp` answers `401` with a `WWW-Authenticate` header that points at the protected-resource metadata, as the MCP authorization spec asks.
- Do not loosen the rule that only Space owners create agent access.

## Acceptance criteria
- Claude.ai adds `https://<host>/mcp` as a connector, signs in, and reads one document in the chosen Space; it cannot reach any other Space.
- Revoking the agent in the settings screen stops the connector at once.
- Tests cover the OAuth flow, scoping and revocation; docs are updated and this file is removed.
