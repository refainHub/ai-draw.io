import type { MetadataRoute } from "next"
import { getAssetUrl } from "@/lib/base-path"
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "refain-draw",
        short_name: "refain-draw",
        description: "部门内部 AI 画图 Web 工具",
        start_url: getAssetUrl("/"),
        display: "standalone",
        background_color: "#f9fafb",
        theme_color: "#171d26",
    }
}
