"use client";
import HeaderLinks from "@/components/header/HeaderLinks";
import { LangSwitcher } from "@/components/header/LangSwitcher";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CgClose } from "react-icons/cg";
import { ThemedButton } from "../ThemedButton";

const links = [
  { label: "Features", href: "#Features" },
  { label: "Pricing", href: "#Pricing" },
  { label: "Testimonials", href: "#Testimonials" },
  { label: "FAQ", href: "#FAQ" },
];

const Header = () => {
  const params = useParams();
  const lang = params.lang;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      isScrolled ? "bg-background/80 backdrop-blur-lg shadow-sm" : "bg-transparent"
    )}>
      <div className="py-4 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="relative z-50 flex justify-between items-center">
          {/* Left section */}
          <div className="flex items-center md:gap-x-12 flex-1">
            <Link
              href="/"
              aria-label="Landing Page Boilerplate"
              title="Landing Page Boilerplate"
              className="flex items-center space-x-2 group"
            >
              <Image
                alt="Logo"
                src="/logo.svg"
                className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
                width={32}
                height={32}
              />
              <span className="text-gray-950 dark:text-gray-300 hidden md:block font-semibold">
                {siteConfig.name}
              </span>
            </Link>
          </div>

          {/* Center section - Navigation */}
          <ul className="hidden md:flex items-center justify-center gap-8 flex-1">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={`/${lang === "en" ? "" : lang}${link.href}`}
                  aria-label={link.label}
                  title={link.label}
                  className="tracking-wide transition-all duration-200 font-medium hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right section */}
          <div className="hidden md:flex items-center justify-end gap-x-6 flex-1">
            <HeaderLinks />
            <ThemedButton />
            <LangSwitcher />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
              title={isMenuOpen ? "Close Menu" : "Open Menu"}
              className="p-2 -mr-1 transition-all duration-200 rounded-lg hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <CgClose /> : <MenuIcon />}
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-0 left-0 w-full"
                >
                  <div className="p-5 bg-background/95 backdrop-blur-lg border rounded-lg shadow-lg mt-2">
                    <nav>
                      <ul className="space-y-4">
                        {links.map((link) => (
                          <li key={link.label}>
                            <Link
                              href={link.href}
                              aria-label={link.label}
                              title={link.label}
                              className="font-medium tracking-wide transition-all duration-200 hover:text-primary block py-2"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                    <div className="pt-6 mt-6 border-t">
                      <div className="flex items-center gap-x-5 justify-between">
                        <HeaderLinks />
                        <div className="flex items-center justify-end gap-x-5">
                          <ThemedButton />
                          <LangSwitcher />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
