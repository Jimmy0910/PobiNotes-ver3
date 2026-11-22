import { useState, useEffect, useRef, useMemo } from 'react';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
import { extractMistakeMediaAndText } from '../utils/mistakeMedia';
import { isLegacyMasteryField, type MistakeRecord } from '../types';
import {
  Printer,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  FileDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Columns,
  Square,
  Award,
  Check,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FieldOption {
  value: string;
  color?: 'default' | 'danger' | 'warning' | 'success';
}

interface Field {
  id: string;
  type: 'text' | 'textarea' | 'image' | 'options';
  label: string;
  options?: FieldOption[];
  styleType?: 'bordered' | 'underline';
  inline?: boolean;
  hideLabel?: boolean;
}

interface ExportPDFProps {
  mistakeIds: string[];
  initialMistakes?: MistakeRecord[];
  onBack?: () => void;
  onImageClick?: (src: string) => void;
  embedded?: boolean;
  defaultSubjectName?: string;
}

type ExamMode = 'practice' | 'separate_appendix' | 'solution';
type LayoutColumn = 'one' | 'two';
type ScratchSpace = 'none' | 'medium' | 'large';

function normalizeOptions(options: any[] | undefined): FieldOption[] {
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, color: 'default' };
    }
    return {
      value: opt?.value || '',
      color: opt?.color || 'default'
    };
  });
}

function normalizeField(f: any): Field {
  return {
    id: f.id,
    type: f.type,
    label: f.label || '',
    options: normalizeOptions(f.options),
    styleType: f.styleType || 'bordered',
    inline: !!f.inline,
    hideLabel: !!f.hideLabel
  };
}

export default function ExportPDF({
  mistakeIds,
  initialMistakes,
  onBack,
  onImageClick,
  embedded = false,
  defaultSubjectName
}: ExportPDFProps) {
  const { showToast } = useUiFeedback();
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Exam Workshop Configuration States (A4 default)
  const [examMode, setExamMode] = useState<ExamMode>('practice');
  const [layoutColumn, setLayoutColumn] = useState<LayoutColumn>('one');
  const [scratchSpace, setScratchSpace] = useState<ScratchSpace>('medium');
  const [paperTitle, setPaperTitle] = useState(
    defaultSubjectName ? `${defaultSubjectName} 模擬練習卷` : '學科能力測驗模擬練習卷'
  );
  const [paperSubtitle, setPaperSubtitle] = useState('重點錯題精選 · A4 標準排版');
  const [scorePerQuestion, setScorePerQuestion] = useState<number>(5);
  const [examDuration, setExamDuration] = useState<number>(60);
  const [showConfigPanel, setShowConfigPanel] = useState(true);

  // Student info bar inputs
  const [studentClass, setStudentClass] = useState('');
  const [studentSeat, setStudentSeat] = useState('');
  const [studentName, setStudentName] = useState('');

  const [checkedStates, setCheckedStates] = useState<{ [mistakeId: string]: { [fieldId: string]: string[] } }>({});

  // PDF Generation & 1-Minute Temporary Cache States
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [cachedPdfUrl, setCachedPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfExpireTime, setPdfExpireTime] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [pdfExpired, setPdfExpired] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const cachedBlobRef = useRef<Blob | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const cancelGenerationRef = useRef<boolean>(false);

  const handleCancelGeneratePdf = () => {
    cancelGenerationRef.current = true;
    setPdfProgressText('正在取消試卷生成...');
  };

  const togglePreviewOption = (mistakeId: string, fieldId: string, optionValue: string) => {
    setCheckedStates(prev => {
      const current = prev[mistakeId]?.[fieldId] || [];
      const next = current.includes(optionValue)
        ? current.filter(o => o !== optionValue)
        : [...current, optionValue];
      return {
        ...prev,
        [mistakeId]: {
          ...prev[mistakeId],
          [fieldId]: next
        }
      };
    });
  };

  useEffect(() => {
    const fetchSelectedMistakes = async () => {
      setLoading(true);
      try {
        let rawList: MistakeRecord[] = [];
        if (initialMistakes && initialMistakes.length > 0) {
          rawList = initialMistakes;
        } else {
          try {
            const allMistakes = await apiRequest('/api/mistakes');
            if (Array.isArray(allMistakes) && allMistakes.length > 0) {
              rawList = allMistakes;
            }
          } catch (e) {
            console.warn('伺服器錯題讀取異常：', e);
          }
        }

        const selected = mistakeIds.length > 0
          ? rawList.filter(m => mistakeIds.includes(m.id))
          : rawList;

        const formatted: MistakeRecord[] = selected.map(m => ({
          ...m,
          template_fields: {
            questionFields: (m.template_fields?.questionFields || []).map(normalizeField),
            answerFields: (m.template_fields?.answerFields || []).map(normalizeField)
          }
        }));

        setMistakes(formatted);

        const initialStates: typeof checkedStates = {};
        formatted.forEach(m => {
          initialStates[m.id] = {};
          const fields = [
            ...(m.template_fields?.questionFields || []),
            ...(m.template_fields?.answerFields || [])
          ];
          fields.forEach(f => {
            if (f.type === 'options' && !isLegacyMasteryField(f)) {
              const val = m.data?.questionData?.[f.id] || m.data?.answerData?.[f.id] || [];
              initialStates[m.id][f.id] = Array.isArray(val) ? val : [];
            }
          });
        });
        setCheckedStates(initialStates);

        const subjects = Array.from(new Set(formatted.map(m => m.subject_name).filter(Boolean)));
        if (subjects.length === 1 && !defaultSubjectName) {
          setPaperTitle(`${subjects[0]} 模擬練習卷`);
        }
      } catch (e) {
        console.error('載入考卷錯題失敗：', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectedMistakes();
  }, [mistakeIds, initialMistakes, defaultSubjectName]);

  // 1-minute Countdown & Cache Disposal Timer
  useEffect(() => {
    if (!pdfExpireTime || !cachedPdfUrl) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((pdfExpireTime - Date.now()) / 1000));
      setCountdownSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        if (cachedPdfUrl) {
          URL.revokeObjectURL(cachedPdfUrl);
        }
        setCachedPdfUrl(null);
        cachedBlobRef.current = null;
        setPdfExpired(true);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [pdfExpireTime, cachedPdfUrl]);

  useEffect(() => {
    return () => {
      if (cachedPdfUrl) {
        URL.revokeObjectURL(cachedPdfUrl);
      }
    };
  }, [cachedPdfUrl]);

  // Group mistakes into rows (1 per row in single-column, 2 per row in two-column)
  // so each row is rendered as an indivisible A4 pagination block
  const questionRows = useMemo(() => {
    const step = layoutColumn === 'two' ? 2 : 1;
    const rows: Array<Array<{ mistake: MistakeRecord; index: number }>> = [];
    for (let i = 0; i < mistakes.length; i += step) {
      const slice: Array<{ mistake: MistakeRecord; index: number }> = [];
      for (let j = i; j < Math.min(i + step, mistakes.length); j++) {
        slice.push({ mistake: mistakes[j], index: j });
      }
      rows.push(slice);
    }
    return rows;
  }, [mistakes, layoutColumn]);

  const handleGeneratePdf = async () => {
    if (mistakes.length === 0) {
      showToast('目前沒有選取可匯出的錯題，請先勾選至少一題', 'info');
      return;
    }
    const sheetEl = sheetRef.current || document.getElementById('print-sheet-preview');
    if (!sheetEl) return;

    cancelGenerationRef.current = false;
    setIsGenerating(true);
    setPdfProgressText('載入所有題目與解析附圖中...');
    setPdfError(null);
    setPdfExpired(false);

    if (cachedPdfUrl) {
      URL.revokeObjectURL(cachedPdfUrl);
      setCachedPdfUrl(null);
      cachedBlobRef.current = null;
    }

    // Temporarily pin A4 width (794px = 210mm @ 96dpi) so mobile/tablet exports produce crisp A4 proportions
    const prevWidth = sheetEl.style.width;
    const prevMaxWidth = sheetEl.style.maxWidth;
    const prevMinWidth = sheetEl.style.minWidth;

    try {
      sheetEl.style.width = '794px';
      sheetEl.style.maxWidth = '794px';
      sheetEl.style.minWidth = '794px';

      // Wait for all images inside the sheet to load & decode cleanly
      const images = Array.from(sheetEl.querySelectorAll('img'));
      if (images.length > 0) {
        await Promise.all(
          images.map(async img => {
            if (!img.complete) {
              await new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              });
            }
            if (typeof img.decode === 'function') {
              try {
                await img.decode();
              } catch {}
            }
          })
        );
      }

      // Allow browser layout reflow after pinning width
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (cancelGenerationRef.current) throw new Error('__PDF_CANCELLED__');

      const blocks = Array.from(sheetEl.querySelectorAll<HTMLElement>('[data-pdf-block="1"]'));
      if (blocks.length === 0) {
        throw new Error('找不到可排版的試卷區塊');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageW = 210; // A4 width (mm)
      const pageH = 297; // A4 height (mm)
      const marginX = 11;
      const marginTop = 11;
      const marginBottom = 14; // reserve space for page number footer
      const contentW = pageW - marginX * 2; // 188mm
      const usableH = pageH - marginTop - marginBottom; // 272mm
      const blockGapMm = 3.5;

      let cursorY = marginTop;

      for (let i = 0; i < blocks.length; i++) {
        if (cancelGenerationRef.current) throw new Error('__PDF_CANCELLED__');
        const block = blocks[i];
        setPdfProgressText(`正在進行防跨頁 A4 排版 (${i + 1} / ${blocks.length})...`);

        if (block.dataset.pdfPageBreak === '1' && cursorY > marginTop + 0.5) {
          pdf.addPage();
          cursorY = marginTop;
        }

        const canvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 960
        });
        if (cancelGenerationRef.current) throw new Error('__PDF_CANCELLED__');

        if (canvas.width === 0 || canvas.height === 0) continue;

        let drawW = contentW;
        let drawH = (canvas.height * drawW) / canvas.width;
        let drawX = marginX;

        // If a single block is taller than an entire A4 usable page, scale proportionally to fit 1 page cleanly
        if (drawH > usableH) {
          if (cursorY > marginTop + 0.5) {
            pdf.addPage();
            cursorY = marginTop;
          }
          const scale = usableH / drawH;
          drawW = drawW * scale;
          drawH = usableH;
          drawX = marginX + (contentW - drawW) / 2;
        } else if (cursorY + drawH > marginTop + usableH && cursorY > marginTop + 0.5) {
          // Never cut a question across pages: start a fresh A4 page before placing this block
          pdf.addPage();
          cursorY = marginTop;
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.94);
        pdf.addImage(imgData, 'JPEG', drawX, cursorY, drawW, drawH, undefined, 'FAST');
        cursorY += drawH + blockGapMm;
      }

      // Add A4 page numbers at the bottom footer
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Page ${p} / ${totalPages}  ·  A4`, pageW / 2, pageH - 6.5, { align: 'center' });
      }

      if (cancelGenerationRef.current) throw new Error('__PDF_CANCELLED__');
      const pdfBlob = pdf.output('blob');
      cachedBlobRef.current = pdfBlob;
      const blobUrl = URL.createObjectURL(pdfBlob);

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const modeText =
        examMode === 'practice'
          ? '模擬試卷'
          : examMode === 'separate_appendix'
          ? '試卷附解析'
          : '解析卷';
      const fileName = `${paperTitle || 'PobiNotes'}_${modeText}_A4_${dateStr}.pdf`;

      setCachedPdfUrl(blobUrl);
      setPdfFileName(fileName);
      setPdfExpireTime(Date.now() + 60 * 1000);
      setCountdownSeconds(60);
      setPdfExpired(false);
      showToast(`已產生 ${totalPages} 頁 A4 試卷 PDF（防跨頁切割）`, 'success');
    } catch (err: any) {
      if (err?.message === '__PDF_CANCELLED__' || cancelGenerationRef.current) {
        showToast('已取消試卷生成', 'info');
      } else {
        console.error('PDF 生成失敗：', err);
        setPdfError(err?.message || '建立 PDF 失敗，請重試或使用「系統列印」。');
      }
    } finally {
      cancelGenerationRef.current = false;
      sheetEl.style.width = prevWidth;
      sheetEl.style.maxWidth = prevMaxWidth;
      sheetEl.style.minWidth = prevMinWidth;
      setIsGenerating(false);
      setPdfProgressText('');
    }
  };

  const handleDownloadPdf = () => {
    if (!cachedPdfUrl) return;
    const link = document.createElement('a');
    link.href = cachedPdfUrl;
    link.download = pdfFileName || '模擬練習卷_A4.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (mistakes.length === 0) {
      showToast('目前沒有選取可列印的錯題，請先勾選至少一題', 'info');
      return;
    }
    window.print();
  };

  const totalScore = mistakes.length * scorePerQuestion;

  const renderMistakeCard = (m: MistakeRecord, index: number) => {
    const media = extractMistakeMediaAndText(m);
    const qOptionFields = (m.template_fields?.questionFields || []).filter(
      f => f.type === 'options' && !isLegacyMasteryField(f)
    );
    const aOptionFields = (m.template_fields?.answerFields || []).filter(
      f => f.type === 'options' && !isLegacyMasteryField(f)
    );
    const hasAnswerContent = Boolean(media.aDesc || media.aImages.length > 0 || aOptionFields.length > 0);

    return (
      <div
        key={m.id}
        style={{
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          padding: layoutColumn === 'two' ? '12px 14px' : '14px 16px',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
        className="mistake-exam-item"
      >
        {/* Question Number & Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: '#0f172a', color: '#ffffff', padding: '1px 8px', borderRadius: '4px', fontSize: '0.82rem', flexShrink: 0 }}>
              第 {index + 1} 題
            </span>
            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700 }}>({scorePerQuestion} 分)</span>
            {m.title && (
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                {m.title}
              </span>
            )}
          </div>
          {(m.chapter_name || m.unit_name) && (
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {[m.chapter_name, m.unit_name].filter(Boolean).join(' / ')}
            </div>
          )}
        </div>

        {/* Question Body: Text + All Images + Options */}
        <div style={{ color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {media.qDesc && (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {media.qDesc}
            </p>
          )}

          {media.qImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              {media.qImages.map((src, imgIdx) => (
                <div
                  key={imgIdx}
                  style={{
                    width: '100%',
                    maxWidth: layoutColumn === 'two' ? '100%' : '540px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff'
                  }}
                >
                  <img
                    src={src}
                    alt={`第 ${index + 1} 題附圖 ${imgIdx + 1}`}
                    crossOrigin="anonymous"
                    onClick={() => onImageClick?.(src)}
                    style={{
                      width: '100%',
                      maxHeight: layoutColumn === 'two' ? '210px' : '300px',
                      objectFit: 'contain',
                      display: 'block',
                      cursor: onImageClick ? 'zoom-in' : 'default'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {qOptionFields.map(field => (
            <PrintOptionRow
              key={field.id}
              field={field}
              value={checkedStates[m.id]?.[field.id] || []}
              exportMode={examMode === 'solution' ? 'solution' : 'practice'}
              onOptionToggle={optVal => togglePreviewOption(m.id, field.id, optVal)}
            />
          ))}

          {!media.qDesc && media.qImages.length === 0 && qOptionFields.length === 0 && (
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
              （此題無額外文字或附圖，請參見上方題目標題）
            </p>
          )}
        </div>

        {/* Scratch Work Area */}
        {scratchSpace !== 'none' && examMode !== 'solution' && (
          <div
            style={{
              marginTop: '4px',
              height: scratchSpace === 'large' ? '115px' : '62px',
              border: '1.5px dashed #94a3b8',
              borderRadius: '6px',
              background: '#f8fafc',
              backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px)',
              backgroundSize: '100% 20px',
              padding: '6px 10px',
              fontSize: '0.73rem',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontWeight: 600 }}>演算草稿區</span>
            <span style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94a3b8' }}>第 {index + 1} 題作答空間</span>
          </div>
        )}

        {/* Inline Explanation (Only in full solution mode) */}
        {examMode === 'solution' && hasAnswerContent && (
          <div
            style={{
              marginTop: '6px',
              borderTop: '2px solid #16a34a',
              background: '#f0fdf4',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={15} /> 參考標準解答與詳細解析
            </div>
            {media.aDesc && (
              <p style={{ margin: 0, color: '#14532d', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {media.aDesc}
              </p>
            )}
            {media.aImages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                {media.aImages.map((src, imgIdx) => (
                  <div
                    key={imgIdx}
                    style={{
                      width: '100%',
                      maxWidth: layoutColumn === 'two' ? '100%' : '500px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #86efac',
                      background: '#ffffff'
                    }}
                  >
                    <img
                      src={src}
                      alt={`第 ${index + 1} 題解析圖 ${imgIdx + 1}`}
                      crossOrigin="anonymous"
                      onClick={() => onImageClick?.(src)}
                      style={{
                        width: '100%',
                        maxHeight: layoutColumn === 'two' ? '200px' : '280px',
                        objectFit: 'contain',
                        display: 'block',
                        cursor: onImageClick ? 'zoom-in' : 'default'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {aOptionFields.map(field => (
              <PrintOptionRow
                key={field.id}
                field={field}
                value={checkedStates[m.id]?.[field.id] || []}
                exportMode="solution"
                onOptionToggle={optVal => togglePreviewOption(m.id, field.id, optVal)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: embedded ? '0' : '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: embedded ? 'visible' : 'auto' }}>
      {/* Top Action & Navigation Bar */}
      <div className="glass no-print" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!embedded && onBack && (
            <button className="notebook-tool-btn" style={{ padding: '7px 12px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onBack}>
              <ArrowLeft size={16} /> 返回
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.12rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              A4 練習卷與解析卷列印工坊
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              預設 A4 尺寸與防跨頁切割排版；支援下載 PDF 或行動/電腦系統列印（可自調縮放與格式）
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowConfigPanel(prev => !prev)}
            className="notebook-tool-btn"
            style={{ padding: '7px 12px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sliders size={15} />
            <span>{showConfigPanel ? '收合排版設定' : '開啟排版設定'}</span>
          </button>

          <button
            className="notebook-primary-btn"
            onClick={handleGeneratePdf}
            disabled={isGenerating || mistakes.length === 0}
            data-testid="export-generate-pdf-btn"
            style={{ padding: '8px 16px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>A4 排版中...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>匯出 A4 PDF（不切題）</span>
              </>
            )}
          </button>

          {isGenerating && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleCancelGeneratePdf}
              data-testid="export-pdf-cancel-btn"
              style={{ padding: '8px 14px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <X size={15} />
              <span>取消生成</span>
            </button>
          )}

          <button
            className="notebook-tool-btn"
            onClick={handlePrint}
            disabled={mistakes.length === 0}
            data-testid="export-native-print-btn"
            title="呼叫行動裝置或瀏覽器系統列印，可自由調整紙張、縮放與邊界"
            style={{ padding: '8px 14px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} /> 系統列印（可調格式）
          </button>
        </div>
      </div>

      {/* Advanced Exam Configuration Bar */}
      {showConfigPanel && (
        <div className="glass no-print animate-fade-in" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
          {/* Row 1: Mode & Layout Choices */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>試卷模式：</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setExamMode('practice')}
                  className={`export-opt-btn ${examMode === 'practice' ? 'active' : ''}`}
                  data-testid="export-mode-practice"
                >
                  {examMode === 'practice' ? <Check size={14} className="export-check-icon" /> : <EyeOff size={14} />}
                  <span>模擬練習卷（純題目）</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamMode('separate_appendix')}
                  className={`export-opt-btn ${examMode === 'separate_appendix' ? 'active' : ''}`}
                  data-testid="export-mode-appendix"
                >
                  {examMode === 'separate_appendix' ? <Check size={14} className="export-check-icon" /> : <Award size={14} />}
                  <span>試卷＋頁尾詳細解析</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamMode('solution')}
                  className={`export-opt-btn ${examMode === 'solution' ? 'active' : ''}`}
                  data-testid="export-mode-solution"
                >
                  {examMode === 'solution' ? <Check size={14} className="export-check-icon" /> : <Eye size={14} />}
                  <span>完整解析卷（題解並列）</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>A4 欄位：</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setLayoutColumn('one')}
                  className={`export-opt-btn ${layoutColumn === 'one' ? 'active' : ''}`}
                >
                  {layoutColumn === 'one' ? <Check size={14} className="export-check-icon" /> : <Square size={14} />}
                  <span>單欄（圖片最清晰）</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutColumn('two')}
                  className={`export-opt-btn ${layoutColumn === 'two' ? 'active' : ''}`}
                >
                  {layoutColumn === 'two' ? <Check size={14} className="export-check-icon" /> : <Columns size={14} />}
                  <span>雙欄（省紙模式）</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>演算留白：</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'none', label: '無留白' },
                  { id: 'medium', label: '標準留白' },
                  { id: 'large', label: '充足留白' }
                ].map(s => {
                  const isSel = scratchSpace === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScratchSpace(s.id as ScratchSpace)}
                      className={`export-opt-btn ${isSel ? 'active' : ''}`}
                    >
                      {isSel && <Check size={14} className="export-check-icon" />}
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Header Customization & Scoring */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)' }}>試卷主標：</span>
              <input
                type="text"
                className="input"
                style={{ width: '200px', height: '32px', padding: '4px 8px', fontSize: '0.82rem' }}
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)' }}>副標說明：</span>
              <input
                type="text"
                className="input"
                style={{ width: '200px', height: '32px', padding: '4px 8px', fontSize: '0.82rem' }}
                value={paperSubtitle}
                onChange={e => setPaperSubtitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)' }}>每題配分：</span>
              <input
                type="number"
                min={1}
                max={100}
                className="input"
                style={{ width: '60px', height: '32px', padding: '4px 8px', fontSize: '0.82rem' }}
                value={scorePerQuestion}
                onChange={e => setScorePerQuestion(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>分（滿分 {totalScore}）</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)' }}>限時：</span>
              <input
                type="number"
                min={10}
                max={300}
                className="input"
                style={{ width: '62px', height: '32px', padding: '4px 8px', fontSize: '0.82rem' }}
                value={examDuration}
                onChange={e => setExamDuration(Math.max(10, parseInt(e.target.value, 10) || 60))}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>分鐘</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-secondary)' }}>考生：</span>
              <input
                type="text"
                placeholder="班級"
                className="input"
                style={{ width: '64px', height: '32px', padding: '4px 6px', fontSize: '0.8rem' }}
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
              />
              <input
                type="text"
                placeholder="座號"
                className="input"
                style={{ width: '54px', height: '32px', padding: '4px 6px', fontSize: '0.8rem' }}
                value={studentSeat}
                onChange={e => setStudentSeat(e.target.value)}
              />
              <input
                type="text"
                placeholder="姓名"
                className="input"
                style={{ width: '76px', height: '32px', padding: '4px 6px', fontSize: '0.8rem' }}
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.22)' }}>
            提示：如需直接取得固定 A4 不切題檔案，請點「匯出 A4 PDF（不切題）」；若要在手機 / iPad 列印對話框調整紙張大小、邊界或縮放比例，請直接點「系統列印（可調格式）」。
          </div>
        </div>
      )}

      {/* Progress & Error Feedback */}
      {isGenerating && (
        <div
          className="glass no-print animate-fade-in"
          style={{
            padding: '12px 18px',
            borderLeft: '4px solid var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{pdfProgressText || '正在進行 A4 排版中...'}</span>
          </div>
          <button
            type="button"
            onClick={handleCancelGeneratePdf}
            data-testid="export-pdf-progress-cancel-btn"
            className="btn btn-danger"
            style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <X size={14} />
            <span>取消</span>
          </button>
        </div>
      )}

      {pdfError && (
        <div className="glass no-print animate-fade-in" style={{ padding: '12px 18px', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '0.86rem', color: '#dc2626' }}>{pdfError}</span>
        </div>
      )}

      {pdfExpired && !cachedPdfUrl && !isGenerating && (
        <div className="glass no-print animate-fade-in" style={{ padding: '12px 18px', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={18} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.86rem', color: '#b45309' }}>暫存 PDF 已逾 1 分鐘並自動清理，如需下載請再次點擊「匯出 A4 PDF（不切題）」。</span>
        </div>
      )}

      {/* PDF Ready Banner */}
      {cachedPdfUrl && !isGenerating && (
        <div className="glass no-print animate-fade-in" style={{
          padding: '14px 18px',
          borderLeft: '4px solid var(--success)',
          background: 'rgba(25, 122, 39, 0.08)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                A4 試卷 PDF 建立完成（已防跨頁切割）
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                檔名：<code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{pdfFileName}</code>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: countdownSeconds <= 15 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(25, 122, 39, 0.15)',
              color: countdownSeconds <= 15 ? 'var(--danger)' : 'var(--success)',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}>
              <Clock size={14} /> 剩餘 {countdownSeconds} 秒
            </div>
            <button className="notebook-primary-btn" onClick={handleDownloadPdf} style={{ padding: '7px 16px', fontSize: '0.85rem' }}>
              立即下載 A4 PDF
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }} className="no-print">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '8px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>正在載入試卷題目與圖片...</p>
        </div>
      ) : (
        /* Real A4 Virtual Paper Preview Container */
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '12px 4px'
          }}
          className={`print-container ${examMode === 'practice' ? 'print-practice-mode' : 'print-solution-mode'}`}
        >
          <div
            ref={sheetRef}
            id="print-sheet-preview"
            data-testid="print-sheet-preview"
            style={{
              width: '100%',
              maxWidth: '794px',
              minWidth: '300px',
              background: '#ffffff',
              color: '#000000',
              padding: 'clamp(16px, 3vw, 32px)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontFamily: '"Noto Sans TC", sans-serif',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Block 0: Exam Paper Masthead */}
            <div
              data-pdf-block="1"
              className="exam-print-block"
              style={{
                borderBottom: '3px double #000000',
                paddingBottom: '12px',
                textAlign: 'center',
                background: '#ffffff'
              }}
            >
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.14em', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                {paperSubtitle}
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '0.06em', margin: '2px 0 10px 0', color: '#000000' }}>
                {paperTitle}
              </h1>

              {/* Exam Info & Student Header Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  border: '1.5px solid #000000',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ padding: '5px 6px', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  考試科目
                </div>
                <div style={{ padding: '5px 6px', borderRight: '1px solid #000000', fontWeight: 600 }}>
                  {mistakes[0]?.subject_name || defaultSubjectName || '綜合學科'}
                </div>
                <div style={{ padding: '5px 6px', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  考試時間
                </div>
                <div style={{ padding: '5px 6px', borderRight: '1px solid #000000' }}>
                  {examDuration} 分鐘
                </div>
                <div style={{ padding: '5px 6px', background: '#f8fafc', fontWeight: 700, color: '#dc2626' }}>
                  滿分 {totalScore} 分
                </div>

                <div style={{ padding: '5px 6px', borderTop: '1px solid #000000', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  班級 / 座號
                </div>
                <div style={{ padding: '5px 6px', borderTop: '1px solid #000000', borderRight: '1px solid #000000' }}>
                  {studentClass || '______'} / {studentSeat || '____'}
                </div>
                <div style={{ padding: '5px 6px', borderTop: '1px solid #000000', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  考生姓名
                </div>
                <div style={{ padding: '5px 6px', borderTop: '1px solid #000000', borderRight: '1px solid #000000' }}>
                  {studentName || '__________'}
                </div>
                <div style={{ padding: '5px 6px', borderTop: '1px solid #000000', background: '#fef2f2', fontWeight: 800 }}>
                  得分：_____
                </div>
              </div>

              <div style={{ textAlign: 'left', marginTop: '8px', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                ※ 紙張預設尺寸：A4（共 {mistakes.length} 題，每題 {scorePerQuestion} 分）。請依序作答並善用演算草稿區。
              </div>
            </div>

            {/* Question Rows (each row is an indivisible PDF & print block) */}
            {questionRows.map((row, rowIdx) => (
              <div
                key={`qrow-${rowIdx}`}
                data-pdf-block="1"
                className="exam-print-block"
                style={
                  layoutColumn === 'two'
                    ? {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '14px',
                        alignItems: 'start',
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        background: '#ffffff'
                      }
                    : {
                        display: 'flex',
                        flexDirection: 'column',
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        background: '#ffffff'
                      }
                }
              >
                {row.map(({ mistake, index }) => renderMistakeCard(mistake, index))}
              </div>
            ))}

            {/* SEPARATE DETAILED SOLUTION APPENDIX (NO front quick-answer options table!) */}
            {examMode === 'separate_appendix' && mistakes.length > 0 && (
              <>
                <div
                  data-pdf-block="1"
                  data-pdf-page-break="1"
                  className="exam-print-block"
                  style={{
                    pageBreakBefore: 'always',
                    breakBefore: 'page',
                    marginTop: '16px',
                    borderTop: '3px double #000000',
                    paddingTop: '18px',
                    textAlign: 'center',
                    background: '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', letterSpacing: '0.14em', fontWeight: 600, color: '#475569' }}>
                    {paperTitle} · 詳細解析本
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '4px 0', color: '#000000' }}>
                    各題詳細解析與關鍵思路
                  </h2>
                </div>

                {mistakes.map((m, index) => {
                  const media = extractMistakeMediaAndText(m);
                  const aOptionFields = (m.template_fields?.answerFields || []).filter(
                    f => f.type === 'options' && !isLegacyMasteryField(f)
                  );
                  return (
                    <div
                      key={`sol-${m.id}`}
                      data-pdf-block="1"
                      className="exam-print-block mistake-exam-item"
                      style={{
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                        第 {index + 1} 題 解析{m.title ? `（${m.title}）` : ''}
                      </div>
                      {media.aDesc && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {media.aDesc}
                        </p>
                      )}
                      {media.aImages.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          {media.aImages.map((src, imgIdx) => (
                            <div
                              key={imgIdx}
                              style={{
                                width: '100%',
                                maxWidth: '520px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff'
                              }}
                            >
                              <img
                                src={src}
                                alt={`第 ${index + 1} 題解析附圖 ${imgIdx + 1}`}
                                crossOrigin="anonymous"
                                onClick={() => onImageClick?.(src)}
                                style={{
                                  width: '100%',
                                  maxHeight: '280px',
                                  objectFit: 'contain',
                                  display: 'block',
                                  cursor: onImageClick ? 'zoom-in' : 'default'
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {aOptionFields.map(field => (
                        <PrintOptionRow
                          key={field.id}
                          field={field}
                          value={checkedStates[m.id]?.[field.id] || []}
                          exportMode="solution"
                          onOptionToggle={optVal => togglePreviewOption(m.id, field.id, optVal)}
                        />
                      ))}
                      {!media.aDesc && media.aImages.length === 0 && aOptionFields.length === 0 && (
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>（此題尚未填寫文字或圖片解析）</span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {mistakes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                目前尚未勾選任何錯題，請於上方清單勾選要匯出的題目。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PrintOptionRow({
  field,
  value,
  exportMode,
  onOptionToggle
}: {
  field: Field;
  value: string[];
  exportMode: 'practice' | 'solution';
  onOptionToggle?: (optionValue: string) => void;
}) {
  if (!field.options || field.options.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '2px' }}>
      {!field.hideLabel && field.label && (
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{field.label}：</span>
      )}
      {field.options.map((opt, i) => {
        const isChecked = Array.isArray(value) && value.includes(opt.value);
        const isSolutionMode = exportMode === 'solution';
        return (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => onOptionToggle?.(opt.value)}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '17px',
                height: '17px',
                border: isSolutionMode && isChecked ? '1.5px solid #16a34a' : '1.5px solid #0f172a',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 'bold',
                background: isChecked ? (isSolutionMode ? '#16a34a' : '#0f172a') : '#ffffff',
                color: '#ffffff'
              }}
            >
              {isChecked ? '✓' : ''}
            </span>
            <span style={{ color: isSolutionMode && isChecked ? '#16a34a' : 'inherit' }}>
              ({opt.value})
            </span>
          </span>
        );
      })}
    </div>
  );
}
