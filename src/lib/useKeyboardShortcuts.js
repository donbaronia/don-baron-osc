import React, { useEffect } from "react"

/**
 * Hook para registrar atalhos de teclado no Baron Design System.
 * @param {Array} shortcuts - [{ combo: "ctrl+k", action: () => {}, description: "Abrir busca" }]
 * combo format: "ctrl+k", "shift+n", "alt+i" (case-insensitive, + separated)
 */
export function useKeyboardShortcuts(shortcuts = []) {
  useEffect(() => {
    const handler = (e) => {
      const parts = []
      if (e.ctrlKey || e.metaKey) parts.push("ctrl")
      if (e.shiftKey) parts.push("shift")
      if (e.altKey) parts.push("alt")
      const key = e.key.toLowerCase()
      if (!["control", "shift", "alt", "meta"].includes(key)) parts.push(key)
      const combo = parts.join("+")

      for (const s of shortcuts) {
        if (s.combo.toLowerCase() === combo) {
          e.preventDefault()
          s.action()
          return
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shortcuts])
}