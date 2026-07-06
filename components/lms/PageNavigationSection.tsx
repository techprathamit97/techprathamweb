"use client";

import React, { CSSProperties } from "react";

type Props = {
  prevLabel?: string;
  prevLink?: string;
  prevBg?: string;
  prevColor?: string;

  nextLabel?: string;
  nextLink?: string;
  nextBg?: string;
  nextColor?: string;

  padding?: string;
  borderRadius?: string;
  fontSize?: string;
  align?: "left" | "center" | "right" | "space-between";
  stackMobile?: boolean;
};

export default function NextPrevNavigation({
  prevLabel = "← Previous",
  prevLink = "",
  prevBg = "#e5e7eb",
  prevColor = "#111827",

  nextLabel = "Next →",
  nextLink = "",
  nextBg = "#dc2626",
  nextColor = "#ffffff",

  padding = "12px 18px",
  borderRadius = "8px",
  fontSize = "14px",
  align = "space-between",
  stackMobile = true,
}: Props) {
  const containerStyle: CSSProperties = {
    display: "flex",
    justifyContent:
      align === "center"
        ? "center"
        : align === "left"
        ? "flex-start"
        : align === "right"
        ? "flex-end"
        : "space-between",
    gap: "10px",
    flexWrap: "wrap",
  };

  const baseBtn: CSSProperties = {
    padding,
    borderRadius,
    fontSize,
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center",
    flex: stackMobile ? "1 1 48%" : undefined,
  };

  const prevStyle: CSSProperties = {
    ...baseBtn,
    background: prevBg,
    color: prevColor,
  };

  const nextStyle: CSSProperties = {
    ...baseBtn,
    background: nextBg,
    color: nextColor,
  };

  return (
    <div style={containerStyle}>
      {prevLink && (
        <a href={prevLink} style={prevStyle}>
          {prevLabel}
        </a>
      )}

      {nextLink && (
        <a href={nextLink} style={nextStyle}>
          {nextLabel}
        </a>
      )}
    </div>
  );
}
