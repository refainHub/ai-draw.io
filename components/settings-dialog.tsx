"use client"

import { ChevronRight, Moon, Sun, Tag } from "lucide-react"
import { Suspense, useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useDictionary } from "@/hooks/use-dictionary"
import { STORAGE_KEYS } from "@/lib/storage"

// Reusable setting item component for consistent layout
function SettingItem({
    label,
    description,
    children,
}: {
    label: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-medium">{label}</Label>
                {description && (
                    <p className="text-xs text-muted-foreground max-w-[260px]">
                        {description}
                    </p>
                )}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    drawioUi: "min" | "sketch"
    onToggleDrawioUi: () => void
    darkMode: boolean
    onToggleDarkMode: () => void
    minimalStyle?: boolean
    onMinimalStyleChange?: (value: boolean) => void
    vlmValidationEnabled?: boolean
    onVlmValidationChange?: (value: boolean) => void
    onOpenModelConfig?: () => void
    customSystemMessage?: string
    onCustomSystemMessageChange?: (value: string) => void
}

function SettingsContent({
    open,
    onOpenChange,
    drawioUi,
    onToggleDrawioUi,
    darkMode,
    onToggleDarkMode,
    minimalStyle = false,
    onMinimalStyleChange = () => {},
    vlmValidationEnabled = false,
    onVlmValidationChange = () => {},
    onOpenModelConfig,
    customSystemMessage = "",
    onCustomSystemMessageChange = () => {},
}: SettingsDialogProps) {
    const dict = useDictionary()
    const [sendShortcut, setSendShortcut] = useState("ctrl-enter")

    // Panel visibility state
    const [showRecentChats, setShowRecentChats] = useState(true)
    const [showMyTemplates, setShowMyTemplates] = useState(true)
    const [showQuickExamples, setShowQuickExamples] = useState(true)

    const handlePanelToggle = useCallback(
        (key: string, value: boolean, setter: (v: boolean) => void) => {
            setter(value)
            localStorage.setItem(key, String(value))
            window.dispatchEvent(new CustomEvent("panelVisibilityChange"))
        },
        [],
    )

    useEffect(() => {
        if (open) {
            const storedSendShortcut = localStorage.getItem(
                STORAGE_KEYS.sendShortcut,
            )
            setSendShortcut(storedSendShortcut || "ctrl-enter")

            setShowRecentChats(
                localStorage.getItem(STORAGE_KEYS.showRecentChats) !== "false",
            )
            setShowMyTemplates(
                localStorage.getItem(STORAGE_KEYS.showMyTemplates) !== "false",
            )
            setShowQuickExamples(
                localStorage.getItem(STORAGE_KEYS.showQuickExamples) !==
                    "false",
            )
        }
    }, [open])

    return (
        <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>{dict.settings.title}</DialogTitle>
                <DialogDescription className="mt-1">
                    {dict.settings.description}
                </DialogDescription>
            </DialogHeader>

            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto flex-1 scrollbar-thin">
                <div className="divide-y divide-border-subtle">
                    {/* API Keys & Models */}
                    {onOpenModelConfig && (
                        <SettingItem
                            label={dict.settings.apiKeysModels}
                            description={dict.settings.apiKeysModelsDescription}
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => {
                                    onOpenChange(false)
                                    onOpenModelConfig()
                                }}
                                aria-label={dict.settings.apiKeysModels}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </SettingItem>
                    )}

                    {/* Language - Hidden as project now uses static Chinese dictionary */}

                    {/* Theme */}
                    <SettingItem
                        label={dict.settings.theme}
                        description={dict.settings.themeDescription}
                    >
                        <Button
                            id="theme-toggle"
                            variant="outline"
                            size="icon"
                            onClick={onToggleDarkMode}
                            className="h-9 w-9 rounded-xl border-border-subtle hover:bg-interactive-hover"
                        >
                            {darkMode ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </Button>
                    </SettingItem>

                    {/* Draw.io Style */}
                    <SettingItem
                        label={dict.settings.drawioStyle}
                        description={`${dict.settings.drawioStyleDescription} ${
                            drawioUi === "min"
                                ? dict.settings.minimal
                                : dict.settings.sketch
                        }`}
                    >
                        <Button
                            id="drawio-ui"
                            variant="outline"
                            onClick={onToggleDrawioUi}
                            className="h-9 w-[120px] rounded-xl border-border-subtle hover:bg-interactive-hover font-normal"
                        >
                            {dict.settings.switchTo}{" "}
                            {drawioUi === "min"
                                ? dict.settings.sketch
                                : dict.settings.minimal}
                        </Button>
                    </SettingItem>

                    {/* Diagram Style */}
                    <SettingItem
                        label={dict.settings.diagramStyle}
                        description={dict.settings.diagramStyleDescription}
                    >
                        <div className="flex items-center gap-2">
                            <Switch
                                id="minimal-style"
                                checked={minimalStyle}
                                onCheckedChange={onMinimalStyleChange}
                            />
                            <span className="text-sm text-muted-foreground">
                                {minimalStyle
                                    ? dict.chat.minimalStyle
                                    : dict.chat.styledMode}
                            </span>
                        </div>
                    </SettingItem>

                    {/* Panel Visibility */}
                    <SettingItem
                        label={dict.settings.panelVisibility}
                        description={dict.settings.panelVisibilityDescription}
                    >
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch
                                    id="show-recent-chats"
                                    checked={showRecentChats}
                                    onCheckedChange={(v) =>
                                        handlePanelToggle(
                                            STORAGE_KEYS.showRecentChats,
                                            v,
                                            setShowRecentChats,
                                        )
                                    }
                                />
                                <span className="text-xs text-muted-foreground">
                                    {dict.settings.showRecentChats}
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch
                                    id="show-my-templates"
                                    checked={showMyTemplates}
                                    onCheckedChange={(v) =>
                                        handlePanelToggle(
                                            STORAGE_KEYS.showMyTemplates,
                                            v,
                                            setShowMyTemplates,
                                        )
                                    }
                                />
                                <span className="text-xs text-muted-foreground">
                                    {dict.settings.showMyTemplates}
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch
                                    id="show-quick-examples"
                                    checked={showQuickExamples}
                                    onCheckedChange={(v) =>
                                        handlePanelToggle(
                                            STORAGE_KEYS.showQuickExamples,
                                            v,
                                            setShowQuickExamples,
                                        )
                                    }
                                />
                                <span className="text-xs text-muted-foreground">
                                    {dict.settings.showQuickExamples}
                                </span>
                            </label>
                        </div>
                    </SettingItem>

                    {/* VLM Diagram Validation */}
                    <SettingItem
                        label={dict.settings.diagramValidation}
                        description={dict.settings.diagramValidationDescription}
                    >
                        <div className="flex items-center gap-2">
                            <Switch
                                id="vlm-validation"
                                checked={vlmValidationEnabled}
                                onCheckedChange={onVlmValidationChange}
                            />
                            <span className="text-sm text-muted-foreground">
                                {vlmValidationEnabled
                                    ? dict.settings.enabled
                                    : dict.settings.disabled}
                            </span>
                        </div>
                    </SettingItem>

                    {/* Custom System Message */}
                    <div className="py-4 space-y-3">
                        <div className="space-y-0.5">
                            <Label
                                htmlFor="custom-system-message"
                                className="text-sm font-medium"
                            >
                                {dict.settings.customSystemMessage}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {dict.settings.customSystemMessageDescription}
                            </p>
                        </div>
                        <Textarea
                            id="custom-system-message"
                            value={customSystemMessage}
                            onChange={(e) =>
                                onCustomSystemMessageChange(e.target.value)
                            }
                            placeholder={
                                dict.settings.customSystemMessagePlaceholder
                            }
                            className="min-h-[80px] max-h-[160px] text-sm"
                            maxLength={5000}
                        />
                    </div>

                    {/* Send Shortcut */}
                    <SettingItem
                        label={dict.settings.sendShortcut}
                        description={dict.settings.sendShortcutDescription}
                    >
                        <Select
                            value={sendShortcut}
                            onValueChange={(value) => {
                                setSendShortcut(value)
                                localStorage.setItem(
                                    STORAGE_KEYS.sendShortcut,
                                    value,
                                )
                                window.dispatchEvent(
                                    new CustomEvent("sendShortcutChange", {
                                        detail: value,
                                    }),
                                )
                            }}
                        >
                            <SelectTrigger
                                id="send-shortcut-select"
                                className="w-auto h-9 rounded-xl"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="enter">
                                    {dict.settings.enterToSend}
                                </SelectItem>
                                <SelectItem value="ctrl-enter">
                                    {dict.settings.ctrlEnterToSend}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingItem>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-subtle bg-surface-1/50 rounded-b-2xl">
                <div className="flex items-center justify-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {process.env.APP_VERSION}
                    </span>
                </div>
            </div>
        </DialogContent>
    )
}

export function SettingsDialog(props: SettingsDialogProps) {
    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <Suspense
                fallback={
                    <DialogContent className="sm:max-w-lg p-0">
                        <div className="h-80 flex items-center justify-center">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    </DialogContent>
                }
            >
                <SettingsContent {...props} />
            </Suspense>
        </Dialog>
    )
}
