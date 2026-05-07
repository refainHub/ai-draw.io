// Types for OpenAI-compatible model configuration

export type ProviderName = "openai"

// Individual model configuration
export interface ModelConfig {
    id: string // UUID for this model
    modelId: string // e.g., "gpt-4o", "deepseek-chat", "qwen-plus"
    validated?: boolean
    validationError?: string
}

// Provider (endpoint) configuration
export interface ProviderConfig {
    id: string // UUID for this provider config
    name?: string // Custom display name (e.g., "Qwen Production")
    apiKey: string
    baseUrl?: string // OpenAI-compatible endpoint
    models: ModelConfig[]
    validated?: boolean
}

// The complete multi-model configuration
export interface MultiModelConfig {
    version: 1
    providers: ProviderConfig[]
    selectedModelId?: string
    showUnvalidatedModels?: boolean
}

// Flattened model for dropdown display
export interface FlattenedModel {
    id: string // Model config UUID or synthetic server ID
    modelId: string
    provider: ProviderName
    providerLabel: string
    apiKey: string
    baseUrl?: string
    validated?: boolean
    source?: "user" | "server"
    isDefault?: boolean
    apiKeyEnv?: string | string[]
    baseUrlEnv?: string
}

// Provider display info
export const PROVIDER_INFO: Record<
    ProviderName,
    { label: string; defaultBaseUrl?: string }
> = {
    openai: {
        label: "OpenAI Compatible",
        defaultBaseUrl: "",
    },
}

// Common model suggestions (OpenAI-compatible model IDs)
export const SUGGESTED_MODELS: string[] = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "claude-sonnet-4-5-20250514",
    "claude-opus-4-20250514",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "deepseek-chat",
    "deepseek-reasoner",
    "qwen-plus",
    "qwen-max",
    "Qwen/Qwen3-235B-A22B-Instruct-2507",
]

// Helper to generate UUID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Create empty config
export function createEmptyConfig(): MultiModelConfig {
    return {
        version: 1,
        providers: [],
        selectedModelId: undefined,
    }
}

// Create new provider config
export function createProviderConfig(): ProviderConfig {
    return {
        id: generateId(),
        provider: "openai" as ProviderName,
        apiKey: "",
        baseUrl: "",
        models: [],
        validated: false,
    } as any
}

// Create new model config
export function createModelConfig(modelId: string): ModelConfig {
    return {
        id: generateId(),
        modelId,
    }
}

// Get all models as flattened list for dropdown (user-defined only)
export function flattenModels(config: MultiModelConfig): FlattenedModel[] {
    const models: FlattenedModel[] = []

    for (const provider of config.providers) {
        const providerLabel = provider.name || "OpenAI Compatible"

        for (const model of provider.models) {
            models.push({
                id: model.id,
                modelId: model.modelId,
                provider: "openai",
                providerLabel,
                apiKey: provider.apiKey,
                baseUrl: provider.baseUrl,
                validated: model.validated,
                source: "user",
                isDefault: false,
            })
        }
    }

    return models
}

// Find model by ID
export function findModelById(
    config: MultiModelConfig,
    modelId: string,
): FlattenedModel | undefined {
    return flattenModels(config).find((m) => m.id === modelId)
}
