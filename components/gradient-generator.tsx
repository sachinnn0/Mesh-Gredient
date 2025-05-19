"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RefreshCw, Download, Save } from "lucide-react"
import ColorPicker from "./color-picker"
import SavedGradients from "./saved-gradients"
import { Slider } from "@/components/ui/slider"
import ExportOptionsPanel from "./export-options-panel"

// Types
interface Point {
  x: number
  y: number
  color: string
}

interface MeshGradient {
  id: string
  points: Point[]
  showHandles: boolean
  showLines: boolean
  type: GradientType
}

// Define GradientType
type GradientType = "mesh" | "linear" | "radial" | "conic";

// Helper function to generate random point positions (without color)
const generateRandomPointPositions = (numPoints: number): { x: number, y: number }[] => {
  const positions: { x: number, y: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    positions.push({
      x: Math.random() * 0.9 + 0.05, // Random X between 0.05 and 0.95
      y: Math.random() * 0.9 + 0.05, // Random Y between 0.05 and 0.95
    });
  }
  return positions;
};

// Helper functions
const generateRandomColor = () => {
  const letters = "0123456789ABCDEF"
  let color = "#"
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

// Calculate the number of points based on the grid size
const getNumPointsFromGridSize = (gridSize: number): number => {
  return gridSize * gridSize // Returns 1, 4, 9, or 16 points
}

// Generate random points based on the number of points
const generateRandomPoints = (numPoints: number): Point[] => {
  const points: Point[] = []
  for (let i = 0; i < numPoints; i++) {
    points.push({
      x: Math.random() * 0.9 + 0.05, // Random X between 0.05 and 0.95
      y: Math.random() * 0.9 + 0.05, // Random Y between 0.05 and 0.95
      color: generateRandomColor(),
    });
  }
  return points
}

// Generate a random gradient with the specified number of points
const generateRandomGradient = (numPoints: number): MeshGradient => {
  return {
    id: Date.now().toString(),
    points: generateRandomPoints(numPoints),
    showHandles: true,
    showLines: false,
    type: "mesh", // Default to mesh
  }
}

// Utility functions for color conversion (copied from color-picker.tsx)
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

export default function GradientGenerator() {
  const [gradient, setGradient] = useState<MeshGradient>(() => {
    // Generate 2 points for the initial 1x2 layout
    const initialNumPoints = 2;
    const initialGradient = generateRandomGradient(initialNumPoints);
    return { ...initialGradient, type: "mesh" }; // Ensure initial type is mesh (redundant now, but keeping for clarity)
  })
  const [savedGradients, setSavedGradients] = useState<MeshGradient[]>([])
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 })
  const [gridSize, setGridSize] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gradientCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [lockColors, setLockColors] = useState(false);
  const [lockPositions, setLockPositions] = useState(false);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [copySvgStatus, setCopySvgStatus] = useState('idle');
  const [copyCssStatus, setCopyCssStatus] = useState('idle');
  const [showSingleLine, setShowSingleLine] = useState(false);

  // Create offscreen canvas for gradient
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
    gradientCanvasRef.current = canvas
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [canvasSize])

  // Load saved gradients from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("savedGradients")
    if (saved) {
      try {
        setSavedGradients(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse saved gradients", e)
      }
    }
  }, [])

  // Update canvas size on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        const height = width
        setCanvasSize({ width, height })
      }
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)
    return () => window.removeEventListener("resize", updateCanvasSize)
  }, [])

  // Draw the gradient on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const gradientCanvas = gradientCanvasRef.current
    if (!canvas || !gradientCanvas) return

    const ctx = canvas.getContext("2d")
    const gradientCtx = gradientCanvas.getContext("2d")
    if (!ctx || !gradientCtx) return

    // Clear both canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    gradientCtx.clearRect(0, 0, gradientCanvas.width, gradientCanvas.height)

    // Draw gradient on offscreen canvas
    drawGradient(gradientCtx, gradient, canvas.width, canvas.height)

    // Draw gradient from offscreen canvas to main canvas
    ctx.drawImage(gradientCanvas, 0, 0)

    // Draw control points if enabled
    if (gradient.showHandles) {
      drawControlPoints(ctx, gradient, canvas.width, canvas.height)
    }
  }, [gradient, canvasSize])

  // Optimized drawGradient function
  const drawGradient = (ctx: CanvasRenderingContext2D, gradient: MeshGradient, width: number, height: number) => {
    const { points, type } = gradient;

    if (points.length === 0) return;

    // Clear the context
    ctx.clearRect(0, 0, width, height);

    if (showSingleLine && points.length >= 2) {
      // Draw a single line gradient between the first two points
      const p1 = points[0];
      const p2 = points[1];

      const x1 = p1.x * width;
      const y1 = p1.y * height;
      const x2 = p2.x * width;
      const y2 = p2.y * height;

      // Check if points are overlapping (within a small threshold)
      const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const overlapThreshold = 5; // Pixels

      if (distance < overlapThreshold) {
        // Points are overlapping, fill with the color of the start point
        // (or end point, doesn't matter when they are at the same position)
        ctx.fillStyle = p1.color;
        ctx.fillRect(0, 0, width, height);
      } else {
         // Draw a linear gradient along the line
        const linearGradient = ctx.createLinearGradient(x1, y1, x2, y2);
        linearGradient.addColorStop(0, p1.color);
        linearGradient.addColorStop(1, p2.color);

        ctx.fillStyle = linearGradient;
        ctx.fillRect(0, 0, width, height);
      }

    } else if (type === "linear") {
      // Draw Linear Gradient
      if (points.length < 2) {
         // Need at least two points for a linear gradient
         return;
      }
      const x1 = points[0].x * width;
      const y1 = points[0].y * height;
      const x2 = points[points.length - 1].x * width;
      const y2 = points[points.length - 1].y * height;

      // Calculate the length of the gradient line
      const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

      if (lineLength === 0) {
          // Cannot draw a linear gradient with zero length
          return;
      }

      const linearGradient = ctx.createLinearGradient(x1, y1, x2, y2);

      points.forEach(point => {
        // Calculate position along the line (normalized between 0 and 1)
        // Project the point onto the line segment and find its distance from the start
        const t = ((point.x * width - x1) * (x2 - x1) + (point.y * height - y1) * (y2 - y1)) / (lineLength * lineLength);
        const position = Math.max(0, Math.min(1, t)); // Clamp position between 0 and 1

        linearGradient.addColorStop(position, point.color);
      });

      ctx.fillStyle = linearGradient;
      ctx.fillRect(0, 0, width, height);

    } else if (type === "radial") {
       // Draw Radial Gradient
       if (points.length < 2) {
         // Need at least two points for a radial gradient (center and radius)
         // Or just use the first point as center and a default radius
         const x0 = points[0].x * width;
         const y0 = points[0].y * height;
         const r0 = 0; // Inner radius
         const x1 = points[0].x * width;
         const y1 = points[0].y * height;
         const r1 = Math.max(width, height) / 2; // Outer radius (can be adjusted)
         const radialGradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);

         points.forEach((point, index) => {
           // For simplicity, using distance from center relative to max dimension
           const distance = Math.sqrt(Math.pow((point.x * width) - x0, 2) + Math.pow((point.y * height) - y0, 2));
            radialGradient.addColorStop(Math.min(distance / r1, 1), point.color);
         });

         ctx.fillStyle = radialGradient;
         ctx.fillRect(0, 0, width, height);

       } else {
         // Use first point as center, second to influence radius
         const x0 = points[0].x * width;
         const y0 = points[0].y * height;
         const r0 = 0;
         const x1 = points[0].x * width;
         const y1 = points[0].y * height;
         const r1 = Math.sqrt(Math.pow((points[1].x * width) - x0, 2) + Math.pow((points[1].y * height) - y0, 2));

         const radialGradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);

         points.forEach((point, index) => {
            const distance = Math.sqrt(Math.pow((point.x * width) - x0, 2) + Math.pow((point.y * height) - y0, 2));
            const offset = Math.max(0, Math.min(1, distance * Math.max(width, height) / r1)); // Normalize by radius relative to canvas size, corrected
            radialGradient.addColorStop(Math.min(offset, 1), point.color);
         });

         ctx.fillStyle = radialGradient;
         ctx.fillRect(0, 0, width, height);
       }

    } else if (type === "conic") {
      // Conic gradient drawing logic
      const center = points[0];
      const x = center.x * width;
      const y = center.y * height;

      // Sort points by angle around the center for conic gradient stops
      const sortedPoints = [...points].sort((a, b) => {
          const angleA = Math.atan2(a.y * height - y, a.x * width - x);
          const angleB = Math.atan2(b.y * height - y, b.x * width - x);
          return angleA - angleB;
      });

      // Create a temporary canvas to draw the conic gradient pixel by pixel
      // due to lack of native conic gradient support in older canvas specs or for more control
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) return; // Exit if context is not available

      // Draw the conic gradient manually
      const imageData = tempCtx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < width; i++) {
          for (let j = 0; j < height; j++) {
              const dx = i - x;
              const dy = j - y;
              const angle = Math.atan2(dy, dx);
              // Normalize angle to be between 0 and 2*PI
              let normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

              // Find the two closest points by angle
              let p1 = sortedPoints[sortedPoints.length - 1];
              let p2 = sortedPoints[0];
              let t = 0; // Interpolation factor

              for (let k = 0; k < sortedPoints.length; k++) {
                  const currentPointAngle = Math.atan2(sortedPoints[k].y * height - y, sortedPoints[k].x * width - x);
                  const normalizedCurrentAngle = currentPointAngle < 0 ? currentPointAngle + 2 * Math.PI : currentPointAngle;

                  const nextPoint = sortedPoints[(k + 1) % sortedPoints.length];
                  const nextPointAngle = Math.atan2(nextPoint.y * height - y, nextPoint.x * width - x);
                  let normalizedNextAngle = nextPointAngle < 0 ? nextPointAngle + 2 * Math.PI : nextPointAngle;

                  // Handle wrapping around 2*PI
                  let startAngle = normalizedCurrentAngle;
                  let endAngle = normalizedNextAngle;
                  if (endAngle < startAngle) endAngle += 2 * Math.PI;
                  if (normalizedAngle < startAngle) normalizedAngle += 2 * Math.PI;

                  if (normalizedAngle >= startAngle && normalizedAngle <= endAngle) {
                      p1 = sortedPoints[k];
                      p2 = nextPoint;
                      t = (normalizedAngle - startAngle) / (endAngle - startAngle);
                      break;
                  }
              }

              // Interpolate color between p1 and p2 based on t
              const color1 = hexToRgb(p1.color) || { r: 0, g: 0, b: 0 };
              const color2 = hexToRgb(p2.color) || { r: 0, g: 0, b: 0 };

              const r = Math.round(color1.r + (color2.r - color1.r) * t);
              const g = Math.round(color1.g + (color2.g - color1.g) * t);
              const b = Math.round(color1.b + (color2.b - color1.b) * t);

              const pixelIndex = (j * width + i) * 4;
              data[pixelIndex] = r;
              data[pixelIndex + 1] = g;
              data[pixelIndex + 2] = b;
              data[pixelIndex + 3] = 255; // Alpha
          }
      }
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);

    } else if (type === "mesh") {
      // Mesh gradient drawing logic
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      // For each pixel in the canvas
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          // Calculate the color at this pixel using inverse distance weighting
          let totalWeight = 0;
          let r = 0, g = 0, b = 0;

          points.forEach(point => {
            const dx = (point.x * width) - i;
            const dy = (point.y * height) - j;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Avoid division by zero
            if (distance < 0.0001) {
              const color = hexToRgb(point.color);
              if (color) {
                r = color.r;
                g = color.g;
                b = color.b;
                totalWeight = 1;
              }
              return;
            }

            // Calculate weight using inverse square distance
            const weight = 1 / (distance * distance);
            totalWeight += weight;

            const color = hexToRgb(point.color);
            if (color) {
              r += color.r * weight;
              g += color.g * weight;
              b += color.b * weight;
            }
          });

          // Normalize the color values
          if (totalWeight > 0) {
            r = Math.round(r / totalWeight);
            g = Math.round(g / totalWeight);
            b = Math.round(b / totalWeight);
          }

          // Set the pixel color
          const pixelIndex = (j * width + i) * 4;
          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = 255; // Alpha
        }
      }

      // Put the image data back on the canvas
      ctx.putImageData(imageData, 0, 0);
    } else { // Fallback for any other unexpected type, maybe render solid or transparent
        // ... existing code ...
    }
  }

  // Helper function to calculate distance for linear gradient color stops
  function getDistance(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
    const lineLengthSq = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
    if (lineLengthSq === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2)); // Distance from a point

    const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSq;

    // Project point onto the line segment
    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);

    // Distance from the point to the projected point
    return Math.sqrt(Math.pow(px - closestX, 2) + Math.pow(py - closestY, 2));
  }

  // Draw control points
  const drawControlPoints = (ctx: CanvasRenderingContext2D, gradient: MeshGradient, width: number, height: number) => {
    const { points } = gradient

    // Draw control points
    points.forEach((point, index) => {
      // Draw hollow circle for each point
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, 10, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
      ctx.lineWidth = 2
      ctx.stroke()

      // If this is the active point, draw the cross pattern with small dots
      if (index === activePointIndex) {
        // Draw filled circle for the active point
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 10, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    })
  }

  // Handle canvas mouse events with requestAnimationFrame
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / canvas.width
    const y = (e.clientY - rect.top) / canvas.height

    // Find if we clicked on a point
    for (let i = 0; i < gradient.points.length; i++) {
      const point = gradient.points[i]
      const dist = Math.sqrt(Math.pow((point.x - x) * canvas.width, 2) + Math.pow((point.y - y) * canvas.height, 2))

      if (dist < 15) {
        // Just select the point without changing its color
        setActivePointIndex(i)
        setIsDragging(true)
        return
      }
    }

    setActivePointIndex(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activePointIndex === null || !isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / canvas.width
    const y = (e.clientY - rect.top) / canvas.height

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
      setGradient((prev) => {
        const newPoints = [...prev.points]
        newPoints[activePointIndex] = {
          ...newPoints[activePointIndex],
          x: Math.max(0.05, Math.min(0.95, x)),
          y: Math.max(0.05, Math.min(0.95, y)),
        }
        return { ...prev, points: newPoints }
      })
    })
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  // Change grid size (number of points)
  const handleGridSizeChange = (size: number) => {
    setGridSize(size)
    let pointsToGenerate = 0;
    switch (size) {
      case 1:
        pointsToGenerate = 2; // 1x2 layout
        break;
      case 2:
        pointsToGenerate = 4; // 2x2 layout
        break;
      case 4:
        pointsToGenerate = 16; // 4x4 layout
        break;
      default:
        pointsToGenerate = 2; // Default to 2 points for safety
    }
    setGradient(generateRandomGradient(pointsToGenerate));
  }

  // Toggle controls
  const toggleHandles = () => {
    setGradient((prev) => ({ ...prev, showHandles: !prev.showHandles }))
  }

  // Generate random gradient
  const randomizeGradient = () => {
    const numPoints = gradient.points.length; // Use the current number of points
    // Ensure minimum 2 points if starting with 1 point and adding/removing
    const pointsToGenerate = numPoints < 2 ? 2 : numPoints;
    
    let newPoints: Point[] = [];
    if (lockColors && lockPositions) {
      // Keep both colors and positions
      newPoints = gradient.points.map(point => ({ ...point }));
    } else if (lockColors) {
      // Generate new positions but keep existing colors
      const newPositions = generateRandomPointPositions(pointsToGenerate);
      newPoints = newPositions.map((pos, index) => ({
        ...pos,
        color: gradient.points[index]?.color || generateRandomColor(), // Use existing color or generate new if index out of bounds
      }));
    } else if (lockPositions) {
      // Keep positions but generate new colors
      newPoints = gradient.points.map(point => ({
        ...point,
        color: generateRandomColor(),
      }));
    } else {
      // Generate completely new random points
      newPoints = generateRandomPoints(pointsToGenerate);
    }

    setGradient((prev) => ({
      ...prev,
      points: newPoints,
      type: prev.type, // Keep the current type
    }));
    setActivePointIndex(null) // Deselect any active point when randomizing
  }

  // Save gradient
  const saveGradient = () => {
    const newSavedGradients = [...savedGradients, { ...gradient, id: Date.now().toString() }]
    setSavedGradients(newSavedGradients)
    localStorage.setItem("savedGradients", JSON.stringify(newSavedGradients))
  }

  // Load a saved gradient
  const loadGradient = (savedGradient: MeshGradient) => {
    setGradient(savedGradient)
  }

  // Delete a saved gradient
  const deleteGradient = (id: string) => {
    const newSavedGradients = savedGradients.filter((g) => g.id !== id)
    setSavedGradients(newSavedGradients)
    localStorage.setItem("savedGradients", JSON.stringify(newSavedGradients))
  }

  // Handle export action from panel
  const handleExport = (format: string, width: number, height: number, quality: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const downloadCanvas = document.createElement("canvas");
    downloadCanvas.width = width;
    downloadCanvas.height = height;
    const ctx = downloadCanvas.getContext("2d");
    if (!ctx) return;

    // Draw the gradient at the requested dimensions
    drawGradient(ctx, gradient, width, height);

    if (format === "PNG") {
      const link = document.createElement("a");
      link.download = `gradient-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = downloadCanvas.toDataURL("image/png");
      link.click();
    } else if (format === "JPEG") {
      // TODO: Implement JPEG download with quality
       const link = document.createElement("a");
       link.download = `gradient-${new Date().toISOString().slice(0, 10)}.jpeg`;
       // For simplicity, using default quality for now. Implement actual quality setting.
       link.href = downloadCanvas.toDataURL("image/jpeg", quality === "HIGH" ? 1.0 : quality === "NORMAL" ? 0.8 : 0.5);
       link.click();
    } else if (format === "SVG") {
       // For SVG, we generate the SVG string directly, not from the canvas
       const svgString = generateSvg(gradient, width, height);
       const blob = new Blob([svgString], { type: "image/svg+xml" });
       const url = URL.createObjectURL(blob);

       const link = document.createElement("a");
       link.download = `gradient-${new Date().toISOString().slice(0, 10)}.svg`;
       link.href = url;
       link.click();

       URL.revokeObjectURL(url); // Clean up the object URL
    }

    setExportPanelOpen(false); // Close the panel after export
  };

  // Handle copy SVG action from panel
  const handleCopySvg = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const svgString = generateSvg(gradient, canvas.width, canvas.height);
    setCopySvgStatus('copying');
    navigator.clipboard.writeText(svgString)
      .then(() => {
        console.log("SVG code copied to clipboard!");
        setCopySvgStatus('success');
        // TODO: Provide user feedback (e.g., a toast notification)
        setTimeout(() => setCopySvgStatus('idle'), 2000); // Revert after 2 seconds
      })
      .catch(err => {
        console.error("Failed to copy SVG code: ", err);
        setCopySvgStatus('fail');
        // TODO: Provide user feedback about the failure
        setTimeout(() => setCopySvgStatus('idle'), 2000); // Revert after 2 seconds
      });
  };

  // Helper function to generate SVG string (needs implementation for different types)
  const generateSvg = (gradient: MeshGradient, width: number, height: number): string => {
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

    if (gradient.type === "linear") {
      // Basic linear gradient SVG
      if (gradient.points.length >= 2) {
        const p1 = gradient.points[0];
        const p2 = gradient.points[gradient.points.length - 1];
        svgContent += `<defs><linearGradient id="grad1" x1="${p1.x * width}" y1="${p1.y * height}" x2="${p2.x * width}" y2="${p2.y * height}" gradientUnits="userSpaceOnUse">`;
        gradient.points.forEach(point => {
           // Simplified stop offset calculation for SVG
           const lineVecX = p2.x - p1.x;
           const lineVecY = p2.y - p1.y;
           const lineLengthSq = lineVecX * lineVecX + lineVecY * lineVecY;
           
           let offset = 0;
           if (lineLengthSq > 0) {
              // Project point onto the line segment and normalize distance
              const pointVecX = point.x - p1.x;
              const pointVecY = point.y - p1.y;
              const dotProduct = pointVecX * lineVecX + pointVecY * lineVecY;
              const t = dotProduct / lineLengthSq;
              offset = Math.max(0, Math.min(1, t)); // Clamp offset between 0 and 1
           }
           
           svgContent += `<stop offset="${offset}" stop-color="${point.color}"/>`;
        });
        svgContent += `</linearGradient></defs><rect width="100%" height="100%" fill="url(#grad1)"/>`;
      }
    } else if (gradient.type === "radial") {
       // Basic radial gradient SVG
       if (gradient.points.length >= 1) {
          const center = gradient.points[0];
          // Use userSpaceOnUse and define radius based on canvas size for more control
          const r = Math.max(width, height) / 2; // Use half of the larger dimension as a base radius
          svgContent += `<defs><radialGradient id="grad1" cx="${center.x * width}" cy="${center.y * height}" r="${r}" gradientUnits="userSpaceOnUse">`;
         
          // For radial, stops usually based on distance from center
          gradient.points.forEach(point => {
             const dist = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
             const offset = Math.max(0, Math.min(1, dist * Math.max(width, height) / r)); // Normalize by radius relative to canvas size, corrected
             svgContent += `<stop offset="${offset}" stop-color="${point.color}"/>`;
          });
          svgContent += `</radialGradient></defs><rect width="100%" height="100%" fill="url(#grad1)"/>`;
       }
    } else if (gradient.type === "conic") {
      // For conic gradients, render to canvas and embed as PNG data URL in SVG
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        // Draw the conic gradient onto the temporary canvas
        drawGradient(tempCtx, gradient, width, height);
        const pngDataUrl = tempCanvas.toDataURL('image/png');
        svgContent += `<image href="${pngDataUrl}" width="${width}" height="${height}"/>`;
      } else {
        svgContent += `<!-- Canvas context not available for Conic PNG fallback. -->`;
        if (gradient.points.length > 0) {
           svgContent += `<rect width="100%" height="100%" fill="${gradient.points[0]?.color || '#000000'}"/>`; // Fallback to first point color
        }
      }
    } else if (gradient.type === "mesh") {
      // For mesh gradients, render to canvas and embed as PNG data URL in SVG
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        // --- Mesh gradient drawing logic on temporary canvas ---
        const points = gradient.points; // Use points from the gradient object

        if (points.length > 0) {
            // Simple pixel-based interpolation (this is a basic approximation)
            const imageData = tempCtx.createImageData(width, height);
            const data = imageData.data;

            // Helper to get color at a specific point (simple nearest neighbor for now)
            const getColorAtPoint = (px: number, py: number): { r: number, g: number, b: number } | null => {
                let minDistance = Infinity;
                let nearestColor: { r: number, g: number, b: number } | null = null;

                points.forEach(point => {
                    const dist = Math.sqrt(Math.pow(point.x * width - px, 2) + Math.pow(point.y * height - py, 2));
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestColor = hexToRgb(point.color);
                    }
                });
                return nearestColor;
            };

            // Iterate through each pixel and determine color
            for (let i = 0; i < width; i++) {
                for (let j = 0; j < height; j++) {
                    const color = getColorAtPoint(i, j);
                    const pixelIndex = (j * width + i) * 4;
                    if (color) {
                        data[pixelIndex] = color.r;
                        data[pixelIndex + 1] = color.g;
                        data[pixelIndex + 2] = color.b;
                        data[pixelIndex + 3] = 255; // Alpha
                    } else {
                        data[pixelIndex] = 0;
                        data[pixelIndex + 1] = 0;
                        data[pixelIndex + 2] = 0;
                        data[pixelIndex + 3] = 255; // Default to black if no points
                    }
                }
            }
            tempCtx.putImageData(imageData, 0, 0);

        } else {
             // Fallback if no points are defined for mesh
             tempCtx.fillStyle = '#000000'; // Black background
             tempCtx.fillRect(0, 0, width, height);
        }
        // --- End of Mesh gradient drawing logic ---

        const pngDataUrl = tempCanvas.toDataURL('image/png');
        svgContent += `<image href="${pngDataUrl}" width="${width}" height="${height}"/>`;
      } else {
        svgContent += `<!-- Canvas context not available for Mesh PNG fallback. -->`;
        if (gradient.points.length > 0) {
           svgContent += `<rect width="100%" height="100%" fill="${gradient.points[0]?.color || '#000000'}"/>`; // Fallback to first point color
        }
      }
    } else { // Fallback for any other unexpected type, maybe render solid or transparent
        svgContent += `<!-- Unsupported gradient type. -->`;
    }

    svgContent += `</svg>`;
    return svgContent;
  }

  // Helper function to generate CSS code for the gradient
  const generateCss = (gradient: MeshGradient): string => {
    const { points, type } = gradient;

    if (points.length === 0) return '';

    let cssString = '';

    switch (type) {
      case 'linear':
        if (points.length < 2) return '/* Need at least two points for a linear gradient CSS. */';

        // Calculate angle from the first and last point
        // Note: CSS linear-gradient angle is different from canvas. 0deg is upwards.
        // We'll calculate the angle in radians from the first to the last point vector, then convert to CSS degrees.
        const p1 = points[0];
        const p2 = points[points.length - 1];

        // Vector from p1 to p2 (normalized to canvas size)
        const vecX = (p2.x - p1.x) * canvasSize.width;
        const vecY = (p2.y - p1.y) * canvasSize.height;

        // Calculate angle in radians (atan2(y, x)). Angle starts from positive x-axis.
        let angleRadians = Math.atan2(vecY, vecX);

        // Convert angle to CSS degrees (0deg is up, increases clockwise). atan2(y, x) starts from positive x (right) and increases counter-clockwise.
        // Need to adjust: angle from y-axis (up) is atan2(x, y).
        let cssAngleDegrees = Math.round(90 - (angleRadians * 180 / Math.PI));

        // Normalize angle to be between 0 and 360
        if (cssAngleDegrees < 0) cssAngleDegrees += 360;
        if (cssAngleDegrees >= 360) cssAngleDegrees %= 360;

        // Build color stops
        const stopsLinear = points.map(point => {
            // Calculate position along the line (normalized between 0 and 1)
            // Project the point onto the line segment (p1 to p2) and find its distance from p1
            const lineLengthSq = Math.pow(vecX, 2) + Math.pow(vecY, 2);
            let offset = 0;
            if (lineLengthSq > 0) {
                const pointVecX = (point.x - p1.x) * canvasSize.width;
                const pointVecY = (point.y - p1.y) * canvasSize.height;
                const dotProduct = pointVecX * vecX + pointVecY * vecY;
                const t = dotProduct / lineLengthSq;
                offset = Math.max(0, Math.min(1, t)); // Clamp offset between 0 and 1
            }
            return `${point.color} ${Math.round(offset * 100)}%`;
        }).join(', ');

        cssString = `background: linear-gradient(${cssAngleDegrees}deg, ${stopsLinear});`;
        break;

      case 'radial':
        if (points.length < 1) return '/* Need at least one point for a radial gradient CSS. */';

        const centerRadial = points[0];
        // CSS radial-gradient shape and position
        // For simplicity, we'll assume a circle at the center point.
        // To replicate canvas behavior more accurately, might need to calculate extent or shape.
        // Syntax: radial-gradient([shape || size] [at position], color-stop, ...);

        const positionRadial = `${Math.round(centerRadial.x * 100)}% ${Math.round(centerRadial.y * 100)}%`;

         const stopsRadial = points.map(point => {
            // Stops based on distance from the center point relative to the furthest point from center
            const dist = Math.sqrt(Math.pow(point.x - centerRadial.x, 2) + Math.pow(point.y - centerRadial.y, 2));
            // Find the maximum distance from the center to any point to normalize stops
            const maxDist = Math.max(...points.map(p => Math.sqrt(Math.pow(p.x - centerRadial.x, 2) + Math.pow(p.y - centerRadial.y, 2))));
            let offset = 0;
            if(maxDist > 0) { // Avoid division by zero
                offset = dist / maxDist;
            }
            offset = Math.max(0, Math.min(1, offset)); // Clamp offset between 0 and 1
            return `${point.color} ${Math.round(offset * 100)}%`;
         }).join(', ');

        // Using 'circle' for shape and 'at position'
        cssString = `background: radial-gradient(circle at ${positionRadial}, ${stopsRadial});`;
        break;

      case 'conic':
         if (points.length < 1) return '/* Need at least one point for a conic gradient CSS. */';

        const centerConic = points[0];
        const positionConic = `${Math.round(centerConic.x * 100)}% ${Math.round(centerConic.y * 100)}%`;

        // Sort points by angle around the center for conic gradient stops
        const sortedPoints = [...points].sort((a, b) => {
            const angleA = Math.atan2(a.y - centerConic.y, a.x - centerConic.x);
            const angleB = Math.atan2(b.y - centerConic.y, b.x - centerConic.x);
            return angleA - angleB;
        });

        // Convert angles to CSS degrees (0deg is up, increases clockwise)
        const stopsConic = sortedPoints.map(point => {
             const angleRadians = Math.atan2(point.y - centerConic.y, point.x - centerConic.x);
            let cssAngleDegrees = Math.round(90 - (angleRadians * 180 / Math.PI));
             if (cssAngleDegrees < 0) cssAngleDegrees += 360;
             if (cssAngleDegrees >= 360) cssAngleDegrees %= 360;
            return `${point.color} ${cssAngleDegrees}deg`;
        }).join(', ');

        // CSS conic-gradient syntax: conic-gradient([from angle] [at position], color-stop, ...);
        // We'll use 'from 0deg' and 'at position'
        cssString = `background: conic-gradient(from 0deg at ${positionConic}, ${stopsConic});`;
        break;

      case 'mesh':
         cssString = '/* CSS does not have a direct equivalent for Mesh gradients as implemented here. */\n/* Consider exporting as PNG or SVG (which contains a PNG fallback). */';
         break;

      default:
        cssString = '/* Unsupported gradient type for CSS export. */';
    }

    return cssString;
  };

  // Handle copy CSS action from panel
  const handleCopyCss = () => {
    const cssCode = generateCss(gradient);
    setCopyCssStatus('copying');
    if (cssCode && cssCode.indexOf('/* CSS does not have a direct equivalent') === -1) { // Check if it's valid CSS code
        navigator.clipboard.writeText(cssCode)
        .then(() => {
            console.log("CSS code copied to clipboard!");
            setCopyCssStatus('success');
            // TODO: Provide user feedback (e.g., a toast notification)
            setTimeout(() => setCopyCssStatus('idle'), 2000); // Revert after 2 seconds
        })
        .catch(err => {
            console.error("Failed to copy CSS code: ", err);
            setCopyCssStatus('fail');
            // TODO: Provide user feedback about the failure
            setTimeout(() => setCopyCssStatus('idle'), 2000); // Revert after 2 seconds
        });
    } else {
        console.warn("No CSS code generated or unsupported gradient type.");
        setCopyCssStatus('fail'); // Indicate failure for unsupported types as well
        setTimeout(() => setCopyCssStatus('idle'), 2000); // Revert after 2 seconds
        // TODO: Provide user feedback (e.g., a toast notification saying no code was generated)
    }
  };

  // Update point color
  const updatePointColor = (color: string) => {
    if (activePointIndex === null) return

    setGradient((prev) => {
      const newPoints = [...prev.points]
      newPoints[activePointIndex] = {
        ...newPoints[activePointIndex],
        color,
      }
      return { ...prev, points: newPoints }
    })
  }

  // Add a new point
  const addPoint = () => {
    setGradient((prev) => {
      const newPoints = [...prev.points]
      // If no point is selected, add at center
      if (activePointIndex === null) {
        newPoints.push({
          x: 0.5,
          y: 0.5,
          color: generateRandomColor(),
        })
      } else {
        // Add near the selected point with a different color
        const selectedPoint = newPoints[activePointIndex]
        newPoints.push({
          x: Math.max(0.05, Math.min(0.95, selectedPoint.x + (Math.random() - 0.5) * 0.2)),
          y: Math.max(0.05, Math.min(0.95, selectedPoint.y + (Math.random() - 0.5) * 0.2)),
          color: generateRandomColor(), // Generate a new random color for the new point
        })
      }
      return { ...prev, points: newPoints }
    })
  }

  // Remove the active point
  const removePoint = () => {
    if (gradient.points.length <= 2) {
      alert("Cannot remove point. Minimum 2 points required.")
      return
    }

    if (activePointIndex === null) {
      alert("Please select a point to remove")
      return
    }

    setGradient((prev) => {
      const newPoints = [...prev.points]
      newPoints.splice(activePointIndex, 1)
      return { ...prev, points: newPoints }
    })

    setActivePointIndex(null)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div ref={containerRef} className="lg:col-span-2 bg-gray-800 rounded-lg overflow-hidden relative">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full h-auto cursor-pointer"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>

            {/* Colors */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Colors</h3>
              <div className="grid grid-cols-4 gap-2">
                <div
                  className="w-full aspect-square bg-yellow-200 rounded-md cursor-pointer border-2 border-transparent hover:border-white"
                  onClick={() => activePointIndex !== null && updatePointColor("#FFEB3B")}
                ></div>
                <div
                  className="w-full aspect-square bg-blue-500 rounded-md cursor-pointer border-2 border-transparent hover:border-white"
                  onClick={() => activePointIndex !== null && updatePointColor("#2196F3")}
                ></div>
                <div
                  className="w-full aspect-square bg-red-300 rounded-md cursor-pointer border-2 border-transparent hover:border-white"
                  onClick={() => activePointIndex !== null && updatePointColor("#F48FB1")}
                ></div>
                <div
                  className="w-full aspect-square bg-orange-400 rounded-md cursor-pointer border-2 border-transparent hover:border-white"
                  onClick={() => activePointIndex !== null && updatePointColor("#FF9800")}
                ></div>
              </div>
            </div>

            {/* Number of mesh points */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Number of mesh points</h3>
              <Tabs
                defaultValue="1"
                className="w-full"
                onValueChange={(value) => handleGridSizeChange(Number.parseInt(value))}
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="1">1×2</TabsTrigger>
                  <TabsTrigger value="2" disabled={gradient.type !== "mesh"}>2×2</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Control visibility */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Control visibility</h3>
              <Tabs defaultValue="handles" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger
                    value="none"
                    onClick={() => setGradient((prev) => ({ ...prev, showHandles: false, showLines: false }))}
                  >
                    None
                  </TabsTrigger>
                  <TabsTrigger
                    value="handles"
                    onClick={() => setGradient((prev) => ({ ...prev, showHandles: true, showLines: false }))}
                  >
                    Handles
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Gradient Type */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Gradient Type</h3>
              <Tabs
                value={gradient.type}
                onValueChange={(value) => {
                  setGradient((prev) => {
                    const newType = value as GradientType;
                    if (newType !== "mesh") {
                      // When switching to Linear or Radial, force to 2 points (1x2 layout)
                      setGridSize(1); // Update UI control
                      
                      let pointsToUse: Point[] = [];
                      if (lockColors) {
                         // Use colors from the first two existing points if locked
                         pointsToUse = [ 
                           { ...generateRandomPointPositions(1)[0], color: prev.points[0]?.color || generateRandomColor() },
                           { ...generateRandomPointPositions(1)[0], color: prev.points[1]?.color || generateRandomColor() },
                          ];
                       } else {
                         // Generate completely new random points
                         pointsToUse = generateRandomPoints(2);
                       }
                       
                      return {
                        id: prev.id,
                        points: pointsToUse,
                        showHandles: prev.showHandles,
                        showLines: prev.showLines,
                        type: newType
                      };
                    } else {
                      // When switching back to Mesh, keep current points and grid size
                      return {
                        id: prev.id,
                        points: prev.points,
                        showHandles: prev.showHandles,
                        showLines: prev.showLines,
                        type: newType,
                      };
                    }
                  });
                }}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="mesh">Mesh</TabsTrigger>
                  <TabsTrigger value="linear">Linear</TabsTrigger>
                  <TabsTrigger value="radial">Radial</TabsTrigger>
                  <TabsTrigger value="conic">Conic</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Lock Colors Toggle */}
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="lock-colors">Lock Colors</Label>
              <Switch
                id="lock-colors"
                checked={lockColors}
                onCheckedChange={setLockColors}
              />
            </div>

            {/* Lock Positions Toggle */}
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="lock-positions">Lock Positions</Label>
              <Switch
                id="lock-positions"
                checked={lockPositions}
                onCheckedChange={setLockPositions}
              />
            </div>

            {/* Color Picker */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Selected Point Color</h3>
              {activePointIndex !== null && gradient.points[activePointIndex] ? (
                <ColorPicker
                  color={gradient.points[activePointIndex].color}
                  onChange={updatePointColor}
                />
              ) : (
                <p className="text-sm text-gray-400">Select a point to edit its color</p>
              )}

              {/* Point controls */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" onClick={removePoint}>
                  Remove Point
                </Button>
                <Button variant="outline" onClick={addPoint}>
                  Add Point
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="flex items-center gap-2" onClick={randomizeGradient}>
                <RefreshCw className="h-4 w-4" />
                Randomize
              </Button>

              {/* Export Button */}
              <Button className="flex items-center gap-2 col-span-2" onClick={() => setExportPanelOpen(true)}>
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button className="flex items-center gap-2 col-span-2" onClick={saveGradient}>
                <Save className="h-4 w-4" />
                Save Gradient
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Export Options Panel */}
      {exportPanelOpen && (
        <ExportOptionsPanel
          gradient={gradient}
          canvasSize={canvasSize}
          onClose={() => setExportPanelOpen(false)}
          onExport={handleExport}
          onCopySvg={handleCopySvg}
          onCopyCss={handleCopyCss}
          copySvgStatus={copySvgStatus}
          copyCssStatus={copyCssStatus}
        />
      )}

      {/* Saved Gradients */}
      <SavedGradients savedGradients={savedGradients} onLoad={loadGradient} onDelete={deleteGradient} />
    </div>
  )
}
