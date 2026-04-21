"use client";

export function AuthFooter() {
  return (
    <footer className="bg-[#042e5c] text-white py-14 px-8 lg:px-16">
      {/* Emerald top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#059F6D]/40 to-transparent mb-14" />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-16">
          {/* COLUMN 1: IDENTITY */}
          <div className="flex flex-col items-center md:items-start space-y-5">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="focus:outline-none group"
              aria-label="Scroll to top"
            >
              <img
                src="/Logo.svg"
                alt="GenEd Logo"
                className="h-8 w-auto brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </button>
            <p className="text-xs font-medium text-white/30 leading-relaxed max-w-[200px] text-center md:text-left italic font-serif">
              &ldquo;The Ceremonial Entrance to the GenEd Sanctuary.&rdquo;
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">
              © 2026 GENED. All rights reserved.
            </p>
          </div>

          {/* COLUMN 2: LEGAL */}
          <div className="flex flex-col items-center md:items-start space-y-6">
            <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
              Legal
            </h4>
            <nav className="flex flex-col items-center md:items-start gap-4">
              <a
                href="#"
                className="text-sm font-medium text-white/40 hover:text-[#059F6D] transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-sm font-medium text-white/40 hover:text-[#059F6D] transition-colors duration-200"
              >
                Terms of Service
              </a>
            </nav>
          </div>

          {/* COLUMN 3: CONTACT */}
          <div className="flex flex-col items-center md:items-start space-y-6">
            <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
              Contact Us
            </h4>
            <nav className="flex flex-col items-center md:items-start gap-4">
              <a
                href="https://www.linkedin.com/company/111097970/admin/dashboard/"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-white/40 hover:text-[#059F6D] transition-colors duration-200"
              >
                LinkedIn
              </a>
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-white/40 hover:text-[#059F6D] transition-colors duration-200"
              >
                Instagram
              </a>
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-white/40 hover:text-[#059F6D] transition-colors duration-200"
              >
                Facebook
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
