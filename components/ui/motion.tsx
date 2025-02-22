"use client"

import { cn } from "@/lib/utils"
import { HTMLMotionProps, motion, Variants } from "framer-motion"
import dynamic from 'next/dynamic'

interface AnimatedProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  delay?: number
}

const defaultTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  mass: 1
}

// Dynamically import motion components with SSR disabled
export const MotionDiv = dynamic<HTMLMotionProps<"div">>(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
)

export const FadeIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ ...defaultTransition, delay }}
    className={cn("will-change-transform", className)}
    {...props}
  >
    {children}
  </motion.div>
)

export const SlideIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
  <motion.div
    initial={{ x: -30, opacity: 0, scale: 0.95 }}
    animate={{ x: 0, opacity: 1, scale: 1 }}
    exit={{ x: 30, opacity: 0, scale: 0.95 }}
    transition={{ ...defaultTransition, delay }}
    className={cn("will-change-transform", className)}
    {...props}
  >
    {children}
  </motion.div>
)

export const ScaleIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0, y: 10 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.9, opacity: 0, y: 10 }}
    transition={{ ...defaultTransition, delay }}
    className={cn("will-change-transform", className)}
    {...props}
  >
    {children}
  </motion.div>
)

export const FloatIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
  <motion.div
    initial={{ y: 40, opacity: 0, scale: 0.95 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    exit={{ y: 40, opacity: 0, scale: 0.95 }}
    transition={{ ...defaultTransition, delay }}
    className={cn("will-change-transform", className)}
    {...props}
  >
    {children}
  </motion.div>
)

export const BlurIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
  <motion.div
    initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
    animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
    exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
    transition={{ ...defaultTransition, delay }}
    className={cn("will-change-transform", className)}
    {...props}
  >
    {children}
  </motion.div>
)

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    }
  }
}

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
}

export const scaleIn: Variants = {
  hidden: {
    scale: 0.9,
    opacity: 0,
    y: 10
  },
  show: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
}

export const Container = ({ children, className, ...props }: AnimatedProps) => (
  <motion.div
    variants={staggerContainer}
    initial="hidden"
    animate="show"
    className={cn("w-full", className)}
    {...props}
  >
    {children}
  </motion.div>
)

export const Item = ({ children, className, ...props }: AnimatedProps) => (
  <motion.div
    variants={fadeInUp}
    className={cn("will-change-transform", className)}
    {...props}
  >
    {children}
  </motion.div>
)

// Hover animations
export const hoverScale = {
  scale: 1.05,
  transition: { type: "spring", stiffness: 400, damping: 17 }
}

export const hoverTilt = {
  rotateX: 10,
  rotateY: -10,
  transition: { type: "spring", stiffness: 400, damping: 17 }
}

export const hoverBounce = {
  y: -8,
  transition: { type: "spring", stiffness: 400, damping: 17 }
}

// Scroll animations
export const scrollReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
}

// Export motion variants and other utilities
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

export const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

export const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
} 