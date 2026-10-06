"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GiTempleGate, GiWhistle, GiBlackBelt } from 'react-icons/gi';
import { FaUsers } from 'react-icons/fa';
import type { IconType } from 'react-icons';

// TNJA palette
const ORANGE = "#FF7200";
const BROWN = "#32130E";
const NAVY = "#07152D";

// Background photos (swap for transparent cut-out PNGs for an even cleaner blend)
const LEFT_ATHLETES_IMG = "/homepage/hero/Hero.png";
const BOTTOM_RIGHT_IMG = "/images/gallery/gallery-hero.png";

const MotionLink = motion.create(Link);

/** Torii gate + temple roof line-art used as the Club card's background illustration */
const ClubIllustration = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 280 90" fill="currentColor" className={className} aria-hidden="true">
    {/* Torii */}
    <path d="M4 14 Q55 4 106 14 L104 22 Q55 13 6 22 Z" />
    <rect x="14" y="30" width="82" height="6" rx="1" />
    <rect x="24" y="20" width="8" height="70" />
    <rect x="78" y="20" width="8" height="70" />
    <rect x="51" y="22" width="8" height="9" />
    {/* Temple roof */}
    <path d="M120 58 Q170 46 200 18 Q230 46 280 58 L280 64 L120 64 Z" />
    <rect x="138" y="64" width="124" height="26" />
  </svg>
);

interface RegistrationRole {
  title: string;
  description: string[];
  icon: IconType;
  illustration: IconType | typeof ClubIllustration;
  illustrationClass: string;
  href: string;
}

const registrationRoles: RegistrationRole[] = [
  {
    title: "Register as Club",
    description: ["Affiliate your Judo club with", "the Tamil Nadu Judo Association."],
    icon: GiTempleGate,
    illustration: ClubIllustration,
    illustrationClass: "left-6 bottom-0 w-[calc(100%-24px)] max-w-[290px] h-auto",
    href: "/register/club",
  },
  {
    title: "Register as Members",
    description: ["Join as a member and", "be part of our Judo family."],
    icon: FaUsers,
    illustration: FaUsers,
    illustrationClass: "-right-3 -bottom-5 w-[130px] h-[110px]",
    href: "/register/member",
  },
  {
    title: "Register as Coach / Referee",
    description: ["Contribute your expertise", "to shape future champions."],
    icon: GiWhistle,
    illustration: GiWhistle,
    illustrationClass: "-right-4 -bottom-6 w-[130px] h-[130px] -scale-x-100",
    href: "/register/coach",
  },
  {
    title: "Register as Player",
    description: ["Start your journey", "towards a stronger tomorrow."],
    icon: GiBlackBelt,
    illustration: GiBlackBelt,
    illustrationClass: "-right-4 -bottom-7 w-[130px] h-[130px]",
    href: "/register/player",
  },
];

/** Stylised Tamil Nadu outline (decorative only) */
const TAMIL_NADU_PATH =
  "M58 14 L74 6 L92 12 L104 4 L124 10 L140 2 L160 8 L172 4 L184 14 L180 30 L186 44 L176 58 L172 80 L174 100 L166 118 L170 136 L160 150 L162 168 L148 184 L136 196 L128 214 L114 228 L106 246 L96 266 L86 276 L80 262 L70 246 L66 226 L56 210 L52 192 L40 178 L30 160 L22 146 L26 128 L16 112 L20 96 L12 82 L24 68 L28 50 L42 40 L46 24 Z";

const BackgroundArt = () => (
  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
    <svg width="0" height="0" className="absolute">
      <defs>
        {/* Rough, feathered edge for watercolour rings */}
        <filter id="tnja-brush-edge" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="18" result="d" />
          <feGaussianBlur in="d" stdDeviation="1.4" />
        </filter>
        {/* Dry-brush streaks (horizontal; shapes are rotated into place) */}
        <filter id="tnja-dry-brush" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.11" numOctaves="2" seed="3" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2 0 0 0 -0.45" result="streaks" />
          <feComposite in="SourceGraphic" in2="streaks" operator="in" result="textured" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="edge" />
          <feDisplacementMap in="textured" in2="edge" scale="12" />
        </filter>
        <linearGradient id="tnja-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FF7A1A" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#FF9A4D" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFC08F" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>

    {/* ── LEFT: faded athletes inside a watercolour halo ── */}
    <div className="absolute -left-[60px] top-[20px] w-[420px] h-[440px] hidden md:block">
      {/* Athletes */}
      <div
        className="absolute left-0 top-[50px] w-[360px] h-[390px] opacity-[0.42] mix-blend-multiply"
        style={{
          filter: "grayscale(1) contrast(0.7) brightness(1.9)",
          maskImage: "radial-gradient(ellipse 52% 50% at 50% 48%, black 55%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 52% 50% at 50% 48%, black 55%, transparent 100%)",
        }}
      >
        <Image src={LEFT_ATHLETES_IMG} alt="" fill sizes="360px" className="object-cover object-[58%_40%]" />
      </div>

      {/* Watercolour disc */}
      <div
        className="absolute left-[50px] top-[10px] w-[400px] h-[400px] rounded-full mix-blend-multiply"
        style={{
          background:
            "radial-gradient(circle, rgba(255,200,160,0.08) 0%, rgba(255,184,132,0.16) 45%, rgba(255,160,100,0.28) 62%, rgba(255,175,120,0.12) 68%, rgba(255,180,120,0) 72%)",
        }}
      />
      {/* Brush ring */}
      <svg viewBox="0 0 400 400" className="absolute left-[50px] top-[10px] w-[400px] h-[400px] mix-blend-multiply">
        <g filter="url(#tnja-brush-edge)" fill="none" strokeLinecap="round">
          <path d="M205 36 A164 164 0 1 1 52 130" stroke="#FFAE75" strokeOpacity="0.28" strokeWidth="34" />
          <path d="M318 96 A160 160 0 0 1 300 320" stroke="#FF9A55" strokeOpacity="0.2" strokeWidth="16" />
          <path d="M70 108 A168 168 0 0 1 170 38" stroke="#FFB27A" strokeOpacity="0.35" strokeWidth="10" />
        </g>
      </svg>
      {/* Spray streaks top-left */}
      <svg viewBox="0 0 240 120" className="absolute left-0 top-[60px] w-[240px] mix-blend-multiply opacity-60">
        <g transform="rotate(-24 120 60)" filter="url(#tnja-dry-brush)">
          <rect x="-20" y="40" width="250" height="34" rx="17" fill="url(#tnja-sweep)" />
        </g>
      </svg>
    </div>

    {/* ── LEFT: brush kanji 柔道 ── */}
    <div
      className="absolute left-[26px] top-[410px] hidden lg:block leading-[1.02] text-[86px]"
      style={{ fontFamily: "var(--font-brush-jp), 'Yu Mincho', serif", color: "#F3AE78", opacity: 0.45, writingMode: "vertical-rl" }}
    >
      柔道
    </div>

    {/* ── RIGHT: handwritten motto ── */}
    <div
      className="absolute right-[34px] top-[78px] hidden lg:block origin-bottom-left -rotate-[17deg]"
      style={{ fontFamily: "var(--font-handwritten), cursive", color: "#F2B486", opacity: 0.5 }}
    >
      <p className="text-[58px] leading-[0.95]">Discipline</p>
      <p className="text-[58px] leading-[0.95] pl-10">Builds</p>
      <p className="text-[58px] leading-[0.95] pl-10">Character</p>
      <svg viewBox="0 0 260 24" className="w-[250px] -mt-1 ml-0">
        <path d="M2 18 C 70 14, 150 9, 258 4 C 160 14, 80 20, 6 22 Z" fill="#F2B486" />
      </svg>
    </div>

    {/* ── RIGHT: Tamil Nadu outline ── */}
    <svg viewBox="0 0 192 280" className="absolute -right-[44px] top-[310px] w-[180px] h-auto hidden lg:block">
      <path d={TAMIL_NADU_PATH} fill="#E6DED5" fillOpacity="0.6" stroke="#DCD2C7" strokeOpacity="0.7" strokeWidth="1" strokeLinejoin="round" />
    </svg>
    <span className="absolute right-[30px] top-[425px] hidden lg:block text-[10px] font-semibold tracking-[0.32em] text-[#B5ABA0]">
      TAMIL NADU
    </span>

    {/* ── BOTTOM RIGHT: gi & belt close-up ── */}
    <div
      className="absolute right-0 bottom-0 w-[460px] h-[380px] opacity-[0.32] mix-blend-multiply hidden md:block"
      style={{
        filter: "grayscale(1) contrast(0.6) brightness(1.7)",
        maskImage: "radial-gradient(ellipse 100% 100% at 100% 100%, black 35%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 100% 100%, black 35%, transparent 75%)",
      }}
    >
      <Image src={BOTTOM_RIGHT_IMG} alt="" fill sizes="460px" className="object-cover object-[50%_72%]" />
    </div>

    {/* ── BOTTOM LEFT: orange brush sweep from the corner ── */}
    <svg viewBox="0 0 420 260" className="absolute left-0 bottom-0 w-[280px] md:w-[400px] h-auto mix-blend-multiply">
      {/* Broad watercolour base */}
      <g transform="translate(-20 285) rotate(-34)" filter="url(#tnja-brush-edge)" opacity="0.55">
        <path d="M0 30 C 120 6, 280 14, 420 34 C 280 70, 130 120, 0 170 Z" fill="url(#tnja-sweep)" />
      </g>
      <g transform="translate(-20 285) rotate(-34)" filter="url(#tnja-dry-brush)">
        <path d="M0 40 C 120 10, 300 18, 470 36 C 300 52, 140 80, 0 120 Z" fill="url(#tnja-sweep)" />
        <path d="M0 120 C 120 104, 250 96, 360 92 C 250 108, 120 132, 0 160 Z" fill="url(#tnja-sweep)" opacity="0.8" />
        <rect x="0" y="0" width="300" height="20" rx="10" fill="url(#tnja-sweep)" opacity="0.5" />
      </g>
    </svg>
  </div>
);

const RoleCard = ({ role, index }: { role: RegistrationRole; index: number }) => {
  const Icon = role.icon;
  const Illustration = role.illustration;

  return (
    <MotionLink
      href={role.href}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.45, ease: "easeOut" }}
      className="group relative flex flex-col items-center text-center overflow-hidden rounded-[20px] border border-[#F6E3D3] bg-white/80 backdrop-blur-[2px] px-4 xl:px-5 pt-8 pb-12 shadow-[0_6px_24px_rgba(50,19,14,0.05)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#FF7200]/50 hover:shadow-[0_18px_40px_rgba(255,114,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7200] focus-visible:ring-offset-2"
    >
      {/* Background illustration */}
      <Illustration className={`absolute text-[#F9DFCB] opacity-70 transition-opacity duration-300 group-hover:opacity-100 ${role.illustrationClass}`} />

      {/* Icon */}
      <div className="relative w-[92px] h-[92px] rounded-full bg-[#FDE8D8] flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-[#FFDFC8]">
        <Icon className="w-11 h-11 text-[#A8380A]" />
      </div>

      <h3 className="relative text-[18px] xl:text-[19px] font-bold leading-snug tracking-[-0.02em] mb-2.5" style={{ color: NAVY }}>
        {role.title}
      </h3>

      <p className="relative text-[14px] xl:text-[15px] leading-[1.5] text-[#2A3346] mb-6">
        {role.description[0]}
        <br className="hidden sm:block" /> {role.description[1]}
      </p>

      {/* Arrow */}
      <span className="relative w-[46px] h-[46px] rounded-full border-[1.5px] border-[#FF7200] text-[#FF7200] flex items-center justify-center transition-all duration-300 group-hover:bg-[#FF7200] group-hover:text-white">
        <svg className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </MotionLink>
  );
};

const RegisterSelection = () => {
  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-[#FFFBF6] px-4 pt-12 md:pt-[60px] pb-8 min-h-[calc(100vh-70px)]">
      {/* Warm ivory wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 30%, #FFFDF9 0%, rgba(255,251,246,0) 70%), linear-gradient(180deg, #FFFAF4 0%, #FFFCF8 60%, #FBF7F2 100%)" }}
      />
      <BackgroundArt />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <p className="text-[13px] md:text-[15px] font-semibold uppercase tracking-[0.34em]" style={{ color: ORANGE }}>
            New Registration
          </p>
          <span className="block w-14 h-[2px] rounded-full mx-auto mt-5 mb-7" style={{ backgroundColor: ORANGE }} />
          <h1 className="text-[34px] sm:text-[44px] lg:text-[52px] font-extrabold leading-[1.16] tracking-[-0.015em]">
            <span className="block" style={{ color: BROWN }}>Create Your Account</span>
            <span className="block" style={{ color: ORANGE }}>Select Your Role</span>
          </h1>
          <p className="mt-5 text-[15px] md:text-[18px] leading-[1.55] text-[#3D475C] max-w-[600px] mx-auto">
            Join the Tamil Nadu Judo Association and be a part of a stronger,
            <br className="hidden md:block" /> healthier and more disciplined community.
          </p>
        </motion.div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1270px] mx-auto mt-10 md:mt-11">
          {registrationRoles.map((role, index) => (
            <RoleCard key={role.href} role={role} index={index} />
          ))}
        </div>

        {/* Tagline */}
        <div className="mt-10 md:mt-12 flex flex-col items-center text-center">
          <p className="text-[11px] md:text-[12px] font-medium uppercase tracking-[0.42em] text-[#4A4A4A] leading-loose">
            Stronger People
            <span className="mx-3 md:mx-5">•</span>
            Stronger Communities
            <span className="mx-3 md:mx-5">•</span>
            A Stronger Tamil Nadu
          </p>
          <span className="block w-12 h-[2px] rounded-full mt-5 mb-6" style={{ backgroundColor: ORANGE }} />
          <button
            type="button"
            onClick={scrollDown}
            className="group flex flex-col items-center gap-3"
            aria-label="Scroll down"
          >
            <span className="w-[46px] h-[46px] rounded-full border-[1.5px] border-[#FF7200] text-[#FF7200] flex items-center justify-center transition-all duration-300 group-hover:bg-[#FF7200] group-hover:text-white">
              <svg className="w-[18px] h-[18px] animate-bounce [animation-duration:2s]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold tracking-[0.28em]" style={{ color: ORANGE }}>SCROLL DOWN</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default RegisterSelection;
