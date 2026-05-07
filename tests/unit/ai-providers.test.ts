import { describe, expect, it } from "vitest"
import { supportsImageInput, supportsPromptCaching } from "@/lib/ai-providers"

describe("supportsPromptCaching", () => {
    it("always returns false (OpenAI-compatible endpoint handles caching transparently)", () => {
        expect(supportsPromptCaching("claude-sonnet-4-5")).toBe(false)
        expect(supportsPromptCaching("gpt-4o")).toBe(false)
        expect(supportsPromptCaching("deepseek-chat")).toBe(false)
    })
})

describe("supportsImageInput", () => {
    it("returns true for models with vision indicators in the name", () => {
        expect(supportsImageInput("gpt-4-vision")).toBe(true)
        expect(supportsImageInput("qwen-vl")).toBe(true)
        expect(supportsImageInput("deepseek-vl")).toBe(true)
    })

    it("returns false for DeepSeek text models", () => {
        expect(supportsImageInput("deepseek-chat")).toBe(false)
        expect(supportsImageInput("deepseek-coder")).toBe(false)
    })

    it("returns false for Qwen text models", () => {
        expect(supportsImageInput("qwen-turbo")).toBe(false)
        expect(supportsImageInput("qwen-plus")).toBe(false)
        expect(supportsImageInput("qwen3-max")).toBe(false)
    })

    it("returns true for Qwen3.5 models (supports vision)", () => {
        expect(supportsImageInput("Qwen3.5")).toBe(true)
        expect(supportsImageInput("qwen3.5")).toBe(true)
        expect(supportsImageInput("qwen3.5-plus")).toBe(true)
        expect(supportsImageInput("qwen3.5-flash")).toBe(true)
    })

    it("returns true for QvQ (Qwen Visual QA) models", () => {
        expect(supportsImageInput("qvq-72b-preview")).toBe(true)
        expect(supportsImageInput("qvq-max")).toBe(true)
        expect(supportsImageInput("qwen/qvq-72b-preview")).toBe(true)
        expect(supportsImageInput("qwen/qvq-max")).toBe(true)
    })

    it("returns true for Claude and GPT models by default", () => {
        expect(supportsImageInput("claude-sonnet-4-5")).toBe(true)
        expect(supportsImageInput("gpt-4o")).toBe(true)
        expect(supportsImageInput("gemini-pro")).toBe(true)
    })
})
