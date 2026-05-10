/**
 *
 * GET /api/hub/prompt-registry
 * Returns the versioned prompt registry with A/B metrics.
 */

export default defineEventHandler(() => getPromptRegistry())
