import fs from "fs/promises"
import path from "path"
import { z } from "zod"
import type { ProviderName } from "@/lib/types/model-config"

export const ServerProviderSchema = z.object({
    name: z.string().min(1),
    models: z.array(z.string().min(1)),
    // Optional: custom environment variable name(s) for API key (load balancing support)
    apiKeyEnv: z
        .union([z.string().min(1), z.array(z.string().min(1)).min(1)])
        .optional(),
    // Optional: custom environment variable name for base URL
    baseUrlEnv: z.string().min(1).optional(),
    // Optional: mark the first model in this provider as the default
    default: z.boolean().optional(),
})

export const ServerModelsConfigSchema = z.object({
    providers: z.array(ServerProviderSchema),
})

export type ServerProviderConfig = z.infer<typeof ServerProviderSchema>
export type ServerModelsConfig = z.infer<typeof ServerModelsConfigSchema>

export interface FlattenedServerModel {
    id: string // "server:<slugified-name>:<modelId>"
    modelId: string
    provider: ProviderName // Always "openai"
    providerLabel: string
    isDefault: boolean
    apiKeyEnv?: string | string[]
    baseUrlEnv?: string
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
}

function getConfigPath(): string {
    const custom = process.env.AI_MODELS_CONFIG_PATH
    if (custom && custom.trim().length > 0) return custom
    return path.join(process.cwd(), "ai-models.json")
}

export async function loadRawServerModelsConfig(): Promise<ServerModelsConfig | null> {
    // Priority 1: AI_MODELS_CONFIG env var (JSON string) - for cloud deployments
    const envConfig = process.env.AI_MODELS_CONFIG
    if (envConfig && envConfig.trim().length > 0) {
        try {
            const json = JSON.parse(envConfig)
            return ServerModelsConfigSchema.parse(json)
        } catch (err) {
            console.error(
                "[server-model-config] Failed to parse AI_MODELS_CONFIG:",
                err,
            )
            return null
        }
    }

    // Priority 2: ai-models.json file
    const configPath = getConfigPath()
    try {
        const jsonStr = await fs.readFile(configPath, "utf8")
        const json = JSON.parse(jsonStr)
        return ServerModelsConfigSchema.parse(json)
    } catch (err: any) {
        if (err?.code === "ENOENT") {
            return null
        }
        console.error(
            "[server-model-config] Failed to load ai-models.json:",
            err,
        )
        return null
    }
}

export async function loadFlattenedServerModels(): Promise<
    FlattenedServerModel[]
> {
    // Priority 1: ai-models.json / AI_MODELS_CONFIG
    const cfg = await loadRawServerModelsConfig()
    if (cfg) {
        const defaultModelId = process.env.AI_MODEL
        const flattened: FlattenedServerModel[] = []

        for (const p of cfg.providers) {
            const providerLabel = p.name
            const nameSlug = slugify(p.name)

            for (const modelId of p.models) {
                const id = `server:${nameSlug}:${modelId}`
                const isDefault =
                    (p.default === true && modelId === p.models[0]) ||
                    (!!defaultModelId && modelId === defaultModelId)

                flattened.push({
                    id,
                    modelId,
                    provider: "openai",
                    providerLabel,
                    isDefault,
                    apiKeyEnv: p.apiKeyEnv,
                    baseUrlEnv: p.baseUrlEnv,
                })
            }
        }
        return flattened
    }

    // Priority 2: fall back to AI_MODEL / AI_API_KEY / AI_BASE_URL env vars
    const modelId = process.env.AI_MODEL
    const apiKey = process.env.AI_API_KEY
    if (modelId && apiKey) {
        return [
            {
                id: `server:default:${modelId}`,
                modelId,
                provider: "openai",
                providerLabel: "Server Default",
                isDefault: true,
            },
        ]
    }

    return []
}

/**
 * Find a server model by its ID (format: "server:<slugified-name>:<modelId>")
 */
export async function findServerModelById(
    modelId: string,
): Promise<FlattenedServerModel | null> {
    if (!modelId.startsWith("server:")) return null
    const models = await loadFlattenedServerModels()
    return models.find((m) => m.id === modelId) || null
}
