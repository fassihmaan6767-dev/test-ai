'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Trash2, Type, Image as ImageIcon, MousePointerClick, Minus, Settings2 } from 'lucide-react';

export type CanvasElementType = 'text' | 'image' | 'button' | 'divider';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  content: string;
  styles: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    borderRadius?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    borderWidth?: number;
    borderColor?: string;
    opacity?: number;
  };
  link?: string;
  zIndex: number;
}

interface CanvasEditorProps {
  value: string; // JSON string
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CanvasEditor({ value, onChange, readOnly = false }: CanvasEditorProps) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [maxZIndex, setMaxZIndex] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setElements(parsed);
          const highestZ = Math.max(...parsed.map(e => e.zIndex || 1));
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMaxZIndex(highestZ);
        }
      } catch (e) {
        // Not a valid JSON, maybe old markdown. Keep empty or handle gracefully.
      }
    }
  }, [value]);

  const saveElements = (newElements: CanvasElement[]) => {
    setElements(newElements);
    if (!readOnly) {
      onChange(JSON.stringify(newElements));
    }
  };

  const addElement = (type: CanvasElementType) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    
    const newElement: CanvasElement = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      x: 20,
      y: 20,
      width: type === 'divider' ? 200 : (type === 'image' ? 200 : 150),
      height: type === 'divider' ? 10 : (type === 'image' ? 150 : 50),
      content: type === 'text' ? 'New Text' : (type === 'button' ? 'Click Me' : (type === 'image' ? 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=200&auto=format&fit=crop' : '')),
      styles: {
        fontSize: type === 'text' ? 16 : 14,
        color: type === 'button' ? '#ffffff' : '#1A1A1A',
        backgroundColor: type === 'button' ? '#1A1A1A' : 'transparent',
        textAlign: 'left',
        fontWeight: 'normal',
        fontStyle: 'normal',
        borderRadius: type === 'button' ? 8 : 0,
        borderStyle: 'solid',
        borderWidth: type === 'divider' ? 2 : 0,
        borderColor: '#1A1A1A',
      },
      zIndex: newZ
    };
    saveElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    const newElements = elements.map(e => e.id === id ? { ...e, ...updates } : e);
    saveElements(newElements);
  };

  const updateStyle = (id: string, styleUpdates: Partial<CanvasElement['styles']>) => {
    const newElements = elements.map(e => {
      if (e.id === id) {
        return { ...e, styles: { ...e.styles, ...styleUpdates } };
      }
      return e;
    });
    saveElements(newElements);
  };

  const deleteElement = (id: string) => {
    saveElements(elements.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const bringToFront = (id: string) => {
    if (readOnly) return;
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    updateElement(id, { zIndex: newZ });
    setSelectedId(id);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
    }
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div className="flex flex-col w-full h-full border border-[#d6c7b4] rounded-xl overflow-hidden bg-[#faf7f2]">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between p-2 bg-[#f4eee6] border-b border-[#d6c7b4] gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => addElement('text')} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#4A3E33] bg-white rounded-lg shadow-sm border border-[#e2d5c3] hover:bg-[#faf7f2]">
              <Type className="w-3.5 h-3.5" /> Text
            </button>
            <button type="button" onClick={() => addElement('image')} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#4A3E33] bg-white rounded-lg shadow-sm border border-[#e2d5c3] hover:bg-[#faf7f2]">
              <ImageIcon className="w-3.5 h-3.5" /> Image
            </button>
            <button type="button" onClick={() => addElement('button')} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#4A3E33] bg-white rounded-lg shadow-sm border border-[#e2d5c3] hover:bg-[#faf7f2]">
              <MousePointerClick className="w-3.5 h-3.5" /> Button
            </button>
            <button type="button" onClick={() => addElement('divider')} className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#4A3E33] bg-white rounded-lg shadow-sm border border-[#e2d5c3] hover:bg-[#faf7f2]">
              <Minus className="w-3.5 h-3.5" /> Divider
            </button>
          </div>
          {selectedElement && (
            <div className="flex items-center gap-2">
               <button type="button" onClick={() => deleteElement(selectedElement.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          )}
        </div>
      )}

      {!readOnly && selectedElement && (
         <div className="flex flex-wrap items-center gap-3 p-2 bg-white border-b border-[#e2d5c3] text-xs">
           <div className="flex items-center gap-1 text-[#4A3E33]">
             <Settings2 className="w-4 h-4 text-[#8A7B6E]" />
             <span className="font-semibold uppercase tracking-wider text-[10px]">{selectedElement.type} Settings:</span>
           </div>

           {selectedElement.type === 'text' && (
             <>
               <input 
                 type="number" 
                 value={selectedElement.styles.fontSize || 16} 
                 onChange={(e) => updateStyle(selectedElement.id, { fontSize: Number(e.target.value) })}
                 className="w-14 px-1.5 py-1 border rounded"
                 title="Font Size (px)"
               />
               <input 
                 type="color" 
                 value={selectedElement.styles.color || '#000000'}
                 onChange={(e) => updateStyle(selectedElement.id, { color: e.target.value })}
                 className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                 title="Text Color"
               />
               <select 
                 value={selectedElement.styles.textAlign || 'left'}
                 onChange={(e) => updateStyle(selectedElement.id, { textAlign: e.target.value as any })}
                 className="px-1.5 py-1 border rounded bg-white"
               >
                 <option value="left">Left</option>
                 <option value="center">Center</option>
                 <option value="right">Right</option>
               </select>
               <button 
                 type="button"
                 onClick={() => updateStyle(selectedElement.id, { fontWeight: selectedElement.styles.fontWeight === 'bold' ? 'normal' : 'bold' })}
                 className={`px-2 py-1 border rounded ${selectedElement.styles.fontWeight === 'bold' ? 'bg-[#e2d5c3] font-bold' : 'bg-white'}`}
               >B</button>
               <button 
                 type="button"
                 onClick={() => updateStyle(selectedElement.id, { fontStyle: selectedElement.styles.fontStyle === 'italic' ? 'normal' : 'italic' })}
                 className={`px-2 py-1 border rounded italic ${selectedElement.styles.fontStyle === 'italic' ? 'bg-[#e2d5c3]' : 'bg-white'}`}
               >I</button>
             </>
           )}

           {selectedElement.type === 'image' && (
             <div className="flex-1 flex items-center gap-2">
               <input 
                 type="text" 
                 placeholder="Image URL..." 
                 value={selectedElement.content}
                 onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                 className="flex-1 px-2 py-1 border rounded"
               />
               <input 
                 type="number" 
                 placeholder="Border Radius"
                 value={selectedElement.styles.borderRadius || 0}
                 onChange={(e) => updateStyle(selectedElement.id, { borderRadius: Number(e.target.value) })}
                 className="w-14 px-1.5 py-1 border rounded"
                 title="Border Radius (px)"
               />
             </div>
           )}

           {selectedElement.type === 'button' && (
             <>
               <input 
                 type="text" 
                 placeholder="Button URL..." 
                 value={selectedElement.link || ''}
                 onChange={(e) => updateElement(selectedElement.id, { link: e.target.value })}
                 className="w-32 px-2 py-1 border rounded"
               />
               <input 
                 type="color" 
                 value={selectedElement.styles.backgroundColor || '#000000'}
                 onChange={(e) => updateStyle(selectedElement.id, { backgroundColor: e.target.value })}
                 className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                 title="Background Color"
               />
               <input 
                 type="color" 
                 value={selectedElement.styles.color || '#ffffff'}
                 onChange={(e) => updateStyle(selectedElement.id, { color: e.target.value })}
                 className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                 title="Text Color"
               />
               <input 
                 type="number" 
                 value={selectedElement.styles.borderRadius || 8}
                 onChange={(e) => updateStyle(selectedElement.id, { borderRadius: Number(e.target.value) })}
                 className="w-14 px-1.5 py-1 border rounded"
                 title="Border Radius (px)"
               />
             </>
           )}

           {selectedElement.type === 'divider' && (
             <>
               <input 
                 type="color" 
                 value={selectedElement.styles.borderColor || '#000000'}
                 onChange={(e) => updateStyle(selectedElement.id, { borderColor: e.target.value })}
                 className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                 title="Line Color"
               />
               <input 
                 type="number" 
                 value={selectedElement.styles.borderWidth || 2}
                 onChange={(e) => updateStyle(selectedElement.id, { borderWidth: Number(e.target.value) })}
                 className="w-14 px-1.5 py-1 border rounded"
                 title="Thickness (px)"
               />
               <select 
                 value={selectedElement.styles.borderStyle || 'solid'}
                 onChange={(e) => updateStyle(selectedElement.id, { borderStyle: e.target.value as any })}
                 className="px-1.5 py-1 border rounded bg-white"
               >
                 <option value="solid">Solid</option>
                 <option value="dashed">Dashed</option>
                 <option value="dotted">Dotted</option>
               </select>
             </>
           )}
         </div>
      )}

      <div 
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="relative flex-1 w-full min-h-[300px] overflow-hidden bg-[radial-gradient(#e2d5c3_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {elements.map((el) => {
          const isActive = selectedId === el.id && !readOnly;
          const commonStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            color: el.styles.color,
            fontSize: `${el.styles.fontSize}px`,
            textAlign: el.styles.textAlign,
            fontWeight: el.styles.fontWeight,
            fontStyle: el.styles.fontStyle,
            backgroundColor: el.styles.backgroundColor,
            borderRadius: `${el.styles.borderRadius}px`,
            outline: isActive ? '2px solid #3b82f6' : 'none',
            outlineOffset: '2px',
          };

          const InnerContent = () => {
            if (el.type === 'text') {
              return readOnly ? (
                <div style={commonStyle} className="whitespace-pre-wrap break-words">{el.content}</div>
              ) : (
                <textarea
                  value={el.content}
                  onChange={(e) => updateElement(el.id, { content: e.target.value })}
                  style={{ ...commonStyle, resize: 'none', background: 'transparent', border: 'none' }}
                  className="w-full h-full focus:outline-none"
                />
              );
            }
            if (el.type === 'image') {
              return (
                <div style={{ ...commonStyle, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={el.content} alt="Canvas Image" className="w-full h-full object-cover pointer-events-none" />
                </div>
              );
            }
            if (el.type === 'button') {
              const btnStyle = { ...commonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' };
              return readOnly ? (
                <a href={el.link || '#'} target="_blank" rel="noreferrer" style={btnStyle} className="no-underline">{el.content}</a>
              ) : (
                <input
                  type="text"
                  value={el.content}
                  onChange={(e) => updateElement(el.id, { content: e.target.value })}
                  style={{ ...btnStyle, border: 'none', textAlign: 'center' }}
                  className="focus:outline-none"
                />
              );
            }
            if (el.type === 'divider') {
              return (
                <div style={{ 
                   width: '100%', 
                   height: '100%', 
                   display: 'flex', 
                   alignItems: 'center',
                   outline: isActive ? '2px solid #3b82f6' : 'none'
                }}>
                  <div style={{
                    width: '100%',
                    borderTopWidth: `${el.styles.borderWidth}px`,
                    borderTopStyle: el.styles.borderStyle,
                    borderTopColor: el.styles.borderColor,
                  }} />
                </div>
              );
            }
            return null;
          };

          if (readOnly) {
            return (
              <div 
                key={el.id} 
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  zIndex: el.zIndex
                }}
              >
                <InnerContent />
              </div>
            );
          }

          return (
            <Rnd
              key={el.id}
              bounds="parent"
              position={{ x: el.x, y: el.y }}
              size={{ width: el.width, height: el.height }}
              onDragStart={() => bringToFront(el.id)}
              onDragStop={(e, d) => {
                updateElement(el.id, { x: d.x, y: d.y });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateElement(el.id, {
                  width: ref.style.width,
                  height: ref.style.height,
                  ...position,
                });
              }}
              style={{ zIndex: el.zIndex }}
              disableDragging={isActive && el.type === 'text'} // Allow text selection when editing
              enableResizing={isActive}
              className={isActive ? 'z-50 cursor-move' : 'cursor-pointer'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                bringToFront(el.id);
              }}
            >
              <InnerContent />
            </Rnd>
          );
        })}
      </div>
    </div>
  );
}
