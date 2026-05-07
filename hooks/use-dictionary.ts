"use client"

import { type Dictionary, dictionary } from "@/lib/dictionary"

// Static dictionary hook - returns Chinese dictionary directly
export function useDictionary(): Dictionary {
    return dictionary
}

export default useDictionary
