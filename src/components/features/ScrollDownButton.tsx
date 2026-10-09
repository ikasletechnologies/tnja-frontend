"use client";

import { ArrowDown } from "lucide-react";

export default function ScrollDownButton() {
  const handleScrollDown = () => {
    const heroSection = document.getElementById("hero-section");
    heroSection?.nextElementSibling?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <button type="button" onClick={handleScrollDown} className="group mt-8 mb-4 flex flex-col items-center gap-3 focus:outline-none">
      <span className="text-sm font-semibold tracking-widest text-[#FF7400] uppercase transition-colors group-hover:text-[#e66800]">Scroll Down</span>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF7400]/40 text-[#FF7400] transition-colors group-hover:bg-[#FF7400] group-hover:text-white">
        <ArrowDown className="h-5 w-5" />
      </span>
    </button>
  );
}
