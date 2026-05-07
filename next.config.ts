import type { NextConfig } from "next"
import packageJson from "./package.json"

const nextConfig: NextConfig = {
    output: "standalone",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    env: {
        APP_VERSION: packageJson.version,
    },
}

export default nextConfig
