// Centralized localStorage keys for quota tracking and settings
// Chat data is now stored in IndexedDB via session-storage.ts

export const STORAGE_KEYS = {
    // Quota tracking
    requestCount: "refain-draw-request-count",
    requestDate: "refain-draw-request-date",
    tokenCount: "refain-draw-token-count",
    tokenDate: "refain-draw-token-date",
    tpmCount: "refain-draw-tpm-count",
    tpmMinute: "refain-draw-tpm-minute",

    // Settings
    accessCode: "refain-draw-access-code",
    accessCodeRequired: "refain-draw-access-code-required",
    aiProvider: "refain-draw-ai-provider",
    aiBaseUrl: "refain-draw-ai-base-url",
    aiApiKey: "refain-draw-ai-api-key",
    aiModel: "refain-draw-ai-model",

    // Multi-model configuration
    modelConfigs: "refain-draw-model-configs",
    selectedModelId: "refain-draw-selected-model-id",

    // Chat input preferences
    sendShortcut: "refain-draw-send-shortcut",

    // Diagram validation
    vlmValidationEnabled: "refain-draw-vlm-validation-enabled",

    // Custom system message
    customSystemMessage: "refain-draw-custom-system-message",

    // Panel visibility
    showRecentChats: "refain-draw-show-recent-chats",
    showMyTemplates: "refain-draw-show-my-templates",
    showQuickExamples: "refain-draw-show-quick-examples",
} as const

// Migration: migrate old keys to new keys (one-time)
const OLD_KEYS_PREFIX = "next-ai-draw-io-"
const NEW_KEYS_PREFIX = "refain-draw-"
const MIGRATION_FLAG = "refain-draw-storage-keys-migrated"

export function migrateOldStorageKeys(): void {
    if (typeof window === "undefined") return

    // Check if already migrated
    if (localStorage.getItem(MIGRATION_FLAG)) return

    try {
        // Migrate all keys that start with old prefix
        const keysToMigrate = Object.keys(STORAGE_KEYS)

        for (const keyName of keysToMigrate) {
            const newKey = STORAGE_KEYS[keyName as keyof typeof STORAGE_KEYS]
            const oldKey = newKey.replace(NEW_KEYS_PREFIX, OLD_KEYS_PREFIX)

            const oldValue = localStorage.getItem(oldKey)
            const newValue = localStorage.getItem(newKey)

            // Only migrate if old key exists and new key doesn't
            if (oldValue !== null && newValue === null) {
                localStorage.setItem(newKey, oldValue)
            }

            // Clean up old key after migration
            if (oldValue !== null) {
                localStorage.removeItem(oldKey)
            }
        }

        // Mark migration complete
        localStorage.setItem(MIGRATION_FLAG, "true")
    } catch (error) {
        console.warn("Storage key migration failed:", error)
    }
}
