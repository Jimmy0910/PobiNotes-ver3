import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  PenTool,
  Highlighter,
  Eraser,
  Square,
  MoveRight,
  RotateCcw,
  Trash2,
  Save,
  Download,
  X,
  Check,
  Type
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';

interface ImageAnnotatorModalProps {
  imageUrl: string;
  onClose: () => void;
  onSaveAnnotatedImage: (newImageUrl: string) => Promise<void>;
  title?: string;
}

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'rect' | 'arrow' | 'text';

interface HistoryStep {
  imageData: ImageData;
}

export default function ImageAnnotatorModal({
  imageUrl,
  onClose,
  onSaveAnnotatedImage,
  title = '手帳紅筆訂正與標註'
}: ImageAnnotatorModalProps) {
  const { showToast, confirmDialog } = useUiFeedback();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tool states
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#dc2626'); // 經典訂正紅
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [textInput, setTextInput] = useState<string>('重點盲點');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Drawing state
  const isDrawingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<HistoryStep[]>([]);
  const maxHistorySteps = 15;

  // Image load & canvas initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas size to matched natural image size or reasonable bounds
      const maxW = 1200;
      const maxH = 900;
      let w = img.naturalWidth || 800;
      let h = img.naturalHeight || 600;

      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;

      // Draw original image
      ctx.drawImage(img, 0, 0, w, h);

      // Save initial state to history
      const initialSnapshot = ctx.getImageData(0, 0, w, h);
      historyRef.current = [{ imageData: initialSnapshot }];
    };

    img.src = imageUrl;
  }, [imageUrl]);

  const saveStateToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push({ imageData: currentData });
    if (historyRef.current.length > maxHistorySteps) {
      historyRef.current.shift();
    }
  }, []);

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    historyRef.current.pop(); // Remove current
    const previous = historyRef.current[historyRef.current.length - 1];
    if (previous) {
      ctx.putImageData(previous.imageData, 0, 0);
    }
  };

  const handleClearAll = async () => {
    const ok = await confirmDialog({
      title: '清除筆跡確認',
      message: '確定要清除所有手寫筆跡與標註嗎？',
      confirmText: '確認清除',
      cancelText: '取消',
      danger: true
    });
    if (!ok) return;
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Reset to the very first state (clean image)
    const original = historyRef.current[0];
    if (original) {
      ctx.putImageData(original.imageData, 0, 0);
      historyRef.current = [original];
    }
  };

  const getCanvasCoordinates = (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawingWithCoords = (coords: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    isDrawingRef.current = true;
    startPosRef.current = coords;

    // Snapshot for previewing rect/arrow
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    if (currentTool === 'text') {
      // Stamp text at click location
      ctx.save();
      ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
      ctx.fillStyle = strokeColor;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(textInput || '重點標註', coords.x, coords.y);
      ctx.restore();
      saveStateToHistory();
      isDrawingRef.current = false;
    }
  };

  const drawWithCoords = (currentCoords: { x: number; y: number }) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'pen') {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();
    } else if (currentTool === 'highlighter') {
      // Semi-transparent overlay with wider stroke
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth * 3.5;
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.lineWidth = lineWidth * 4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();
    } else if (currentTool === 'rect') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      const w = currentCoords.x - startPosRef.current.x;
      const h = currentCoords.y - startPosRef.current.y;
      ctx.strokeRect(startPosRef.current.x, startPosRef.current.y, w, h);
    } else if (currentTool === 'arrow') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
      ctx.lineWidth = lineWidth;

      const fromX = startPosRef.current.x;
      const fromY = startPosRef.current.y;
      const toX = currentCoords.x;
      const toY = currentCoords.y;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const headLen = Math.max(12, lineWidth * 3.5);
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    startDrawingWithCoords(getCanvasCoordinates(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    drawWithCoords(getCanvasCoordinates(e));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    stopDrawing();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    stopDrawing();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    startDrawingWithCoords(getCanvasCoordinates(e));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    if (!isDrawingRef.current) return;
    drawWithCoords(getCanvasCoordinates(e));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    stopDrawing();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    saveStateToHistory();
  };

  const handleSaveToMistake = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      let finalKeyOrDataUrl = '';

      // Try uploading to backend image storage
      try {
        const blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(b => resolve(b), 'image/jpeg', 0.90);
        });

        if (blob) {
          const formData = new FormData();
          formData.append('image', blob, 'annotated_mistake.jpg');

          const res = await apiRequest('/api/images/upload', {
            method: 'POST',
            body: formData
          });

          if (res?.key || res?.url) {
            finalKeyOrDataUrl = res.key || res.url;
          }
        }
      } catch (uploadErr) {
        console.warn('後端上傳失敗或訪客模式，降級為高畫質本機 DataURL 儲存：', uploadErr);
      }

      // If backend upload was unavailable or failed, use canvas DataURL
      if (!finalKeyOrDataUrl) {
        finalKeyOrDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }

      await onSaveAnnotatedImage(finalKeyOrDataUrl);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 600);
    } catch (err: any) {
      showToast(err.message || '儲存標註圖片時發生錯誤', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `錯題標註_${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  const modalContent = (
    <div
      className="modal-overlay image-annotator-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 16px 16px 16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass animate-fade-in"
        style={{
          width: '96vw',
          maxWidth: '1280px',
          height: '92vh',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.55)',
          border: '1px solid var(--glass-border)',
          position: 'relative',
          zIndex: 1000000
        }}
      >
        {/* Header Toolbar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PenTool size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                直接在題目相片上用紅筆圈選考點、螢光筆標記題幹盲點或加註算式
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleUndo}
              className="notebook-tool-btn"
              style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="復原上一步"
            >
              <RotateCcw size={14} /> 復原
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="notebook-tool-btn"
              style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="清除所有標註"
            >
              <Trash2 size={14} /> 清除全部
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              className="notebook-tool-btn"
              style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="下載標註後圖片"
            >
              <Download size={14} /> 另存圖片
            </button>
            <button
              type="button"
              onClick={handleSaveToMistake}
              disabled={isSaving || saveSuccess}
              className="notebook-primary-btn"
              style={{ padding: '8px 18px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saveSuccess ? (
                <>
                  <Check size={16} /> 已成功套用！
                </>
              ) : isSaving ? (
                '儲存中...'
              ) : (
                <>
                  <Save size={15} /> 儲存至錯題
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="notebook-tool-btn"
              style={{ padding: '6px 10px' }}
              title="關閉編輯器"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Secondary Tool Selection Palette */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            whiteSpace: 'nowrap',
            background: 'var(--bg-secondary)',
            fontSize: '0.84rem'
          }}
        >
          {/* Tool switchers */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>工具：</span>
            <button
              type="button"
              onClick={() => { setCurrentTool('pen'); setStrokeColor('#dc2626'); }}
              className={`notebook-tool-btn ${currentTool === 'pen' ? 'ring-2 ring-red-500 font-bold' : ''}`}
              style={{ minHeight: '34px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: currentTool === 'pen' ? '#fee2e2' : undefined }}
            >
              <PenTool size={14} style={{ color: '#dc2626' }} /> 紅筆
            </button>
            <button
              type="button"
              onClick={() => { setCurrentTool('highlighter'); setStrokeColor('#eab308'); }}
              className={`notebook-tool-btn ${currentTool === 'highlighter' ? 'ring-2 ring-amber-500 font-bold' : ''}`}
              style={{ minHeight: '34px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: currentTool === 'highlighter' ? '#fef9c3' : undefined }}
            >
              <Highlighter size={14} style={{ color: '#ca8a04' }} /> 螢光筆
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('rect')}
              className={`notebook-tool-btn ${currentTool === 'rect' ? 'ring-2 ring-blue-500 font-bold' : ''}`}
              style={{ minHeight: '34px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Square size={14} /> 圈選方框
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('arrow')}
              className={`notebook-tool-btn ${currentTool === 'arrow' ? 'ring-2 ring-blue-500 font-bold' : ''}`}
              style={{ minHeight: '34px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <MoveRight size={14} /> 指示箭頭
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('text')}
              className={`notebook-tool-btn ${currentTool === 'text' ? 'ring-2 ring-purple-500 font-bold' : ''}`}
              style={{ minHeight: '34px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Type size={14} /> 重點印章
            </button>
            <button
              type="button"
              onClick={() => setCurrentTool('eraser')}
              className={`notebook-tool-btn ${currentTool === 'eraser' ? 'ring-2 ring-gray-500 font-bold' : ''}`}
              style={{ minHeight: '34px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Eraser size={14} /> 橡皮擦
            </button>
          </div>

          {/* Color palette */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>墨水：</span>
            {[
              { label: '紅筆', value: '#dc2626' },
              { label: '藍筆', value: '#2563eb' },
              { label: '黑筆', value: '#18181b' },
              { label: '螢光黃', value: '#eab308' },
              { label: '螢光綠', value: '#16a34a' }
            ].map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setStrokeColor(c.value)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  border: strokeColor === c.value ? '2.5px solid #ffffff' : '1px solid rgba(0,0,0,0.2)',
                  boxShadow: strokeColor === c.value ? `0 0 0 2px ${c.value}` : 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={c.label}
              />
            ))}
          </div>

          {/* Line width */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>粗細：</span>
            {[
              { label: '細', val: 2 },
              { label: '中', val: 4 },
              { label: '粗', val: 7 }
            ].map(w => (
              <button
                key={w.val}
                type="button"
                onClick={() => setLineWidth(w.val)}
                className={`notebook-tool-btn ${lineWidth === w.val ? 'font-bold ring-1 ring-amber-500' : ''}`}
                style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.8rem' }}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Text stamp input */}
          {currentTool === 'text' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>印章內容：</span>
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="點擊畫布蓋章"
                className="input"
                style={{ width: '130px', height: '30px', padding: '2px 8px', fontSize: '0.82rem' }}
              />
              {['算式錯誤', '粗心漏看', '公式定理', '關鍵解法'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTextInput(preset)}
                  className="notebook-tool-btn"
                  style={{ minHeight: '30px', padding: '3px 8px', fontSize: '0.76rem' }}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Workspace Container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.08)',
            position: 'relative',
            touchAction: 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
              borderRadius: '8px',
              cursor:
                currentTool === 'eraser'
                  ? 'crosshair'
                  : currentTool === 'text'
                  ? 'text'
                  : 'crosshair',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              backgroundColor: '#ffffff',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
