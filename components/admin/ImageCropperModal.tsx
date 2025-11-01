
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import { Crop, ZoomIn, ZoomOut, Move, Check, RotateCcw } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onSave: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  aspectRatio = 3 / 2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image.src) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(image, -image.width / 2, -image.height / 2, image.width, image.height);
    ctx.restore();
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Carve out the crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    // Draw safe zone guide
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    const safeZonePadding = 0.05; // 5% padding
    ctx.strokeRect(canvas.width * safeZonePadding, canvas.height * safeZonePadding, canvas.width * (1 - safeZonePadding * 2), canvas.height * (1 - safeZonePadding * 2));
    ctx.setLineDash([]);

  }, [pan, zoom]);

  useEffect(() => {
    if (!imageSrc) return;
    const image = imageRef.current;
    image.crossOrigin = "anonymous"; // Handle potential CORS issues if loading from URL
    image.src = imageSrc;
    image.onload = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      // Resize canvas to fit container while maintaining aspect ratio
      const containerWidth = container.offsetWidth;
      canvas.width = Math.min(containerWidth, 600);
      canvas.height = canvas.width / aspectRatio;

      // Calculate minimum zoom to fill the canvas
      const scaleX = canvas.width / image.width;
      const scaleY = canvas.height / image.height;
      const initialZoom = Math.max(scaleX, scaleY);
      
      setZoom(initialZoom);
      setMinZoom(initialZoom);
      setPan({ x: 0, y: 0 }); // Reset pan
      draw();
    };
  }, [imageSrc, aspectRatio]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleSave = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image.src) return;

    // Create a new canvas with the final dimensions
    const outputCanvas = document.createElement('canvas');
    const outputWidth = 800; // Standard width for uploads
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputWidth / aspectRatio;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // Calculate the source region from the original image
    const scale = image.width / (canvas.width / zoom);
    const sourceX = (image.width / 2) - (pan.x * scale);
    const sourceY = (image.height / 2) - (pan.y * scale);
    const sourceWidth = outputCanvas.width * scale;
    const sourceHeight = outputCanvas.height * scale;
    
    outputCtx.drawImage(
      image,
      sourceX - (sourceWidth / 2),
      sourceY - (sourceHeight / 2),
      sourceWidth,
      sourceHeight,
      0, 0, outputCanvas.width, outputCanvas.height
    );

    outputCanvas.toBlob(blob => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.8);
  };
  
  const resetAdjustments = () => {
      setZoom(minZoom);
      setPan({x: 0, y: 0});
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sesuaikan Gambar">
      <div ref={containerRef} className="relative w-full mb-4">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-auto cursor-move rounded-md bg-gray-800"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-grow">
          <ZoomOut size={20} className="text-muted" />
          <input
            type="range"
            min={minZoom}
            max={minZoom * 3}
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <ZoomIn size={20} className="text-muted" />
        </div>
        <button onClick={resetAdjustments} className="p-2 text-muted hover:bg-base-200 rounded-full" aria-label="Reset">
            <RotateCcw size={18} />
        </button>
      </div>
       <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Batal</button>
          <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90">
            <Check size={16}/> Terapkan & Simpan
          </button>
      </div>
    </Modal>
  );
};

export default ImageCropperModal;