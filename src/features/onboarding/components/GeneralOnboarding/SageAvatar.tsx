"use client";

import Image from "next/image";

export function SageAvatar() {
  return (
    <div className="relative shrink-0">
      <div className="w-[44px] h-[44px] rounded-[14px] overflow-hidden">
        <Image
          src="/Favicon1.jpg"
          alt="Sage"
          width={44}
          height={44}
          className="object-cover w-full h-full"
        />
      </div>
      <div
        className="absolute -inset-1 rounded-[18px] border-2 border-[#1DB87B] pointer-events-none animate-[sagePulse_2.5s_ease-in-out_infinite]"
      />
    </div>
  );
}
