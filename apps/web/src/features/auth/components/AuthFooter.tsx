"use client";

export function AuthFooter() {
  return (
    <footer className="bg-[#042e5c] text-white py-14 px-8 lg:px-16 border-t border-white/5">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-16">
          {/* COLUMN 1: IDENTITY */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="focus:outline-none"
              aria-label="Scroll to top"
            >
              <img 
                src="/Logo.svg" 
                alt="GenEd Logo" 
                className="h-8 w-auto brightness-0 invert hover:opacity-80 transition-opacity" 
              />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 whitespace-nowrap">
              © 2026 GENED. ALL RIGHTS RESERVED.
            </p>
          </div>

          {/* COLUMN 2: LEGAL */}
          <div className="flex flex-col items-center md:items-start space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/20">
              Legal
            </h4>
            <nav className="flex flex-col items-center md:items-start gap-4">
              <a href="#" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
                Terms of Service
              </a>
            </nav>
          </div>

          {/* COLUMN 3: CONTACT US */}
          <div className="flex flex-col items-center md:items-start space-y-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/20">
              Contact Us
            </h4>
            <nav className="flex flex-col items-center md:items-start gap-4">
              <a href="https://www.linkedin.com/company/111097970/admin/dashboard/" target="_blank" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
                LinkedIn
              </a>
              <a href="#" target="_blank" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
                Instagram
              </a>
              <a href="#" target="_blank" className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
                Facebook
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
