---
name: AI provider routing
description: Provider credential and request-budget constraints that affect live chat responses.
---

When an AI credential is supplied through the workspace, verify that its key format matches the upstream endpoint before treating a provider failure as an application bug. OpenRouter credentials use the OpenRouter-compatible endpoint and may require a smaller completion budget when account credits are limited. For free-tier chat, prefer OpenRouter's `openrouter/free` router over pinning a single `:free` model, since catalogued free models can still be unavailable or rate-limited at a provider.

**Why:** A server request can be fully wired and still fail if an OpenRouter-format credential is sent to the public OpenAI endpoint, the requested token ceiling exceeds the account's remaining credits, or a fixed free model's shared provider pool is unavailable.

**How to apply:** Keep provider credentials server-only, select the endpoint from the configured provider secret, and validate a real chat response after changing the provider, model route, or token budget.