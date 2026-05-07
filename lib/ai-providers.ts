import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderName } from "@/lib/types/model-config"

export type { ProviderName }

interface ModelConfig {
    model: any
    providerOptions?: any
    headers?: Record<string, string>
    modelId: string
    provider: ProviderName
}

// OpenAI-compatible endpoints with custom baseUrl often reject multiple system messages
// (open-source models using Qwen/Llama chat templates). Always treat custom endpoints
// as single-system-prompt providers.
export const SINGLE_SYSTEM_PROVIDERS = new Set<ProviderName>()

export interface ClientOverrides {
    provider?: string | null // Ignored — always uses openai-compatible
    baseUrl?: string | null
    apiKey?: string | null
    modelId?: string | null
    // Custom env var name(s) for server models
    apiKeyEnv?: string | string[]
    baseUrlEnv?: string
}

/**
 * Resolve API key: client override > custom env var > default env var
 */
function resolveApiKey(
    overrides: ClientOverrides | undefined,
    defaultEnvVar: string,
): string | undefined {
    if (overrides?.apiKey) return overrides.apiKey

    if (overrides?.apiKeyEnv) {
        if (Array.isArray(overrides.apiKeyEnv)) {
            const validEnvVars = overrides.apiKeyEnv.filter(
                (envVar) => process.env[envVar],
            )
            if (validEnvVars.length > 0) {
                const selectedEnvVar =
                    validEnvVars[
                        Math.floor(Math.random() * validEnvVars.length)
                    ]
                console.log(
                    `[API Key Routing] Selected ${selectedEnvVar} from ${validEnvVars.length} available keys`,
                )
                return process.env[selectedEnvVar]
            }
        } else {
            return process.env[overrides.apiKeyEnv]
        }
    }

    return process.env[defaultEnvVar]
}

/**
 * Resolve base URL from custom env var or default env var.
 */
function resolveBaseUrlEnv(
    overrides: ClientOverrides | undefined,
    defaultEnvVar: string,
): string | undefined {
    if (overrides?.baseUrlEnv) return process.env[overrides.baseUrlEnv]
    return process.env[defaultEnvVar]
}

/**
 * Get the AI model using OpenAI-compatible API.
 *
 * Environment variables:
 * - AI_API_KEY: API key for the OpenAI-compatible endpoint
 * - AI_BASE_URL: Base URL of the endpoint (optional, defaults to OpenAI)
 * - AI_MODEL: Model ID to use
 */
export function getAIModel(overrides?: ClientOverrides): ModelConfig {
    // SECURITY: Prevent SSRF — if a custom baseUrl is provided, an API key MUST also be provided.
    if (overrides?.baseUrl && !overrides?.apiKey) {
        throw new Error(
            `API key is required when using a custom base URL. ` +
                `Please provide your own API key in Settings.`,
        )
    }

    const modelId = overrides?.modelId || process.env.AI_MODEL
    if (!modelId) {
        throw new Error(
            `AI_MODEL environment variable is required. Example: AI_MODEL=gpt-4o`,
        )
    }

    const apiKey = resolveApiKey(overrides, "AI_API_KEY")
    const serverBaseUrl = resolveBaseUrlEnv(overrides, "AI_BASE_URL")

    // When user provides own API key, only use their baseUrl (not server's)
    // to prevent leaking user credentials to unknown endpoints
    const baseURL = overrides?.apiKey
        ? overrides.baseUrl || undefined
        : overrides?.baseUrl || serverBaseUrl || undefined

    if (!apiKey) {
        throw new Error(
            `AI_API_KEY environment variable is required. ` +
                `Please set it in your .env.local file.`,
        )
    }

    console.log(`[AI Provider] OpenAI-compatible, model: ${modelId}`)

    const provider = createOpenAI({ apiKey, ...(baseURL && { baseURL }) })
    const model = provider.chat(modelId)

    return { model, modelId, provider: "openai" }
}

/**
 * Check if a model supports prompt caching.
 */
export function supportsPromptCaching(_modelId: string): boolean {
    return false
}

/**
 * Check if a model supports image/vision input.
 * Returns false for known text-only model patterns; true otherwise.
 */
export function supportsImageInput(modelId: string): boolean {
    const lower = modelId.toLowerCase()
    const hasVision = lower.includes("vision") || lower.includes("vl")
    if (lower.includes("deepseek") && !hasVision) return false
    if (
        lower.includes("qwen") &&
        !hasVision &&
        !lower.includes("qwen3.5") &&
        !lower.includes("qvq")
    )
        return false
    return true
}

/**
 * Get the AI model for diagram validation.
 */
export function getValidationModel(): ReturnType<typeof getAIModel>["model"] {
    const modelId = process.env.VALIDATION_MODEL || process.env.AI_MODEL
    if (!modelId) {
        throw new Error(
            "No validation model configured. Set VALIDATION_MODEL or AI_MODEL.",
        )
    }
    if (!supportsImageInput(modelId)) {
        throw new Error(
            `Validation requires a vision-capable model. Model "${modelId}" does not support image input.`,
        )
    }
    const { model } = getAIModel({ modelId })
    return model
}
