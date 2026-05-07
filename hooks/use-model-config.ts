"use client"

import { useCallback, useEffect, useState } from "react"
import { getApiEndpoint } from "@/lib/base-path"
import type { FlattenedServerModel } from "@/lib/server-model-config"
import { STORAGE_KEYS } from "@/lib/storage"
import {
    createEmptyConfig,
    createModelConfig,
    createProviderConfig,
    type FlattenedModel,
    findModelById,
    flattenModels,
    type ModelConfig,
    type MultiModelConfig,
    type ProviderConfig,
    type ProviderName,
} from "@/lib/types/model-config"

/**
 * Load config from localStorage
 */
function loadConfig(): MultiModelConfig {
    if (typeof window === "undefined") return createEmptyConfig()

    const stored = localStorage.getItem(STORAGE_KEYS.modelConfigs)
    if (stored) {
        try {
            return JSON.parse(stored) as MultiModelConfig
        } catch {
            console.error("Failed to parse model config")
        }
    }

    return createEmptyConfig()
}

/**
 * Save config to localStorage
 */
function saveConfig(config: MultiModelConfig): void {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.modelConfigs, JSON.stringify(config))
}

export interface UseModelConfigReturn {
    // State
    config: MultiModelConfig
    isLoaded: boolean

    // Getters
    models: FlattenedModel[]
    selectedModel: FlattenedModel | undefined
    selectedModelId: string | undefined
    showUnvalidatedModels: boolean

    // Actions
    setSelectedModelId: (modelId: string | undefined) => void
    setShowUnvalidatedModels: (show: boolean) => void
    addProvider: (provider?: ProviderName) => ProviderConfig
    updateProvider: (
        providerId: string,
        updates: Partial<ProviderConfig>,
    ) => void
    deleteProvider: (providerId: string) => void
    addModel: (providerId: string, modelId: string) => ModelConfig
    updateModel: (
        providerId: string,
        modelConfigId: string,
        updates: Partial<ModelConfig>,
    ) => void
    deleteModel: (providerId: string, modelConfigId: string) => void
    resetConfig: () => void
}

export function useModelConfig(): UseModelConfigReturn {
    const [config, setConfig] = useState<MultiModelConfig>(createEmptyConfig)
    const [isLoaded, setIsLoaded] = useState(false)
    const [serverModels, setServerModels] = useState<FlattenedServerModel[]>([])
    const [serverLoaded, setServerLoaded] = useState(false)

    // Load client config on mount
    useEffect(() => {
        const loaded = loadConfig()
        setConfig(loaded)
        setIsLoaded(true)
    }, [])

    // Load server models on mount
    useEffect(() => {
        if (typeof window === "undefined") return

        fetch(getApiEndpoint("/api/server-models"))
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed: ${res.status}`)
                return res.json()
            })
            .then((data) => {
                const raw: FlattenedServerModel[] = data?.models || []
                setServerModels(raw)
                setServerLoaded(true)

                // Auto-select default server model if none selected
                setConfig((prev) => {
                    if (!prev.selectedModelId && raw.length > 0) {
                        const defaultModel = raw.find((m) => m.isDefault)
                        if (defaultModel) {
                            return { ...prev, selectedModelId: defaultModel.id }
                        }
                        return { ...prev, selectedModelId: raw[0].id }
                    }
                    return prev
                })
            })
            .catch((error) => {
                console.error("Error loading server models:", error)
                setServerLoaded(true)
            })
    }, [])

    // Save config whenever it changes
    useEffect(() => {
        if (isLoaded) {
            saveConfig(config)
        }
    }, [config, isLoaded])

    const userModels = flattenModels(config)

    const models: FlattenedModel[] = [
        ...serverModels.map((m) => ({
            id: m.id,
            modelId: m.modelId,
            provider: m.provider,
            providerLabel: `Server · ${m.providerLabel}`,
            apiKey: "",
            baseUrl: undefined,
            validated: true,
            source: "server" as const,
            isDefault: m.isDefault,
            apiKeyEnv: m.apiKeyEnv,
            baseUrlEnv: m.baseUrlEnv,
        })),
        ...userModels,
    ]

    const selectedModel = config.selectedModelId
        ? models.find((m) => m.id === config.selectedModelId)
        : undefined

    const setSelectedModelId = useCallback((modelId: string | undefined) => {
        setConfig((prev) => ({ ...prev, selectedModelId: modelId }))
    }, [])

    const setShowUnvalidatedModels = useCallback((show: boolean) => {
        setConfig((prev) => ({ ...prev, showUnvalidatedModels: show }))
    }, [])

    const addProvider = useCallback(
        (_provider?: ProviderName): ProviderConfig => {
            const newProvider = createProviderConfig()
            setConfig((prev) => ({
                ...prev,
                providers: [...prev.providers, newProvider],
            }))
            return newProvider
        },
        [],
    )

    const updateProvider = useCallback(
        (providerId: string, updates: Partial<ProviderConfig>) => {
            setConfig((prev) => ({
                ...prev,
                providers: prev.providers.map((p) =>
                    p.id === providerId ? { ...p, ...updates } : p,
                ),
            }))
        },
        [],
    )

    const deleteProvider = useCallback((providerId: string) => {
        setConfig((prev) => {
            const provider = prev.providers.find((p) => p.id === providerId)
            const modelIds = provider?.models.map((m) => m.id) || []
            const newSelectedId =
                prev.selectedModelId && modelIds.includes(prev.selectedModelId)
                    ? undefined
                    : prev.selectedModelId

            return {
                ...prev,
                providers: prev.providers.filter((p) => p.id !== providerId),
                selectedModelId: newSelectedId,
            }
        })
    }, [])

    const addModel = useCallback(
        (providerId: string, modelId: string): ModelConfig => {
            const newModel = createModelConfig(modelId)
            setConfig((prev) => ({
                ...prev,
                providers: prev.providers.map((p) =>
                    p.id === providerId
                        ? { ...p, models: [...p.models, newModel] }
                        : p,
                ),
            }))
            return newModel
        },
        [],
    )

    const updateModel = useCallback(
        (
            providerId: string,
            modelConfigId: string,
            updates: Partial<ModelConfig>,
        ) => {
            setConfig((prev) => ({
                ...prev,
                providers: prev.providers.map((p) =>
                    p.id === providerId
                        ? {
                              ...p,
                              models: p.models.map((m) =>
                                  m.id === modelConfigId
                                      ? { ...m, ...updates }
                                      : m,
                              ),
                          }
                        : p,
                ),
            }))
        },
        [],
    )

    const deleteModel = useCallback(
        (providerId: string, modelConfigId: string) => {
            setConfig((prev) => ({
                ...prev,
                providers: prev.providers.map((p) =>
                    p.id === providerId
                        ? {
                              ...p,
                              models: p.models.filter(
                                  (m) => m.id !== modelConfigId,
                              ),
                          }
                        : p,
                ),
                selectedModelId:
                    prev.selectedModelId === modelConfigId
                        ? undefined
                        : prev.selectedModelId,
            }))
        },
        [],
    )

    const resetConfig = useCallback(() => {
        setConfig(createEmptyConfig())
    }, [])

    return {
        config,
        isLoaded: isLoaded && serverLoaded,
        models,
        selectedModel,
        selectedModelId: config.selectedModelId,
        showUnvalidatedModels: config.showUnvalidatedModels ?? false,
        setSelectedModelId,
        setShowUnvalidatedModels,
        addProvider,
        updateProvider,
        deleteProvider,
        addModel,
        updateModel,
        deleteModel,
        resetConfig,
    }
}

/**
 * Get the AI config for the currently selected model.
 * Returns format compatible with chat-panel.tsx sendChatMessage().
 */
export function getSelectedAIConfig(): {
    aiBaseUrl: string
    aiApiKey: string
    aiModel: string
    selectedModelId: string
} {
    const empty = {
        aiBaseUrl: "",
        aiApiKey: "",
        aiModel: "",
        selectedModelId: "",
    }

    if (typeof window === "undefined") return empty

    const stored = localStorage.getItem(STORAGE_KEYS.modelConfigs)
    if (!stored) return empty

    let config: MultiModelConfig
    try {
        config = JSON.parse(stored)
    } catch {
        return empty
    }

    if (!config.selectedModelId) return empty

    // Server-side model selection — credentials resolved server-side
    if (config.selectedModelId.startsWith("server:")) {
        const parts = config.selectedModelId.split(":")
        const modelId = parts.slice(2).join(":")
        return {
            ...empty,
            aiModel: modelId,
            selectedModelId: config.selectedModelId,
        }
    }

    // User-defined model
    const model = findModelById(config, config.selectedModelId)
    if (!model) return empty

    return {
        aiBaseUrl: model.baseUrl || "",
        aiApiKey: model.apiKey,
        aiModel: model.modelId,
        selectedModelId: config.selectedModelId || "",
    }
}
