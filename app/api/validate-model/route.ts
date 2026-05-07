import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { allowPrivateUrls, isPrivateUrl } from "@/lib/ssrf-protection"

export const runtime = "nodejs"

interface ValidateRequest {
    apiKey: string
    baseUrl?: string
    modelId: string
}

export async function POST(req: Request) {
    try {
        const body: ValidateRequest = await req.json()
        const { apiKey, baseUrl, modelId } = body

        if (!modelId) {
            return NextResponse.json(
                { valid: false, error: "Model ID is required" },
                { status: 400 },
            )
        }

        if (!apiKey) {
            return NextResponse.json(
                { valid: false, error: "API key is required" },
                { status: 400 },
            )
        }

        // SECURITY: Block SSRF attacks via custom baseUrl
        if (baseUrl && !allowPrivateUrls && isPrivateUrl(baseUrl)) {
            return NextResponse.json(
                { valid: false, error: "Invalid base URL" },
                { status: 400 },
            )
        }

        const provider = createOpenAI({
            apiKey,
            ...(baseUrl && { baseURL: baseUrl }),
        })
        const model = provider.chat(modelId)

        const startTime = Date.now()
        await generateText({
            model,
            prompt: "Say 'OK'",
            maxOutputTokens: 20,
        })
        const responseTime = Date.now() - startTime

        return NextResponse.json({ valid: true, responseTime })
    } catch (error) {
        console.error("[validate-model] Error:", error)

        let errorMessage = "Validation failed"
        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("Unauthorized")
            ) {
                errorMessage = "Invalid API key"
            } else if (
                error.message.includes("404") ||
                error.message.includes("not found")
            ) {
                errorMessage = "Model not found"
            } else if (
                error.message.includes("429") ||
                error.message.includes("rate limit")
            ) {
                errorMessage = "Rate limited - try again later"
            } else if (error.message.includes("ECONNREFUSED")) {
                errorMessage = "Cannot connect to server"
            } else {
                errorMessage = error.message.slice(0, 100)
            }
        }

        return NextResponse.json(
            { valid: false, error: errorMessage },
            { status: 200 },
        )
    }
}
