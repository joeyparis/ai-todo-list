import type { Transition, Variants } from 'framer-motion'

export const springDefault: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 1,
}

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 1,
}

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 0.8,
}

export const tweenFast: Transition = {
  type: 'tween',
  duration: 0.15,
  ease: [0.25, 1, 0.5, 1],
}

export const tweenDefault: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.25, 1, 0.5, 1],
}

export const tweenSlow: Transition = {
  type: 'tween',
  duration: 0.35,
  ease: [0.25, 1, 0.5, 1],
}

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const slideDownVariants: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
}

export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
}

export const collapseVariants: Variants = {
  collapsed: {
    gridTemplateRows: '0fr',
    opacity: 0,
  },
  expanded: {
    gridTemplateRows: '1fr',
    opacity: 1,
  },
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
}

export const staggerContainerFast: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.02,
    },
  },
}

export const reducedMotionTransition: Transition = {
  type: 'tween',
  duration: 0.01,
}

export function motionSafe(
  transition: Transition,
  prefersReducedMotion: boolean,
): Transition {
  return prefersReducedMotion ? reducedMotionTransition : transition
}
