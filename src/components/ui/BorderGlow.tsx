"use client";

import React, { useState, useEffect } from "react";
import "./BorderGlow.css";

interface BorderGlowProps {
  children: React.ReactNode;
  animated?: boolean;
  backgroundColor?: string;
  borderRadius?: number;
  colors?: string[];
  coneSpread?: number;
  edgeSensitivity?: number;
  glowColor?: string;
  glowIntensity?: number;
  glowRadius?: number;
  className?: string;
}

export default function BorderGlow({
  children,
  animated = false,
  borderRadius = 16,
  className = "",
}: BorderGlowProps) {
  const [showGlow, setShowGlow] = useState(false);

  useEffect(() => {
    if (animated) {
      setShowGlow(true);
      const timer = setTimeout(() => {
        setShowGlow(false);
      }, 2100);
      return () => clearTimeout(timer);
    } else {
      setShowGlow(false);
    }
  }, [animated]);

  return (
    <div
      className={`border-glow-wrapper ${showGlow ? "animated" : ""} ${className}`}
      style={{ borderRadius: `${borderRadius}px` }}
    >
      {children}
    </div>
  );
}
