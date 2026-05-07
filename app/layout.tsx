import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import { DiagramProvider } from "@/contexts/diagram-context"

import "./globals.css"

const plusJakarta = Plus_Jakarta_Sans({
    variable: "--font-sans",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
})

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export const metadata: Metadata = {
    title: "refain-draw - AI 画图工具",
    description:
        "使用 AI 创建 draw.io 图表，支持 AWS 架构图、流程图和技术图表。",
    keywords: [
        "AI 图表生成器",
        "AWS 架构",
        "流程图",
        "draw.io",
        "AI 绘图",
        "技术图表",
    ],
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <body
                className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
            >
                <DiagramProvider>{children}</DiagramProvider>
            </body>
        </html>
    )
}
