"use client";

import React, { useState, useRef } from "react";
import { Sparkles } from "lucide-react";

interface AnimatedButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  variant?: "primary" | "secondary" | "accent";
  className?: string;
}

export function AnimatedButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  variant = "primary",
  className = "",
}: AnimatedButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          background: "linear-gradient(135deg, #C6151D 0%, #600A0E 100%)",
          shadow: "0 8px 32px rgba(198, 21, 29, 0.3)",
          hoverShadow: "0 12px 40px rgba(198, 21, 29, 0.4)",
        };
      case "secondary":
        return {
          background: "linear-gradient(135deg, #CA8A04 0%, #92400E 100%)",
          shadow: "0 8px 32px rgba(202, 138, 4, 0.3)",
          hoverShadow: "0 12px 40px rgba(202, 138, 4, 0.4)",
        };
      case "accent":
        return {
          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
          shadow: "0 8px 32px rgba(5, 150, 105, 0.3)",
          hoverShadow: "0 12px 40px rgba(5, 150, 105, 0.4)",
        };
      default:
        return {
          background: "linear-gradient(135deg, #C6151D 0%, #600A0E 100%)",
          shadow: "0 8px 32px rgba(198, 21, 29, 0.3)",
          hoverShadow: "0 12px 40px rgba(198, 21, 29, 0.4)",
        };
    }
  };

  const variantStyles = getVariantStyles();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };

      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.();
  };

  const dimensions = viewMode === "icon" 
    ? { width: "46px", height: "46px" }
    : { width: "auto", height: "46px", minWidth: "142px", padding: "0 24px" };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className="relative overflow-hidden border-none outline-none cursor-pointer transition-all duration-300 ease-out"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          minWidth: dimensions.minWidth,
          padding: dimensions.padding,
          borderRadius: "100px",
          background: variantStyles.background,
          boxShadow: isHovered ? variantStyles.hoverShadow : variantStyles.shadow,
          transform: isPressed 
            ? "translateY(2px) scale(0.98)" 
            : isHovered 
            ? "translateY(-2px) scale(1.02)" 
            : "translateY(0) scale(1)",
        }}
        aria-label={label}
      >
        {/* Animated shine effect */}
        <div 
          className="absolute inset-0 opacity-0 transition-opacity duration-500"
          style={{
            background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
            transform: isHovered ? "translateX(100%)" : "translateX(-100%)",
            transition: "transform 0.8s ease-in-out",
          }}
        />

        {/* Liquid metal effect overlay */}
        <div 
          className="absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            background: `
              radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
              linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)
            `,
            opacity: isHovered ? 1 : 0,
            animation: isHovered ? "liquidFlow 2s ease-in-out infinite" : "none",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center gap-2">
          {viewMode === "icon" && (
            <Sparkles 
              size={16} 
              className="text-white drop-shadow-lg transition-transform duration-300"
              style={{
                transform: isHovered ? "rotate(180deg) scale(1.1)" : "rotate(0deg) scale(1)",
              }}
            />
          )}
          {viewMode === "text" && (
            <span 
              className="text-sm font-medium text-white drop-shadow-lg whitespace-nowrap transition-all duration-300"
              style={{
                transform: isHovered ? "scale(1.05)" : "scale(1)",
              }}
            >
              {label}
            </span>
          )}
        </div>

        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute pointer-events-none animate-ripple"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 70%)",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </button>

      <style jsx>{`
        @keyframes liquidFlow {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }

        .animate-ripple {
          animation: ripple 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}