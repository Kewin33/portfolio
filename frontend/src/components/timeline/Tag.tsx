"use client";

import React from "react";

export default function Tag({
  name,
  color,
  className = "",
}: {
  name: string;
  color?: string | null;
  className?: string;
}) {
  const bg = color || "#9CA3AF"; // default gray-400
  const textColor = getContrastColor(bg);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${className}`}
      style={{ backgroundColor: bg, color: textColor }}
    >
      {name}
    </span>
  );
}

function getContrastColor(hex: string) {
  try {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000" : "#fff";
  } catch (e) {
    return "#000";
  }
}
