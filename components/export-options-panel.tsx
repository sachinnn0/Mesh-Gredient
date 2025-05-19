"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Copy, Lock, Unlock } from "lucide-react";

interface ExportOptionsPanelProps {
  gradient: any; // TODO: Replace 'any' with actual MeshGradient type
  canvasSize: { width: number; height: number };
  onClose: () => void;
  onExport: (format: string, width: number, height: number, quality: string) => void;
  onCopySvg: () => void;
  onCopyCss: () => void;
  copySvgStatus: string;
  copyCssStatus: string;
}

export default function ExportOptionsPanel({
  gradient,
  canvasSize,
  onClose,
  onExport,
  onCopySvg,
  onCopyCss,
  copySvgStatus,
  copyCssStatus,
}: ExportOptionsPanelProps) {
  const [format, setFormat] = useState("PNG");
  const [quality, setQuality] = useState("NORMAL");
  const [width, setWidth] = useState(canvasSize.width);
  const [height, setHeight] = useState(canvasSize.height);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Update dimensions when canvasSize prop changes
  useEffect(() => {
    setWidth(canvasSize.width);
    setHeight(canvasSize.height);
  }, [canvasSize]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Number(e.target.value);
    if (!isNaN(newWidth)) {
      setWidth(newWidth);
      if (lockAspectRatio) {
        setHeight(Math.round(newWidth * (canvasSize.height / canvasSize.width)));
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = Number(e.target.value);
    if (!isNaN(newHeight)) {
      setHeight(newHeight);
      if (lockAspectRatio) {
        setWidth(Math.round(newHeight * (canvasSize.width / canvasSize.height)));
      }
    }
  };

  const handleLockToggle = () => {
    setLockAspectRatio(!lockAspectRatio);
  };

  const handleExportClick = () => {
    onExport(format, width, height, quality);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md text-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Options</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>

        {/* Format */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Format:</h3>
          <Tabs value={format} onValueChange={setFormat} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="PNG">PNG</TabsTrigger>
              <TabsTrigger value="JPEG">JPEG</TabsTrigger>
              <TabsTrigger value="SVG">SVG</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Quality (only for raster formats) */}
        {format !== "SVG" && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Quality:</h3>
            <Tabs value={quality} onValueChange={setQuality} className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="LOW">LOW</TabsTrigger>
                <TabsTrigger value="NORMAL">NORMAL</TabsTrigger>
                <TabsTrigger value="HIGH">HIGH</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Dimensions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Dimensions:</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="width" className="text-sm font-medium mb-2 text-gray-700">Width:</Label>
              <Input id="width" type="number" value={width} onChange={handleWidthChange} className="text-gray-500 hover:text-gray-900" />
            </div>
            <button onClick={handleLockToggle} className="mt-5 text-gray-500 hover:text-gray-700">
              {lockAspectRatio ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
            <div className="flex-1">
              <Label htmlFor="height" className="text-sm font-medium mb-2 text-gray-700">Height:</Label>
              <Input id="height" type="number" value={height} onChange={handleHeightChange} className="text-gray-500 hover:text-gray-900" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button className="flex items-center gap-2" onClick={handleExportClick}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" className="flex items-center gap-2 " onClick={onCopySvg}>
            <Copy className="h-4 w-4" />
            {copySvgStatus === 'success' ? 'Copied!' : copySvgStatus === 'fail' ? 'Failed!' : 'Copy As SVG'}
          </Button>
        </div>

        {/* Copy CSS */}
        <div className="mb-6">
          <Button variant="outline" className="flex items-center gap-2 w-full" onClick={onCopyCss}>
            <Copy className="h-4 w-4" />
            {copyCssStatus === 'success' ? 'Copied!' : copyCssStatus === 'fail' ? 'Failed!' : 'Copy CSS Code'}
          </Button>
        </div>
      </div>
    </div>
  );
} 