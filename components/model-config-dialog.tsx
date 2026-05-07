"use client"

import {
    Check,
    Clock,
    Edit2,
    Eye,
    EyeOff,
    Key,
    Link2,
    Loader2,
    Plus,
    Server,
    Tag,
    Trash2,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { useDictionary } from "@/hooks/use-dictionary"
import type { UseModelConfigReturn } from "@/hooks/use-model-config"
import { getApiEndpoint } from "@/lib/base-path"
import { SUGGESTED_MODELS } from "@/lib/types/model-config"
import { cn } from "@/lib/utils"

interface ModelConfigDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    modelConfig: UseModelConfigReturn
}

type ValidationStatus = "idle" | "validating" | "success" | "error"

// Form state for add/edit endpoint
interface EndpointForm {
    name: string
    baseUrl: string
    apiKey: string
    modelIds: string[] // one or more model IDs under this endpoint
}

const EMPTY_FORM: EndpointForm = {
    name: "",
    baseUrl: "",
    apiKey: "",
    modelIds: [""],
}

export function ModelConfigDialog({
    open,
    onOpenChange,
    modelConfig,
}: ModelConfigDialogProps) {
    const dict = useDictionary()

    const {
        config,
        models,
        selectedModelId,
        showUnvalidatedModels,
        setSelectedModelId,
        setShowUnvalidatedModels,
        addProvider,
        updateProvider,
        deleteProvider,
        addModel,
        deleteModel,
    } = modelConfig

    // Which provider is being edited (null = none / add mode)
    const [editProviderId, setEditProviderId] = useState<string | null>(null)
    // Show the add/edit form?
    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm] = useState<EndpointForm>(EMPTY_FORM)
    const [showApiKey, setShowApiKey] = useState(false)
    const [validationStatus, setValidationStatus] =
        useState<ValidationStatus>("idle")
    const [validationError, setValidationError] = useState("")
    const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    )
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [customModelInput, setCustomModelInput] = useState("")

    useEffect(() => {
        return () => {
            if (validationTimerRef.current)
                clearTimeout(validationTimerRef.current)
        }
    }, [])

    // Open form to add a new endpoint
    const handleAddEndpoint = () => {
        setEditProviderId(null)
        setForm(EMPTY_FORM)
        setShowApiKey(false)
        setValidationStatus("idle")
        setValidationError("")
        setCustomModelInput("")
        setFormOpen(true)
    }

    // Open form to edit an existing provider
    const handleEditProvider = (providerId: string) => {
        const provider = config.providers.find((p) => p.id === providerId)
        if (!provider) return
        setEditProviderId(providerId)
        setForm({
            name: provider.name || "",
            baseUrl: provider.baseUrl || "",
            apiKey: provider.apiKey,
            modelIds:
                provider.models.length > 0
                    ? provider.models.map((m) => m.modelId)
                    : [""],
        })
        setShowApiKey(false)
        setValidationStatus("idle")
        setValidationError("")
        setCustomModelInput("")
        setFormOpen(true)
    }

    // Validate the current form's credentials + first model
    const handleValidate = useCallback(async () => {
        const testModel = form.modelIds.find((id) => id.trim())
        if (!testModel || !form.apiKey.trim()) {
            setValidationError(
                dict.modelConfig?.addModelFirst || "Fill in API key and model",
            )
            setValidationStatus("error")
            return
        }
        setValidationStatus("validating")
        setValidationError("")

        try {
            const res = await fetch(getApiEndpoint("/api/validate-model"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiKey: form.apiKey.trim(),
                    baseUrl: form.baseUrl.trim() || undefined,
                    modelId: testModel.trim(),
                }),
            })
            const data = await res.json()
            if (data.valid) {
                setValidationStatus("success")
                if (validationTimerRef.current)
                    clearTimeout(validationTimerRef.current)
                validationTimerRef.current = setTimeout(
                    () => setValidationStatus("idle"),
                    2000,
                )
            } else {
                setValidationStatus("error")
                setValidationError(
                    data.error ||
                        dict.modelConfig?.validationError ||
                        "Validation failed",
                )
            }
        } catch {
            setValidationStatus("error")
            setValidationError("Network error")
        }
    }, [form, dict.modelConfig])

    // Save the form (add or update provider+models)
    const handleSave = () => {
        const validModels = form.modelIds.filter((id) => id.trim())
        if (!form.apiKey.trim() || validModels.length === 0) return

        if (editProviderId) {
            // Update existing provider
            const provider = config.providers.find(
                (p) => p.id === editProviderId,
            )
            if (!provider) return

            updateProvider(editProviderId, {
                name: form.name.trim() || undefined,
                baseUrl: form.baseUrl.trim() || undefined,
                apiKey: form.apiKey.trim(),
                validated: validationStatus === "success",
            })

            // Sync models: remove deleted, add new
            const existingIds = provider.models.map((m) => m.modelId)
            const toAdd = validModels.filter((id) => !existingIds.includes(id))
            const toRemove = provider.models.filter(
                (m) => !validModels.includes(m.modelId),
            )

            for (const m of toRemove) {
                deleteModel(editProviderId, m.id)
            }
            for (const modelId of toAdd) {
                addModel(editProviderId, modelId)
            }
        } else {
            // Add new provider
            const newProvider = addProvider()
            updateProvider(newProvider.id, {
                name: form.name.trim() || undefined,
                baseUrl: form.baseUrl.trim() || undefined,
                apiKey: form.apiKey.trim(),
                validated: validationStatus === "success",
            })
            for (const modelId of validModels) {
                addModel(newProvider.id, modelId)
            }
        }

        setFormOpen(false)
    }

    const handleDeleteProvider = (id: string) => {
        deleteProvider(id)
        setDeleteConfirmId(null)
        if (formOpen && editProviderId === id) setFormOpen(false)
    }

    // Add a model row to the form
    const handleAddModelRow = (modelId?: string) => {
        const id = (modelId || customModelInput).trim()
        if (!id) return
        if (!form.modelIds.includes(id)) {
            setForm((f) => ({ ...f, modelIds: [...f.modelIds, id] }))
        }
        setCustomModelInput("")
    }

    const handleRemoveModelRow = (idx: number) => {
        setForm((f) => ({
            ...f,
            modelIds: f.modelIds.filter((_, i) => i !== idx),
        }))
    }

    // User models (from providers)
    const userModels = models.filter((m) => m.source === "user")
    const serverModels = models.filter((m) => m.source === "server")

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl h-[80vh] max-h-[760px] overflow-hidden flex flex-col gap-0 p-0">
                    <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-primary" />
                            {dict.modelConfig?.title ||
                                "AI Model Configuration"}
                        </DialogTitle>
                        <DialogDescription>
                            {dict.modelConfig?.description ||
                                "Configure OpenAI-compatible API endpoints"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border/50">
                        {/* Left: model list */}
                        <div className="w-56 shrink-0 flex flex-col border-r border-border/50">
                            <ScrollArea className="flex-1 px-2 py-2">
                                {/* Server models */}
                                {serverModels.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                                            {dict.modelConfig?.serverModels ||
                                                "Server Models"}
                                        </p>
                                        {serverModels.map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedModelId(m.id)
                                                }
                                                className={cn(
                                                    "w-full text-left px-2 py-2 rounded-lg text-sm transition-colors",
                                                    selectedModelId === m.id
                                                        ? "bg-primary/10 text-primary"
                                                        : "hover:bg-muted",
                                                )}
                                            >
                                                <div className="font-medium truncate">
                                                    {m.modelId}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {m.providerLabel}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* User models */}
                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                                        {dict.modelConfig?.userModels ||
                                            "My Models"}
                                    </p>
                                    {userModels.length === 0 && (
                                        <p className="text-xs text-muted-foreground px-2 py-2">
                                            {dict.modelConfig
                                                ?.addProviderHint ||
                                                "Add a model to get started"}
                                        </p>
                                    )}
                                    {userModels.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() =>
                                                setSelectedModelId(m.id)
                                            }
                                            className={cn(
                                                "w-full text-left px-2 py-2 rounded-lg text-sm transition-colors",
                                                selectedModelId === m.id
                                                    ? "bg-primary/10 text-primary"
                                                    : "hover:bg-muted",
                                                !m.validated &&
                                                    !showUnvalidatedModels &&
                                                    "opacity-50",
                                            )}
                                        >
                                            <div className="font-medium truncate">
                                                {m.modelId}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {m.providerLabel}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="px-2 py-2 border-t border-border/50 space-y-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full justify-start gap-1.5"
                                    onClick={handleAddEndpoint}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    {dict.modelConfig?.addProvider ||
                                        "Add Endpoint"}
                                </Button>
                            </div>
                        </div>

                        {/* Right: form / welcome */}
                        <div className="flex-1 overflow-auto">
                            {formOpen ? (
                                <div className="p-5 space-y-4">
                                    <h3 className="text-sm font-semibold">
                                        {editProviderId
                                            ? dict.modelConfig?.configuration ||
                                              "Edit Endpoint"
                                            : dict.modelConfig?.addProvider ||
                                              "Add Endpoint"}
                                    </h3>

                                    {/* Name */}
                                    <div className="space-y-1">
                                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Tag className="h-3.5 w-3.5" />
                                            {dict.modelConfig?.displayName ||
                                                "Name"}{" "}
                                            <span className="opacity-60">
                                                {dict.modelConfig?.optional ||
                                                    "(optional)"}
                                            </span>
                                        </Label>
                                        <Input
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    name: e.target.value,
                                                }))
                                            }
                                            placeholder="e.g. Qwen API"
                                            className="h-8 text-sm"
                                        />
                                    </div>

                                    {/* Base URL */}
                                    <div className="space-y-1">
                                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Link2 className="h-3.5 w-3.5" />
                                            {dict.modelConfig?.baseUrl ||
                                                "Base URL"}{" "}
                                            <span className="opacity-60">
                                                {dict.modelConfig?.optional ||
                                                    "(optional)"}
                                            </span>
                                        </Label>
                                        <Input
                                            value={form.baseUrl}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    baseUrl: e.target.value,
                                                }))
                                            }
                                            placeholder="https://api.example.com/v1"
                                            className="h-8 text-sm font-mono"
                                        />
                                    </div>

                                    {/* API Key */}
                                    <div className="space-y-1">
                                        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Key className="h-3.5 w-3.5" />
                                            {dict.modelConfig?.apiKey ||
                                                "API Key"}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={
                                                    showApiKey
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={form.apiKey}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        apiKey: e.target.value,
                                                    }))
                                                }
                                                placeholder={
                                                    dict.modelConfig
                                                        ?.enterApiKey ||
                                                    "sk-..."
                                                }
                                                className="h-8 text-sm pr-8 font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowApiKey((v) => !v)
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showApiKey ? (
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Eye className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Models */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            {dict.modelConfig?.models ||
                                                "Models"}
                                        </Label>
                                        <div className="space-y-1">
                                            {form.modelIds.map((id, idx) => (
                                                <div
                                                    key={`model-${String(idx)}`}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Input
                                                        value={id}
                                                        onChange={(e) => {
                                                            const next = [
                                                                ...form.modelIds,
                                                            ]
                                                            next[idx] =
                                                                e.target.value
                                                            setForm((f) => ({
                                                                ...f,
                                                                modelIds: next,
                                                            }))
                                                        }}
                                                        placeholder={
                                                            dict.modelConfig
                                                                ?.modelId ||
                                                            "gpt-4o"
                                                        }
                                                        className="h-8 text-sm font-mono flex-1"
                                                    />
                                                    {form.modelIds.length >
                                                        1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveModelRow(
                                                                    idx,
                                                                )
                                                            }
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Custom model input */}
                                        <div className="flex gap-1 mt-1">
                                            <Input
                                                value={customModelInput}
                                                onChange={(e) =>
                                                    setCustomModelInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault()
                                                        handleAddModelRow()
                                                    }
                                                }}
                                                placeholder={
                                                    dict.modelConfig
                                                        ?.customModelId ||
                                                    "Custom model ID..."
                                                }
                                                className="h-7 text-xs font-mono flex-1"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs px-2"
                                                onClick={() =>
                                                    handleAddModelRow()
                                                }
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        {/* Suggested models */}
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {SUGGESTED_MODELS.filter(
                                                (id) =>
                                                    !form.modelIds.includes(id),
                                            )
                                                .slice(0, 6)
                                                .map((id) => (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() =>
                                                            handleAddModelRow(
                                                                id,
                                                            )
                                                        }
                                                        className="text-[11px] px-2 py-0.5 rounded-full border border-border/60 hover:bg-muted transition-colors font-mono"
                                                    >
                                                        {id}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Validation status */}
                                    {validationStatus === "error" && (
                                        <p className="text-xs text-destructive">
                                            {validationError}
                                        </p>
                                    )}
                                    {validationStatus === "success" && (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <Check className="h-3.5 w-3.5" />
                                            {dict.modelConfig?.verified ||
                                                "Verified"}
                                        </p>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleValidate}
                                            disabled={
                                                validationStatus ===
                                                "validating"
                                            }
                                            className="gap-1.5"
                                        >
                                            {validationStatus ===
                                            "validating" ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : validationStatus ===
                                              "success" ? (
                                                <Check className="h-3.5 w-3.5 text-green-600" />
                                            ) : (
                                                <Clock className="h-3.5 w-3.5" />
                                            )}
                                            {dict.modelConfig?.test || "Test"}
                                        </Button>

                                        <div className="flex-1" />

                                        {editProviderId && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() =>
                                                    setDeleteConfirmId(
                                                        editProviderId,
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setFormOpen(false)}
                                        >
                                            {dict.modelConfig?.cancel ||
                                                "Cancel"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSave}
                                            disabled={
                                                !form.apiKey.trim() ||
                                                !form.modelIds.some((id) =>
                                                    id.trim(),
                                                )
                                            }
                                        >
                                            {dict.common?.save || "Save"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* Endpoint list / welcome screen */
                                <div className="p-5">
                                    {config.providers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                                            <Server className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {dict.modelConfig
                                                    ?.configureProviders ||
                                                    "No endpoints configured"}
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={handleAddEndpoint}
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                {dict.modelConfig
                                                    ?.addProvider ||
                                                    "Add Endpoint"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground mb-3">
                                                {dict.modelConfig
                                                    ?.apiKeyStored ||
                                                    "API keys are stored locally in your browser"}
                                            </p>
                                            {config.providers.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-accent/30 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {p.name ||
                                                                "OpenAI Compatible"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate font-mono">
                                                            {p.baseUrl ||
                                                                "api.openai.com"}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {p.models.length}{" "}
                                                            model
                                                            {p.models.length !==
                                                            1
                                                                ? "s"
                                                                : ""}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleEditProvider(
                                                                p.id,
                                                            )
                                                        }
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteConfirmId(
                                                                p.id,
                                                            )
                                                        }
                                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/50 flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 flex-1">
                            <Switch
                                id="show-unvalidated"
                                checked={showUnvalidatedModels}
                                onCheckedChange={setShowUnvalidatedModels}
                            />
                            <Label
                                htmlFor="show-unvalidated"
                                className="text-xs text-muted-foreground cursor-pointer"
                            >
                                {dict.modelConfig?.showUnvalidatedModels ||
                                    "Show unvalidated models"}
                            </Label>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteConfirmId}
                onOpenChange={(o) => !o && setDeleteConfirmId(null)}
            >
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {dict.modelConfig?.deleteProvider ||
                                "Delete Endpoint?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.modelConfig?.deleteProvider
                                ? `${dict.modelConfig.deleteProvider}?`
                                : "This will remove all configured models for this endpoint."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {dict.modelConfig?.cancel || "Cancel"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                deleteConfirmId &&
                                handleDeleteProvider(deleteConfirmId)
                            }
                            className="border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                            {dict.modelConfig?.delete || "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
