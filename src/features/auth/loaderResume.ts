/**
 * Dependency-free pieces of the logout loader hand-over (see
 * leaveWithLoader.ts), safe to import from the server root layout.
 */
export const LOADER_RESUME_KEY = "zoovi_loader_resume";

/** Inline, pre-hydration: paint the canvas cover if a logout is mid-flight. */
export const LOADER_RESUME_COVER_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  LOADER_RESUME_KEY,
)}))document.documentElement.setAttribute("data-loader-resume","")}catch(e){}`;
