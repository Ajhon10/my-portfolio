/// <reference types="vite/client" />
declare const Image: typeof HTMLImageElement
declare const console: Console
declare function setTimeout(callback: () => void, delay: number): number
declare function clearTimeout(timeoutId: number): void
declare function setInterval(callback: () => void, delay: number): number
declare function clearInterval(intervalId: number): void
