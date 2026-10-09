"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Button from "./Button";

const Header = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  const isDashboard = pathname?.startsWith("/dashboard");
  const isLoggedIn = isMounted && typeof window !== 'undefined' && !!localStorage.getItem("token");
  const userRole = isMounted ? localStorage.getItem("userRole") : null;
  const userStatus = isMounted ? localStorage.getItem("userStatus") : null;
  const userName = isMounted ? localStorage.getItem("userName") : null;
  const isAuthPage = pathname === "/login";
  // The registration role-selection page uses a cleaner single-row navbar
  const isRegisterLanding = pathname === "/register";

  if (isDashboard || isAuthPage) return null;


  const topNavLinks = [
    { name: "TESTIMONIAL", href: "/testimonial" },
    { name: "GALLERY", href: "/gallery" },
    { name: "ABOUT US", href: "#" },
    { name: "BLOG", href: "#" },
    { name: "CAREER & OPPORTUNITIES", href: "#" },
    { name: "EDUCATION", href: "#" },
    { name: "TENDORS", href: "#" },
    { name: "SPORTS COMMISSION", href: "#" },
    { name: "CALENDER", href: "#" },
  ];

  const mainNavLinks = [
    { name: "Home", href: "/" },
    { 
      name: "Members", 
      href: "#", 
      hasDropdown: true,
      dropdownItems: [
        { name: "EC Members", href: "/members/ec" },
        { name: "GB Members", href: "/members/gb" },
        { name: "District Committee", href: "/members/district" },
        { name: "Clubs", href: "/members/clubs" },
        { name: "Police Unit", href: "/members/police", isHighlighted: true, hasSubmenu: true },
        { name: "Pet Unit", href: "/members/pet", hasSubmenu: true },
        { name: "GB Members", href: "/members/gb" },
      ]
    },
    { name: "Committee", href: "#", hasDropdown: true },
    { name: "News & Events", href: "#", hasDropdown: true },
    { name: "Honours & Thanks", href: "#", hasDropdown: true },
    { name: isRegisterLanding ? "Counselling" : "Counseling", href: "#", hasDropdown: true },
    { name: "Judo Tutorial", href: "#", hasDropdown: true },
    { name: "Contact Us", href: "/contact" },
  ];

  return (
    <header className="w-full relative z-50">
      {/* Top Header - Hidden on Mobile, Shown on Desktop (xl+) */}
      {!isRegisterLanding && (
      <div 
        className="hidden xl:block relative w-full text-[#FF7400] py-2 md:py-3 overflow-hidden min-h-[36px] md:min-h-[40px] shadow-[0_2px_8px_0_rgba(43,19,0,0.4)]"
        style={{
          background: 'linear-gradient(to right, #FFFFFF 0%, #2B1300 12%, #2B1300 88%, #FFFFFF 100%)'
        }}
      >
        {/* Decorative SVGs */}
        {/* <div className="absolute left-0 top-0 h-full w-[25%] pointer-events-none opacity-60 md:opacity-80">
          <Image src="/navbar/left-assests.svg" alt="" fill className="object-contain object-left scale-125 md:scale-110" />
        </div>
        <div className="absolute right-0 top-0 h-full w-[25%] pointer-events-none opacity-60 md:opacity-80">
          <Image src="/navbar/right-assests.svg" alt="" fill className="object-contain object-right scale-125 md:scale-110" />
        </div> */}

        <div className="container mx-auto px-4 flex justify-center items-center relative z-10">
          <nav className="flex flex-wrap justify-center gap-x-3 md:gap-x-6 gap-y-1 text-[9px] md:text-[11px] font-bold tracking-wide">
            {topNavLinks.map((link) => (
              <Link key={link.name} href={link.href} className="hover:text-white transition-colors uppercase whitespace-nowrap">
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      )}

      {/* Main Header */}
      <div className={`relative w-full bg-white ${isRegisterLanding ? "py-1.5 md:py-2" : "py-2 md:py-3"} px-4 md:px-8 border-b ${isRegisterLanding ? "border-[#F4D6BF]/60 shadow-[0_1px_12px_rgba(50,19,14,0.04)]" : "border-gray-100"}`}>
        {/* Background Grid Pattern */}
        {!isRegisterLanding && <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none overflow-hidden" style={{ backgroundImage: `linear-gradient(to right, #f26522 1px, transparent 1px), linear-gradient(to bottom, #f26522 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />}

        <div className="max-w-[1440px] mx-auto flex items-center relative z-10">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="group flex items-center gap-2 md:gap-3">
              <Image 
                src="/navbar/Logo.png" 
                alt="TNJA Logo" 
                width={100} 
                height={100} 
                sizes="100px"
                className={`w-auto ${isRegisterLanding ? "h-12 md:h-14" : "h-12 md:h-16"} object-contain transition-transform group-hover:scale-105`}
              />
              <span className="block xl:hidden text-[9px] xs:text-[10px] sm:text-sm font-[900] text-[#FF7400] tracking-wider leading-tight uppercase whitespace-nowrap">
                TAMIL NADU JUDO ASSOCIATION 329/2017
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className={`hidden xl:flex flex-1 justify-center items-center ${isRegisterLanding ? "gap-5 2xl:gap-8" : "gap-6 xl:gap-8"}`}>
            {mainNavLinks.map((link) => (
              <div key={link.name} className="group relative py-4 cursor-pointer">
                <div className="flex items-center gap-1">
                  <Link href={link.href} className={`text-[14px] group-hover:text-[#f26522] transition-colors ${isRegisterLanding ? "font-semibold text-[#07152D]" : "font-bold text-gray-900"}`}>
                    {link.name}
                  </Link>
                  {link.hasDropdown && (
                    <svg className="w-2.5 h-2.5 text-gray-500 group-hover:text-[#f26522] transition-colors mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>

                {/* Dropdown Menu */}
                {link.hasDropdown && link.dropdownItems && (
                  <div className="absolute top-[calc(100%-10px)] left-1/2 -translate-x-1/2 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                    {/* Triangle Pointer */}
                    <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FFF9EA] rotate-45 border-t border-l border-orange-100/50 z-0"></div>
                    
                    <div className="relative bg-[#FFF9EA] min-w-[280px] rounded-[2.5rem] shadow-[0_20px_50px_rgba(43,19,0,0.15)] border border-orange-100/30 py-8 overflow-hidden z-10">
                      {link.dropdownItems.map((item, idx) => (
                        <Link 
                          key={idx} 
                          href={item.href}
                          className={`flex items-center justify-between px-10 py-3.5 transition-all relative group/item ${
                            item.isHighlighted 
                              ? "bg-[#FF7400] text-white mx-6 rounded-xl my-1.5 shadow-lg shadow-[#FF7400]/30 hover:scale-[1.02] active:scale-[0.98]" 
                              : "text-[#2B1300] hover:text-[#FF7400] font-bold hover:bg-orange-50/50"
                          }`}
                        >
                          {/* Decorative quote icon for highlighted item */}
                          {item.isHighlighted && (
                            <div className="absolute top-1.5 left-2.5">
                              <svg width="12" height="10" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 0L3 3H5V8H0V3L1.5 0H4ZM9 0L8 3H10V8H5V3L6.5 0H9Z" fill="white" className="opacity-80"/>
                              </svg>
                            </div>
                          )}
                          
                          <span className="text-[17px] tracking-tight">
                            {item.name}
                          </span>

                          {(item.hasSubmenu || item.isHighlighted) && (
                            <svg 
                              className={`w-4 h-4 ${item.isHighlighted ? "text-[#2B1300]" : "text-[#2B1300] opacity-60 group-hover/item:opacity-100"} transition-transform group-hover/item:-rotate-90`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Buttons & Hamburger */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 ml-auto">
            <div className="hidden lg:flex items-center gap-3">
              {isRegisterLanding && (
                <div className="flex items-center gap-1 mr-1">
                  <button
                    type="button"
                    aria-label="Search"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#FF7200] hover:text-[#E06400] hover:bg-[#FFF0E5] transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" strokeWidth="2.2" /><path strokeLinecap="round" strokeWidth="2" d="M20 20l-3.5-3.5" /></svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Cart"
                    className="relative w-10 h-10 rounded-full flex items-center justify-center text-[#07152D] hover:text-[#FF7200] hover:bg-[#FFF0E5] transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h2l2.4 10.2a1 1 0 001 .8h8.9a1 1 0 001-.76L20 8H6.2" /><circle cx="9" cy="19" r="1.4" fill="currentColor" stroke="none" /><circle cx="17" cy="19" r="1.4" fill="currentColor" stroke="none" /></svg>
                    <span className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF7200] text-white text-[9px] font-bold leading-4 text-center">0</span>
                  </button>
                </div>
              )}
              {isLoggedIn ? (
                <Link 
                  href={
                    userStatus === "REJECTED" 
                      ? "/dashboard/resubmit" 
                      : userRole === "MEMBER"
                        ? "/dashboard/member"
                        : "/dashboard/admin"
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-[#FF7400] rounded-full border border-orange-100 hover:bg-orange-100 transition-all font-bold text-sm shadow-sm"
                >
                  <div className="w-8 h-8 bg-[#FF7400] rounded-full flex items-center justify-center text-white text-xs">
                    {userName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[150px] truncate">{userName || "Profile"}</span>
                </Link>
              ) : (
                <>
                  <Button href="/login" variant="outline" className={isRegisterLanding ? "gap-2 border-[#32130E]/70! text-[#07152D]! hover:border-[#FF7200]! hover:text-[#FF7200]! hover:bg-[#FFF0E5]/60!" : ""}>
                    {isRegisterLanding && (
                      <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4.5" /><path d="M3.5 21c.8-4.4 4.2-7 8.5-7s7.7 2.6 8.5 7z" /></svg>
                    )}
                    Login / Sign In
                  </Button>
                  <Button href="/register" variant="primary" className={isRegisterLanding ? "px-7!" : ""}>
                    Register Now
                  </Button>
                </>
              )}
            </div>

            {/* Hamburger Button */}
            <button 
              className="xl:hidden p-2 text-gray-600 hover:text-[#f26522] transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-[88px] md:top-[100px] bg-white z-50 xl:hidden overflow-y-auto animate-in slide-in-from-right duration-300">
          <div className="p-6 flex flex-col gap-6">
            {/* Main Navigation Links */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Main Menu</span>
              {mainNavLinks.map((link) => (
                <div key={link.name} className="border-b border-gray-50 last:border-0">
                  <Link 
                    href={link.href}
                    className="py-3 text-lg font-bold text-gray-800 hover:text-[#f26522] flex items-center justify-between group"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                    {link.hasDropdown && (
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-[#f26522]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    )}
                  </Link>
                </div>
              ))}
            </div>

            {/* Top Bar Links Section */}
            <div className="bg-gray-50/50 rounded-2xl p-4 flex flex-col gap-1">
              <span className="text-[10px] font-black text-[#FF7400] uppercase tracking-widest mb-3">Quick Links</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {topNavLinks.map((link) => (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className="text-[13px] font-bold text-gray-600 hover:text-[#FF7400] transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-2">
              {isLoggedIn ? (
                <Link 
                  href={
                    userStatus === "REJECTED" 
                      ? "/dashboard/resubmit" 
                      : userRole === "MEMBER"
                        ? "/dashboard/member"
                        : "/dashboard/admin"
                  }
                  className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-12 h-12 bg-[#FF7400] rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {userName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#2B1300]">{userName || "My Profile"}</span>
                    <span className="text-[10px] text-[#FF7400] font-black uppercase tracking-widest">View Dashboard</span>
                  </div>
                </Link>
              ) : (
                <>
                  <Button 
                    href="/login" 
                    variant="outline"
                    className="w-full h-[48px] rounded-xl text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login / Sign In
                  </Button>
                  <Button 
                    href="/register" 
                    variant="primary"
                    className="w-full h-[48px] rounded-xl text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Register Now
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

