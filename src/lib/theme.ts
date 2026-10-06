export type Theme = "dark" | "light";

/** The storefront opens dark unless the visitor chose light. */
export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "atelier.theme";

/** Browser-chrome colour per theme (matches --t-canvas in globals.css). */
export const THEME_CHROME: Record<Theme, string> = { dark: "#0d0d0c", light: "#f5f3ee" };

export const isTheme = (v: unknown): v is Theme => v === "dark" || v === "light";

/**
 * Runs in <head> before the first paint, so a visitor who chose light never sees a dark flash.
 * The admin area is always light. Storage can be unavailable (private mode, blocked site data): fall back quietly.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,t="${DEFAULT_THEME}";try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}if(location.pathname.indexOf("/admin")===0)t="light";d.setAttribute("data-theme",t);try{var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"${THEME_CHROME.light}":"${THEME_CHROME.dark}")}catch(e){}})();`;
