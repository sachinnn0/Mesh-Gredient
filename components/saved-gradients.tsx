"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRef, useEffect } from "react"

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
  type: "mesh" | "linear" | "radial" | "conic"
}

interface SavedGradientsProps {
  savedGradients: MeshGradient[]
  onLoad: (gradient: MeshGradient) => void
  onDelete: (id: string) => void
}

export default function SavedGradients({ savedGradients, onLoad, onDelete }: SavedGradientsProps) {
  if (savedGradients.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Saved Gradients</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {savedGradients.map((gradient) => (
          <SavedGradientCard key={gradient.id} gradient={gradient} onLoad={onLoad} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

function SavedGradientCard({
  gradient,
  onLoad,
  onDelete,
}: {
  gradient: MeshGradient
  onLoad: (gradient: MeshGradient) => void
  onDelete: (id: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw the gradient
    drawGradient(ctx, gradient, canvas.width, canvas.height)
  }, [gradient])

  // Draw the gradient
  const drawGradient = (ctx: CanvasRenderingContext2D, gradient: MeshGradient, width: number, height: number) => {
    const { points } = gradient

    if (points.length === 0) return

    // Create an offscreen canvas for better performance
    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvas.width = width
    offscreenCanvas.height = height
    const offCtx = offscreenCanvas.getContext("2d")

    if (!offCtx) return

    // Fill with a gradient based on the points
    const gradientCanvas = document.createElement("canvas")
    gradientCanvas.width = width
    gradientCanvas.height = height
    const gradientCtx = gradientCanvas.getContext("2d")

    if (!gradientCtx) return

    // Draw each point's influence
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        // Calculate weighted colors based on distance to each point
        let totalWeight = 0
        let r = 0,
          g = 0,
          b = 0

        points.forEach((point) => {
          const dx = x - point.x * width
          const dy = y - point.y * height
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Use inverse square for smoother gradients
          const weight = 1 / (distance * distance + 1)
          totalWeight += weight

          // Parse the color
          const color = point.color
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color)

          if (result) {
            const pr = Number.parseInt(result[1], 16)
            const pg = Number.parseInt(result[2], 16)
            const pb = Number.parseInt(result[3], 16)

            r += pr * weight
            g += pg * weight
            b += pb * weight
          }
        })

        // Normalize and set the pixel color
        r = Math.round(r / totalWeight)
        g = Math.round(g / totalWeight)
        b = Math.round(b / totalWeight)

        gradientCtx.fillStyle = `rgb(${r}, ${g}, ${b})`
        gradientCtx.fillRect(x, y, 1, 1)
      }
    }

    // Apply a blur for smoother gradients
    gradientCtx.filter = "blur(8px)"
    gradientCtx.drawImage(gradientCanvas, 0, 0)

    // Draw the final gradient to the main canvas
    ctx.drawImage(gradientCanvas, 0, 0)
  }

  return (
    <Card className="overflow-hidden group relative">
      <canvas
        ref={canvasRef}
        width={150}
        height={150}
        className="w-full h-auto cursor-pointer"
        onClick={() => onLoad(gradient)}
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(gradient.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
