import { Fraunces, Fredoka, Kalam, Manrope, Nunito, Nunito_Sans } from "next/font/google";

const display = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--gc-font-display" });
const body = Manrope({ subsets: ["latin"], variable: "--gc-font-body" });
// The product's own fonts, so the film's mock screens look like the app.
const app = Nunito_Sans({ subsets: ["latin"], variable: "--gc-font-app" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--gc-font-fredoka" });
const nunito = Nunito({ subsets: ["latin"], variable: "--gc-font-nunito" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--gc-font-kalam" });

/** Class names that define every campaign font variable. */
export const FONT_VARS = [display, body, app, fredoka, nunito, kalam].map((f) => f.variable).join(" ");
