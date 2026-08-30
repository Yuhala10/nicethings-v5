"use client";

import {
    motion,
    useReducedMotion,
} from "framer-motion";

import type {
    ReactNode,
} from "react";

type PageTransitionProps = {
    children: ReactNode;
};

export default function PageTransition({
    children,
}: PageTransitionProps) {
    const shouldReduceMotion =
        useReducedMotion();

    return (
        <motion.div
            initial={
                shouldReduceMotion
                    ? {
                        opacity: 1,
                        y: 0,
                    }
                    : {
                        opacity: 0,
                        y: 8,
                    }
            }
            animate={{
                opacity: 1,
                y: 0,
            }}
            transition={
                shouldReduceMotion
                    ? {
                        duration: 0,
                    }
                    : {
                        duration: 0.35,
                        ease: [
                            0.22,
                            1,
                            0.36,
                            1,
                        ],
                    }
            }
        >
            {children}
        </motion.div>
    );
}