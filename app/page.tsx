"use client"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { DrawIoEmbed } from "react-drawio"
import type { ImperativePanelHandle } from "react-resizable-panels"
import ChatPanel from "@/components/chat-panel"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useDiagram } from "@/contexts/diagram-context"
import {
    isIndexedDBUsable,
    migrateFromOldDatabase,
} from "@/lib/session-storage"
import { migrateOldStorageKeys } from "@/lib/storage"
import { migrateTemplatesFromOldDatabase } from "@/lib/template-storage"

export default function Home() {
    const {
        drawioRef,
        handleDiagramExport,
        handleDiagramAutoSave,
        onDrawioLoad,
        resetDrawioReady,
    } = useDiagram()
    const [isMobile, setIsMobile] = useState(false)
    const [isChatVisible, setIsChatVisible] = useState(true)
    const [drawioUi, setDrawioUi] = useState<"min" | "sketch">("min")
    const [darkMode, setDarkMode] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isDrawioReady, setIsDrawioReady] = useState(false)
    const [drawioLoadTimeout, setDrawioLoadTimeout] = useState(false)
    const [drawioKey, setDrawioKey] = useState(0)
    const [canPersist, setCanPersist] = useState(false)
    const [canPersistChecked, setCanPersistChecked] = useState(false)
    const [drawioBaseUrl] = useState(
        process.env.NEXT_PUBLIC_DRAWIO_BASE_URL || "https://embed.diagrams.net",
    )

    const chatPanelRef = useRef<ImperativePanelHandle>(null)
    const isMobileRef = useRef(false)

    // Load preferences from localStorage after mount
    useEffect(() => {
        // Migrate old storage keys to new keys (one-time)
        migrateOldStorageKeys()

        // Migrate old IndexedDB database to new database (one-time)
        void migrateFromOldDatabase()

        // Migrate old template database to new database (one-time)
        void migrateTemplatesFromOldDatabase()

        // Also migrate dark-mode key separately
        const oldDarkModeKey = "next-ai-draw-io-dark-mode"
        const newDarkModeKey = "refain-draw-dark-mode"
        const oldDarkMode = localStorage.getItem(oldDarkModeKey)
        const newDarkMode = localStorage.getItem(newDarkModeKey)
        if (oldDarkMode !== null && newDarkMode === null) {
            localStorage.setItem(newDarkModeKey, oldDarkMode)
            localStorage.removeItem(oldDarkModeKey)
        }

        const savedUi = localStorage.getItem("drawio-theme")
        if (savedUi === "min" || savedUi === "sketch") {
            setDrawioUi(savedUi)
        }

        const savedDarkMode = localStorage.getItem("refain-draw-dark-mode")
        if (savedDarkMode !== null) {
            const isDark = savedDarkMode === "true"
            setDarkMode(isDark)
            document.documentElement.classList.toggle("dark", isDark)
        } else {
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
            ).matches
            setDarkMode(prefersDark)
            document.documentElement.classList.toggle("dark", prefersDark)
        }

        void (async () => {
            const usable = await isIndexedDBUsable()
            setCanPersist(usable)
            setCanPersistChecked(true)
        })()
        setIsLoaded(true)
    }, [])

    const handleDrawioLoad = useCallback(() => {
        setDrawioLoadTimeout(false)
        setIsDrawioReady(true)
        onDrawioLoad()
    }, [onDrawioLoad])

    const handleDrawioAutoSave = useCallback(
        (data: { xml?: string }) => {
            handleDiagramAutoSave(data)
        },
        [handleDiagramAutoSave],
    )

    const handleDarkModeChange = () => {
        const newValue = !darkMode
        setDarkMode(newValue)
        localStorage.setItem("refain-draw-dark-mode", String(newValue))
        document.documentElement.classList.toggle("dark", newValue)
        setDrawioLoadTimeout(false)
        setIsDrawioReady(false)
        resetDrawioReady()
    }

    const handleDrawioUiChange = () => {
        const newUi = drawioUi === "min" ? "sketch" : "min"
        localStorage.setItem("drawio-theme", newUi)
        setDrawioUi(newUi)
        setDrawioLoadTimeout(false)
        setIsDrawioReady(false)
        resetDrawioReady()
    }

    // Check mobile - reset draw.io before crossing breakpoint
    const isInitialRenderRef = useRef(true)
    useEffect(() => {
        const checkMobile = () => {
            const newIsMobile = window.innerWidth < 768
            if (
                !isInitialRenderRef.current &&
                newIsMobile !== isMobileRef.current
            ) {
                setIsDrawioReady(false)
                resetDrawioReady()
            }
            isMobileRef.current = newIsMobile
            isInitialRenderRef.current = false
            setIsMobile(newIsMobile)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [resetDrawioReady])

    const toggleChatPanel = () => {
        const panel = chatPanelRef.current
        if (panel) {
            if (panel.isCollapsed()) {
                panel.expand()
                setIsChatVisible(true)
            } else {
                panel.collapse()
                setIsChatVisible(false)
            }
        }
    }

    // Keyboard shortcut for toggling chat panel
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "b") {
                event.preventDefault()
                toggleChatPanel()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Detect draw.io load timeout (15 s) and surface a retry button
    useEffect(() => {
        if (!isLoaded || !canPersistChecked || isDrawioReady) return
        const timer = setTimeout(() => setDrawioLoadTimeout(true), 15000)
        return () => clearTimeout(timer)
    }, [isLoaded, canPersistChecked, isDrawioReady, drawioKey])

    const handleRetryDrawio = useCallback(() => {
        setDrawioLoadTimeout(false)
        setIsDrawioReady(false)
        resetDrawioReady()
        setDrawioKey((k) => k + 1)
    }, [resetDrawioReady])

    return (
        <div className="h-screen bg-background relative overflow-hidden">
            <ResizablePanelGroup
                id="main-panel-group"
                direction={isMobile ? "vertical" : "horizontal"}
                className="h-full"
            >
                <ResizablePanel
                    id="drawio-panel"
                    defaultSize={isMobile ? 50 : 67}
                    minSize={20}
                >
                    <div
                        className={`h-full relative ${
                            isMobile ? "p-1" : "p-2"
                        }`}
                    >
                        <div className="h-full rounded-xl overflow-hidden shadow-soft-lg border border-border/30 relative">
                            {isLoaded && canPersistChecked && (
                                <div
                                    className={`h-full w-full ${isDrawioReady ? "" : "invisible absolute inset-0"}`}
                                >
                                    <DrawIoEmbed
                                        key={`${drawioUi}-${darkMode}-${drawioKey}`}
                                        ref={drawioRef}
                                        autosave
                                        onAutoSave={handleDrawioAutoSave}
                                        onExport={handleDiagramExport}
                                        onLoad={handleDrawioLoad}
                                        baseUrl={drawioBaseUrl}
                                        configuration={
                                            canPersist
                                                ? { confirmExit: false }
                                                : undefined
                                        }
                                        urlParameters={{
                                            ui: drawioUi,
                                            spin: false,
                                            libraries: false,
                                            // Disable modified tracking only when persistence is available
                                            ...(canPersist && {
                                                modified: false,
                                                keepmodified: false,
                                            }),
                                            saveAndExit: false,
                                            noSaveBtn: true,
                                            noExitBtn: true,
                                            dark: darkMode,
                                            lang: "zh",
                                        }}
                                    />
                                </div>
                            )}
                            {(!isLoaded || !isDrawioReady) && (
                                <div className="h-full w-full bg-background flex flex-col items-center justify-center gap-3">
                                    {drawioLoadTimeout ? (
                                        <>
                                            <span className="text-muted-foreground text-sm">
                                                Draw.io 加载超时，请检查网络连接
                                            </span>
                                            <span className="text-muted-foreground text-xs opacity-70">
                                                当前地址：{drawioBaseUrl}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleRetryDrawio}
                                                className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                                            >
                                                重试
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Draw.io 画布加载中...
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Chat Panel */}
                <ResizablePanel
                    key={isMobile ? "mobile" : "desktop"}
                    id="chat-panel"
                    ref={chatPanelRef}
                    defaultSize={isMobile ? 50 : 33}
                    minSize={isMobile ? 20 : 15}
                    maxSize={isMobile ? 80 : 50}
                    collapsible={!isMobile}
                    collapsedSize={isMobile ? 0 : 3}
                    onCollapse={() => setIsChatVisible(false)}
                    onExpand={() => setIsChatVisible(true)}
                >
                    <div className={`h-full ${isMobile ? "p-1" : "py-2 pr-2"}`}>
                        <Suspense
                            fallback={
                                <div className="h-full bg-card rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground">
                                    聊天面板加载中...
                                </div>
                            }
                        >
                            <ChatPanel
                                isVisible={isChatVisible}
                                onToggleVisibility={toggleChatPanel}
                                drawioUi={drawioUi}
                                onToggleDrawioUi={handleDrawioUiChange}
                                darkMode={darkMode}
                                onToggleDarkMode={handleDarkModeChange}
                                isMobile={isMobile}
                            />
                        </Suspense>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
