"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hsv, setHsv] = useState({ h: 0, s: 100, v: 100 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [colorInputValue, setColorInputValue] = useState(color || "#ff0000")
  const [colorFormat, setColorFormat] = useState<'Hex' | 'RGB' | 'CSS' | 'HSL' | 'HSB'>('Hex');

  // Convert hex to HSV on initial load and when color prop changes
  useEffect(() => {
    const initialHsv = hexToHsv(color || "#ff0000")
    if (!isNaN(initialHsv.h) && !isNaN(initialHsv.s) && !isNaN(initialHsv.v)) {
      setHsv(initialHsv)
    }
    // Update input value when color prop or format changes
    let inputValue = "";
    const rgb = hexToRgb(color || "#ff0000");
    const hsvValue = hexToHsv(color || "#ff0000");
    const hsl = hsvToHsl(hsvValue); // Need to implement hsvToHsl
    const hsb = { h: hsvValue.h, s: hsvValue.s, b: hsvValue.v }; // HSB is same as HSV.v

    switch (colorFormat) {
      case 'Hex':
        inputValue = color || "#ff0000";
        break;
      case 'RGB':
        if (rgb) inputValue = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        break;
      case 'CSS':
         if (rgb) inputValue = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        break;
      case 'HSL':
         if (hsl) inputValue = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
        break;
      case 'HSB':
         if (hsb) inputValue = `hsb(${Math.round(hsb.h)}, ${Math.round(hsb.s)}%, ${Math.round(hsb.b)}%)`;
        break;
      default:
        inputValue = color || "#ff0000";
    }
    setColorInputValue(inputValue);

  }, [color, colorFormat])

  // Draw color picker
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw saturation-value square
    const width = canvas.width
    const height = canvas.height

    // Ensure hsv.h is a valid number
    const hue = isNaN(hsv.h) ? 0 : hsv.h

    // Create gradient for saturation (x-axis)
    const satGradient = ctx.createLinearGradient(0, 0, width, 0)
    satGradient.addColorStop(0, `hsl(${hue}, 0%, 100%)`)
    satGradient.addColorStop(1, `hsl(${hue}, 100%, 50%)`)

    // Draw saturation gradient
    ctx.fillStyle = satGradient
    ctx.fillRect(0, 0, width, height)

    // Create gradient for value (y-axis, black to transparent)
    const valGradient = ctx.createLinearGradient(0, 0, 0, height)
    valGradient.addColorStop(0, "rgba(255, 255, 255, 0)")
    valGradient.addColorStop(1, "rgba(0, 0, 0, 1)")

    // Draw value gradient
    ctx.fillStyle = valGradient
    ctx.fillRect(0, 0, width, height)

    // Draw current color position
    const x = (hsv.s / 100) * width
    const y = (1 - hsv.v / 100) * height

    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2
    ctx.stroke()
  }, [hsv])

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate new saturation and value
    const s = Math.max(0, Math.min(100, (x / canvas.width) * 100))
    const v = Math.max(0, Math.min(100, 100 - (y / canvas.height) * 100))

    const newHsv = { ...hsv, s, v }
    setHsv(newHsv)
    onChange(hsvToHex(newHsv))
  }

  // Handle color input change
  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    setColorInputValue(inputValue); // Update local input state immediately

    let hexColor: string | null = null;

    switch (colorFormat) {
      case 'Hex':
        // Add # if not present and validate/limit hex input
        if (!inputValue.startsWith('#')) {
          inputValue = '#' + inputValue;
        }
        inputValue = inputValue.replace(/[^0-9A-Fa-f#]/g, '').slice(0, 7);
        setColorInputValue(inputValue);

        if (/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
          hexColor = inputValue;
        }
        break;
      case 'RGB':
        // Parse RGB input (e.g., "rgb(255, 0, 0)" or "255, 0, 0")
        const rgbMatch = inputValue.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*\d+\.?\d*)?\)$/);
        if (rgbMatch) {
          const r = Number.parseInt(rgbMatch[1]);
          const g = Number.parseInt(rgbMatch[2]);
          const b = Number.parseInt(rgbMatch[3]);
          if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
             hexColor = rgbToHex({ r, g, b });
          }
        } else {
            const rgbArray = inputValue.split(',').map(s => s.trim());
             if (rgbArray.length === 3) {
               const r = Number.parseInt(rgbArray[0]);
               const g = Number.parseInt(rgbArray[1]);
               const b = Number.parseInt(rgbArray[2]);
               if (!isNaN(r) && !isNaN(g) && !isNaN(b) && r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
                 hexColor = rgbToHex({ r, g, b });
               }
             }
        }
        break;
      case 'CSS':
         // For simplicity, treat CSS input as RGB for now.
         // Could extend to handle other CSS color formats later.
         const cssRgbMatch = inputValue.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*\d+\.?\d*)?\)$/);
          if (cssRgbMatch) {
            const r = Number.parseInt(cssRgbMatch[1]);
            const g = Number.parseInt(cssRgbMatch[2]);
            const b = Number.parseInt(cssRgbMatch[3]);
            if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
               hexColor = rgbToHex({ r, g, b });
            }
          }
        break;
      case 'HSL':
        // Parse HSL input (e.g., "hsl(120, 100%, 50%)" or "120, 100, 50")
        const hslMatch = inputValue.match(/^hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%(?:,\s*\d+\.?\d*)?\)$/);
         if (hslMatch) {
           const h = Number.parseInt(hslMatch[1]);
           const s = Number.parseInt(hslMatch[2]);
           const l = Number.parseInt(hslMatch[3]);
            if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
              // Need hslToHex function
              hexColor = hslToHex({ h, s, l });
            }
         } else {
            const hslArray = inputValue.split(',').map(s => s.trim());
             if (hslArray.length === 3) {
               const h = Number.parseInt(hslArray[0]);
               const s = Number.parseInt(hslArray[1]);
               const l = Number.parseInt(hslArray[2]);
               if (!isNaN(h) && !isNaN(s) && !isNaN(l) && h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
                  hexColor = hslToHex({ h, s, l });
               }
             }
         }
        break;
      case 'HSB':
        // Parse HSB input (similar to HSL) - assuming input like "hsb(120, 100%, 100%)" or "120, 100, 100"
        const hsbMatch = inputValue.match(/^hsba?\((\d+),\s*(\d+)%?,\s*(\d+)%(?:,\s*\d+\.?\d*)?\)$/);
         if (hsbMatch) {
           const h = Number.parseInt(hsbMatch[1]);
           const s = Number.parseInt(hsbMatch[2]);
           const b = Number.parseInt(hsbMatch[3]); // Using 'b' for brightness/value
           if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && b >= 0 && b <= 100) {
             // HSB is equivalent to HSV
             const hsvFromHsb = { h, s, v: b };
             hexColor = hsvToHex(hsvFromHsb);
           }
         } else {
            const hsbArray = inputValue.split(',').map(s => s.trim());
             if (hsbArray.length === 3) {
               const h = Number.parseInt(hsbArray[0]);
               const s = Number.parseInt(hsbArray[1]);
               const b = Number.parseInt(hsbArray[2]);
                 if (!isNaN(h) && !isNaN(s) && !isNaN(b) && h >= 0 && h <= 360 && s >= 0 && s <= 100 && b >= 0 && b <= 100) {
                    const hsvFromHsb = { h, s, v: b };
                    hexColor = hsvToHex(hsvFromHsb);
                 }
             }
         }
        break;
      default:
        break;
    }

    if (hexColor) {
      // Update the color state in the parent component
      onChange(hexColor);
      // Update the HSV state for the canvas picker
      setHsv(hexToHsv(hexColor));
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="w-full h-48 rounded-md cursor-pointer"
          onClick={handleCanvasClick}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-white" style={{ backgroundColor: color }}></div>
          <Input value={colorInputValue} onChange={handleColorInputChange} className="font-mono" />

          {/* Color Format Dropdown */}
          <Select value={colorFormat} onValueChange={(value) => setColorFormat(value as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hex">Hex</SelectItem>
              <SelectItem value="RGB">RGB</SelectItem>
              <SelectItem value="CSS">CSS</SelectItem>
              <SelectItem value="HSL">HSL</SelectItem>
              <SelectItem value="HSB">HSB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// Utility functions for color conversion
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  // Remove # if present
  hex = hex.replace(/^#/, "")

  // Parse hex to RGB
  const r = Number.parseInt(hex.substring(0, 2), 16) / 255
  const g = Number.parseInt(hex.substring(2, 4), 16) / 255
  const b = Number.parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  // Calculate HSV
  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }

    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100)
  const v = Math.round(max * 100)

  return { h, s, v }
}

function hsvToHex(hsv: { h: number; s: number; v: number }): string {
  const { h, s, v } = hsv

  const f = (n: number, k = (n + h / 60) % 6) => {
    return (v / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1)))
  }

  const r = Math.round(f(5) * 255)
  const g = Math.round(f(3) * 255)
  const b = Math.round(f(1) * 255)

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Check if the hex is a valid 6-digit hex code
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null; // Return null for invalid hex codes
  }

  // Parse hex to RGB
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

function hsvToHsl(hsv: { h: number; s: number; v: number }): { h: number; s: number; l: number } {
  const { h, s, v } = hsv;
  const s_normalized = s / 100;
  const v_normalized = v / 100;

  const l = (2 - s_normalized) * v_normalized / 2;
  const s_hsl = l === 0 || l === 1 ? 0 : s_normalized * v_normalized / (l < 0.5 ? l * 2 : 2 - l * 2);

  return { h: h, s: s_hsl * 100, l: l * 100 };
}

function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const { h, s, l } = hsl;
  const s_normalized = s / 100;
  const l_normalized = l / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s_normalized * Math.min(l_normalized, 1 - l_normalized);
  const f = (n: number) =>
    l_normalized - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const { r, g, b } = rgb;
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
