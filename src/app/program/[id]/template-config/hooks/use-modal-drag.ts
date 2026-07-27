import { useState, useRef } from 'react';
import { TemplateConfigOffsets } from '../template-config';

export function useModalDrag(initialPosition: { x: number; y: number }) {
  const [position, setPosition] = useState(initialPosition);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - TemplateConfigOffsets.x,
        y: e.clientY - TemplateConfigOffsets.y,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return { modalRef, modalPosition: position, handleMouseDown };
}
