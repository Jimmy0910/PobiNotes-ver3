import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { useUiFeedback } from './UiFeedbackProvider';
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
  Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function resolveImageUrl(key?: string): string {
  if (!key) return '';
  if (key.startsWith('data:') || key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/api/images/')) {
    return key;
  }
  return `/api/images/${key}`;
}

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

interface Mistake {
  id: string;
  title: string;
  chapter_id: string;
  template_id: string;
  chapter_name?: string;
  subject_name?: string;
  template_name?: string;
  template_fields: {
    questionFields: Field[];
    answerFields: Field[];
  };
  data: {
    questionData: { [fieldId: string]: any };
    answerData: { [fieldId: string]: any };
  };
  created_at: number;
}

interface ExportPDFProps {
  mistakeIds: string[];
  initialMistakes?: any[];
  onBack: () => void;
  onImageClick?: (src: string) => void;
}

type ExamMode = 'practice' | 'separate_appendix' | 'solution';
type LayoutColumn = 'one' | 'two';
type ScratchSpace = 'none' | 'medium' | 'large';

export default function ExportPDF({ mistakeIds, initialMistakes, onBack, onImageClick }: ExportPDFProps) {
  const { showToast } = useUiFeedback();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(false);

  // Exam Workshop Configuration States
  const [examMode, setExamMode] = useState<ExamMode>('practice');
  const [layoutColumn, setLayoutColumn] = useState<LayoutColumn>('two');
  const [scratchSpace, setScratchSpace] = useState<ScratchSpace>('medium');
  const [paperTitle, setPaperTitle] = useState('學科能力測驗模擬練習卷');
  const [paperSubtitle, setPaperSubtitle] = useState('重點錯題精選 實戰模擬試卷');
  const [scorePerQuestion, setScorePerQuestion] = useState<number>(5);
  const [examDuration, setExamDuration] = useState<number>(80);
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

  const normalizeOptions = (options: any[] | undefined): FieldOption[] => {
    if (!options) return [];
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, color: 'default' };
      }
      return {
        value: opt.value || '',
        color: opt.color || 'default'
      };
    });
  };

  const normalizeField = (f: any): Field => ({
    id: f.id,
    type: f.type,
    label: f.label || '',
    options: normalizeOptions(f.options),
    styleType: f.styleType || 'bordered',
    inline: !!f.inline,
    hideLabel: !!f.hideLabel
  });

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
        let rawList: any[] = [];
        if (initialMistakes && initialMistakes.length > 0) {
          rawList = initialMistakes;
        } else {
          try {
            const allMistakes: any[] = await apiRequest('/api/mistakes');
            if (Array.isArray(allMistakes) && allMistakes.length > 0) {
              rawList = allMistakes;
            }
          } catch (e) {
            console.warn('伺服器錯題讀取異常：', e);
          }
        }

        let selected = rawList.filter(m => mistakeIds.length === 0 || mistakeIds.includes(m.id));
        if (selected.length === 0 && rawList.length > 0) {
          selected = rawList; // Fallback to all if specific IDs not found
        }

        const formatted = selected.map(m => ({
          ...m,
          template_fields: {
            questionFields: (m.template_fields?.questionFields || []).map(normalizeField),
            answerFields: (m.template_fields?.answerFields || []).map(normalizeField)
          }
        }));

        setMistakes(formatted);

        // Initialize checkedStates for preview interaction
        const initialStates: typeof checkedStates = {};
        formatted.forEach((m: Mistake) => {
          initialStates[m.id] = {};
          const fields = [...(m.template_fields.questionFields || []), ...(m.template_fields.answerFields || [])];
          fields.forEach(f => {
            if (f.type === 'options') {
              const val = m.data.questionData?.[f.id] || m.data.answerData?.[f.id] || [];
              initialStates[m.id][f.id] = Array.isArray(val) ? val : [];
            }
          });
        });
        setCheckedStates(initialStates);

        // Auto-detect subject if all mistakes share the same subject
        const subjects = Array.from(new Set(formatted.map(m => m.subject_name).filter(Boolean)));
        if (subjects.length === 1) {
          setPaperTitle(`${subjects[0]} 模擬練習卷`);
        }
      } catch (e) {
        console.error('載入考卷錯題失敗：', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectedMistakes();
  }, [mistakeIds, initialMistakes]);

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

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (cachedPdfUrl) {
        URL.revokeObjectURL(cachedPdfUrl);
      }
    };
  }, [cachedPdfUrl]);

  const handleGeneratePdf = async () => {
    if (mistakes.length === 0) {
      showToast('目前沒有選取可匯出的錯題，請先在書架或錯題庫中挑選或建立題目', 'info');
      return;
    }
    const element = document.getElementById('print-sheet-preview');
    if (!element) return;

    setIsGenerating(true);
    setPdfProgressText('準備試卷素材與排版...');
    setPdfError(null);
    setPdfExpired(false);

    if (cachedPdfUrl) {
      URL.revokeObjectURL(cachedPdfUrl);
      setCachedPdfUrl(null);
      cachedBlobRef.current = null;
    }

    try {
      const images = Array.from(element.querySelectorAll('img'));
      if (images.length > 0) {
        setPdfProgressText('載入試卷附圖中...');
        await Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
      }

      setPdfProgressText('渲染高畫質 A4 試卷...');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      setPdfProgressText('編譯 A4 考卷 PDF...');
      const imgWidth = 210; // A4 寬度 (mm)
      const pageHeight = 297; // A4 高度 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      // Page 1
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      cachedBlobRef.current = pdfBlob;
      const blobUrl = URL.createObjectURL(pdfBlob);

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const modeText =
        examMode === 'practice'
          ? '模擬試卷'
          : examMode === 'separate_appendix'
          ? '試卷附解答卡'
          : '詳解全卷';
      const fileName = `${paperTitle || 'PobiNotes'}_${modeText}_${dateStr}.pdf`;

      setCachedPdfUrl(blobUrl);
      setPdfFileName(fileName);
      setPdfExpireTime(Date.now() + 60 * 1000);
      setCountdownSeconds(60);
      setPdfExpired(false);
    } catch (err: any) {
      console.error('PDF 生成失敗：', err);
      setPdfError(err.message || '建立 PDF 失敗，請重試或改用原生列印。');
    } finally {
      setIsGenerating(false);
      setPdfProgressText('');
    }
  };

  const handleDownloadPdf = () => {
    if (!cachedPdfUrl) return;
    const link = document.createElement('a');
    link.href = cachedPdfUrl;
    link.download = pdfFileName || '模擬練習卷.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (mistakes.length === 0) {
      showToast('目前沒有選取可列印的錯題，請先在書架或錯題庫中挑選或建立題目', 'info');
      return;
    }
    window.print();
  };

  const getEffectiveQuestionFields = (m: Mistake): Field[] => {
    if (m.template_fields?.questionFields && m.template_fields.questionFields.length > 0) {
      return m.template_fields.questionFields;
    }
    const fields: Field[] = [];
    if (m.data?.questionData?.q_text) {
      fields.push({ id: 'q_text', type: 'textarea', label: '題目內容', styleType: 'bordered' });
    }
    if (m.data?.questionData?.q_image) {
      fields.push({ id: 'q_image', type: 'image', label: '題目附圖', styleType: 'bordered' });
    }
    return fields.length > 0 ? fields : [{ id: 'title', type: 'text', label: '題目', styleType: 'bordered' }];
  };

  const getEffectiveAnswerFields = (m: Mistake): Field[] => {
    if (m.template_fields?.answerFields && m.template_fields.answerFields.length > 0) {
      return m.template_fields.answerFields;
    }
    const fields: Field[] = [];
    if (m.data?.answerData?.a_text) {
      fields.push({ id: 'a_text', type: 'textarea', label: '參考詳解', styleType: 'bordered' });
    }
    if (m.data?.answerData?.a_image) {
      fields.push({ id: 'a_image', type: 'image', label: '詳解附圖', styleType: 'bordered' });
    }
    return fields;
  };

  const totalScore = mistakes.length * scorePerQuestion;

  return (
    <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      {/* Top Action & Navigation Bar */}
      <div className="glass no-print" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="notebook-tool-btn" style={{ padding: '8px 14px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onBack}>
            <ArrowLeft size={16} /> 返回
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              實體 A4 模擬試卷列印工坊
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              大考標準雙欄排版、答案分離附錄、自訂抬頭與演算留白空間
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowConfigPanel(prev => !prev)}
            className="notebook-tool-btn"
            style={{ padding: '8px 14px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sliders size={15} />
            <span>{showConfigPanel ? '收合試卷設定' : '開啟試卷排版設定'}</span>
          </button>

          <button
            className="notebook-primary-btn"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            style={{ padding: '9px 18px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>排版建立中...</span>
              </>
            ) : (
              <>
                <FileDown size={16} />
                <span>匯出 A4 試卷 PDF</span>
              </>
            )}
          </button>

          <button
            className="notebook-tool-btn"
            onClick={handlePrint}
            title="瀏覽器原生列印"
            style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} /> 原生列印
          </button>
        </div>
      </div>

      {/* Advanced Exam Configuration Bar */}
      {showConfigPanel && (
        <div className="glass no-print animate-fade-in" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
          {/* Row 1: Mode & Layout Choices */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
            {/* 1. Exam Mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>試卷模式：</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setExamMode('practice')}
                  className={`export-opt-btn ${examMode === 'practice' ? 'active' : ''}`}
                >
                  {examMode === 'practice' ? <Check size={14} className="export-check-icon" /> : <EyeOff size={14} />}
                  <span>模擬考試卷 (純試題)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamMode('separate_appendix')}
                  className={`export-opt-btn ${examMode === 'separate_appendix' ? 'active' : ''}`}
                >
                  {examMode === 'separate_appendix' ? <Check size={14} className="export-check-icon" /> : <Award size={14} />}
                  <span>試卷＋獨立解答附錄</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExamMode('solution')}
                  className={`export-opt-btn ${examMode === 'solution' ? 'active' : ''}`}
                >
                  {examMode === 'solution' ? <Check size={14} className="export-check-icon" /> : <Eye size={14} />}
                  <span>完整複習解析卷</span>
                </button>
              </div>
            </div>

            {/* 2. Column Layout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>排版格局：</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setLayoutColumn('two')}
                  className={`export-opt-btn ${layoutColumn === 'two' ? 'active' : ''}`}
                >
                  {layoutColumn === 'two' ? <Check size={14} className="export-check-icon" /> : <Columns size={14} />}
                  <span>大考標準雙欄 (推薦)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutColumn('one')}
                  className={`export-opt-btn ${layoutColumn === 'one' ? 'active' : ''}`}
                >
                  {layoutColumn === 'one' ? <Check size={14} className="export-check-icon" /> : <Square size={14} />}
                  <span>寬敞單欄排版</span>
                </button>
              </div>
            </div>

            {/* 3. Scratch Work Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>演算留白：</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'none', label: '緊湊 (無留白)' },
                  { id: 'medium', label: '標準 (中留白)' },
                  { id: 'large', label: '充足 (大留白)' }
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 650, color: 'var(--text-secondary)' }}>試卷主標：</span>
              <input
                type="text"
                className="input"
                style={{ width: '220px', height: '32px', padding: '4px 8px', fontSize: '0.84rem' }}
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 650, color: 'var(--text-secondary)' }}>副標說明：</span>
              <input
                type="text"
                className="input"
                style={{ width: '240px', height: '32px', padding: '4px 8px', fontSize: '0.84rem' }}
                value={paperSubtitle}
                onChange={e => setPaperSubtitle(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 650, color: 'var(--text-secondary)' }}>每題配分：</span>
              <input
                type="number"
                min={1}
                max={100}
                className="input"
                style={{ width: '64px', height: '32px', padding: '4px 8px', fontSize: '0.84rem' }}
                value={scorePerQuestion}
                onChange={e => setScorePerQuestion(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>分 (總分 {totalScore} 分)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 650, color: 'var(--text-secondary)' }}>考試限時：</span>
              <input
                type="number"
                min={10}
                max={300}
                className="input"
                style={{ width: '68px', height: '32px', padding: '4px 8px', fontSize: '0.84rem' }}
                value={examDuration}
                onChange={e => setExamDuration(Math.max(10, parseInt(e.target.value) || 80))}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>分鐘</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 650, color: 'var(--text-secondary)' }}>預填考生：</span>
              <input
                type="text"
                placeholder="班級"
                className="input"
                style={{ width: '70px', height: '32px', padding: '4px 6px', fontSize: '0.82rem' }}
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
              />
              <input
                type="text"
                placeholder="座號"
                className="input"
                style={{ width: '56px', height: '32px', padding: '4px 6px', fontSize: '0.82rem' }}
                value={studentSeat}
                onChange={e => setStudentSeat(e.target.value)}
              />
              <input
                type="text"
                placeholder="姓名"
                className="input"
                style={{ width: '80px', height: '32px', padding: '4px 6px', fontSize: '0.82rem' }}
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
              />
            </div>
          </div>

          {/* Live Status Feedback Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '0.82rem'
          }} className="export-active-settings-bar">
            <span className="export-settings-label" style={{ fontWeight: 700 }}>目前套用設定：</span>
            <span className="export-settings-tag">
              模式：{examMode === 'practice' ? '模擬考試卷 (純試題)' : examMode === 'separate_appendix' ? '試卷＋獨立解答附錄' : '完整複習解析卷'}
            </span>
            <span className="export-settings-tag">
              格局：{layoutColumn === 'two' ? '大考標準雙欄' : '寬敞單欄排版'}
            </span>
            <span className="export-settings-tag">
              演算留白：{scratchSpace === 'none' ? '緊湊無留白' : scratchSpace === 'medium' ? '標準留白 (65px)' : '充足留白 (120px)'}
            </span>
          </div>
        </div>
      )}

      {/* Progress & Error Feedback */}
      {isGenerating && (
        <div className="glass no-print animate-fade-in" style={{ padding: '12px 20px', borderLeft: '4px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{pdfProgressText || '正在渲染 A4 試卷中...'}</span>
        </div>
      )}

      {pdfError && (
        <div className="glass no-print animate-fade-in" style={{ padding: '12px 20px', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '0.86rem', color: '#dc2626' }}>{pdfError}</span>
        </div>
      )}

      {pdfExpired && !cachedPdfUrl && !isGenerating && (
        <div className="glass no-print animate-fade-in" style={{ padding: '12px 20px', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={18} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.86rem', color: '#b45309' }}>暫存 PDF 已逾 1 分鐘並已自動清理，如需下載請再次點擊「匯出 A4 試卷 PDF」。</span>
        </div>
      )}

      {/* PDF Status / Countdown Banner */}
      {cachedPdfUrl && !isGenerating && (
        <div className="glass no-print animate-fade-in" style={{
          padding: '16px 20px',
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
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                實體 A4 模擬試卷 PDF 建立完成！
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                檔名：<code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{pdfFileName}</code>（快取限時 1 分鐘）
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '20px',
              background: countdownSeconds <= 15 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(25, 122, 39, 0.15)',
              color: countdownSeconds <= 15 ? 'var(--danger)' : 'var(--success)',
              fontWeight: 700,
              fontSize: '0.84rem'
            }}>
              <Clock size={14} /> 剩餘 {countdownSeconds} 秒
            </div>
            <button className="notebook-primary-btn" onClick={handleDownloadPdf} style={{ padding: '7px 16px', fontSize: '0.86rem' }}>
              立即下載 PDF
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }} className="no-print">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '8px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>正在載入試卷排版中...</p>
        </div>
      ) : (
        /* Real A4 Virtual Paper Preview Container */
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            overflowY: 'auto',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '20px 8px'
          }}
          className={`print-container ${examMode === 'practice' ? 'print-practice-mode' : 'print-solution-mode'}`}
        >
          <div
            id="print-sheet-preview"
            style={{
              width: '100%',
              maxWidth: '860px',
              minWidth: '320px',
              background: '#ffffff',
              color: '#000000',
              padding: 'clamp(20px, 4vw, 48px) clamp(16px, 4vw, 40px)',
              boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
              borderRadius: '8px',
              minHeight: '297mm',
              border: '1px solid #cbd5e1',
              fontFamily: '"Noto Sans TC", sans-serif'
            }}
          >
            {/* Standard Exam Paper Masthead */}
            <div style={{ borderBottom: '3px double #000000', paddingBottom: '16px', marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.84rem', letterSpacing: '0.15em', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {paperSubtitle}
              </div>
              <h1 style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '0.08em', margin: '4px 0 12px 0', color: '#000000' }}>
                {paperTitle}
              </h1>

              {/* Exam Info & Student Header Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  border: '1.5px solid #000000',
                  marginTop: '12px',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ padding: '6px 8px', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  考試科目
                </div>
                <div style={{ padding: '6px 8px', borderRight: '1px solid #000000', fontWeight: 600 }}>
                  {mistakes[0]?.subject_name || '綜合學科'}
                </div>
                <div style={{ padding: '6px 8px', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  考試時間
                </div>
                <div style={{ padding: '6px 8px', borderRight: '1px solid #000000' }}>
                  {examDuration} 分鐘
                </div>
                <div style={{ padding: '6px 8px', background: '#f8fafc', fontWeight: 700, color: '#dc2626' }}>
                  滿分 {totalScore} 分
                </div>

                <div style={{ padding: '6px 8px', borderTop: '1px solid #000000', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  班級 / 座號
                </div>
                <div style={{ padding: '6px 8px', borderTop: '1px solid #000000', borderRight: '1px solid #000000' }}>
                  {studentClass || '________'} / {studentSeat || '____'}
                </div>
                <div style={{ padding: '6px 8px', borderTop: '1px solid #000000', borderRight: '1px solid #000000', background: '#f8fafc', fontWeight: 700 }}>
                  考生姓名
                </div>
                <div style={{ padding: '6px 8px', borderTop: '1px solid #000000', borderRight: '1px solid #000000' }}>
                  {studentName || '____________'}
                </div>
                <div style={{ padding: '6px 8px', borderTop: '1px solid #000000', background: '#fef2f2', fontWeight: 800 }}>
                  得分：______
                </div>
              </div>

              {/* Instructions */}
              <div style={{ textAlign: 'left', marginTop: '10px', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
                ※ 注意事項：請在答案欄或指定作答區書寫清楚，演算過程請書寫於題目下方演算草稿區；若為單選題請於選項框打勾。
              </div>
            </div>

            {/* Questions Grid/Columns */}
            <div
              style={
                layoutColumn === 'two'
                  ? {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '28px',
                      alignItems: 'start'
                    }
                  : {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px'
                    }
              }
            >
              {mistakes.map((m, index) => (
                <div
                  key={m.id}
                  style={{
                    breakInside: 'avoid',
                    marginBottom: layoutColumn === 'two' ? '12px' : '20px',
                    padding: layoutColumn === 'two' ? '14px 16px' : '16px 0',
                    background: layoutColumn === 'two' ? '#fafbfc' : 'transparent',
                    border: layoutColumn === 'two' ? '1px solid #e2e8f0' : 'none',
                    borderBottom: '1.5px solid #cbd5e1',
                    borderRadius: layoutColumn === 'two' ? '8px' : '0'
                  }}
                  className="mistake-exam-item"
                >
                  {/* Question Number & Header */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#0f172a', color: '#ffffff', padding: '1px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        第 {index + 1} 題
                      </span>
                      <span>({scorePerQuestion} 分)</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {m.chapter_name || ''}
                    </div>
                  </div>

                  {/* Question Fields */}
                  <div style={{ color: '#0f172a', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {getEffectiveQuestionFields(m).map(field => (
                      <PrintFieldRenderer
                        key={field.id}
                        field={field}
                        value={field.type === 'options' ? (checkedStates[m.id]?.[field.id] || []) : (field.id === 'title' ? m.title : m.data?.questionData?.[field.id])}
                        exportMode={examMode === 'solution' ? 'solution' : 'practice'}
                        onOptionToggle={(optVal) => togglePreviewOption(m.id, field.id, optVal)}
                        onImageClick={onImageClick}
                      />
                    ))}
                  </div>

                  {/* Scratch Work Area (演算草稿留白區塊) */}
                  {scratchSpace !== 'none' && examMode !== 'solution' && (
                    <div
                      style={{
                        marginTop: '12px',
                        height: scratchSpace === 'large' ? '135px' : '70px',
                        border: '1.5px dashed #94a3b8',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)',
                        backgroundSize: '100% 22px',
                        padding: '8px 10px',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>演算草稿區（請在此書寫推導過程）</span>
                      <span style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8' }}>第 {index + 1} 題作答空間</span>
                    </div>
                  )}

                  {/* Inline Explanation (Only in full solution mode) */}
                  {examMode === 'solution' && getEffectiveAnswerFields(m).length > 0 && (
                    <div
                      style={{
                        marginTop: '14px',
                        borderTop: '2px solid #16a34a',
                        background: '#f0fdf4',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        border: '1px solid #bbf7d0'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#15803d', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={16} /> 參考標準解答與詳細解析：
                      </div>
                      <div style={{ color: '#14532d', fontSize: '0.86rem', lineHeight: 1.55 }}>
                        {getEffectiveAnswerFields(m).map(field => (
                          <PrintFieldRenderer
                            key={field.id}
                            field={field}
                            value={field.type === 'options' ? (checkedStates[m.id]?.[field.id] || []) : m.data?.answerData?.[field.id]}
                            exportMode="solution"
                            onOptionToggle={(optVal) => togglePreviewOption(m.id, field.id, optVal)}
                            onImageClick={onImageClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SEPARATE ANSWER KEY APPENDIX (獨立詳解附錄卡 - 大考標準機制) */}
            {examMode === 'separate_appendix' && (
              <div
                style={{
                  pageBreakBefore: 'always',
                  marginTop: '48px',
                  borderTop: '3px double #000000',
                  paddingTop: '32px'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.84rem', letterSpacing: '0.15em', fontWeight: 600, color: '#475569' }}>
                    {paperTitle} 專用核對本
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '6px 0', color: '#000000' }}>
                    標準答案與解析速查對照附錄
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    ※ 建議於全卷限時作答完成後，再行翻閱本頁核對評分
                  </div>
                </div>

                {/* Quick Answer Key Matrix */}
                <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ border: '1px solid #94a3b8', padding: '6px' }}>題號</th>
                        {mistakes.map((_, i) => (
                          <th key={i} style={{ border: '1px solid #94a3b8', padding: '6px' }}>
                            {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 700, background: '#f8fafc' }}>
                          答案
                        </td>
                        {mistakes.map((m, i) => {
                          const ansText =
                            m.data?.answerData?.a_ans ||
                            m.data?.answerData?.ans ||
                            (Array.isArray(m.data?.answerData?.options) ? m.data.answerData.options.join(',') : '') ||
                            '詳後';
                          return (
                            <td key={i} style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 700, color: '#dc2626' }}>
                              {ansText}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 700, background: '#f8fafc' }}>
                          配分
                        </td>
                        {mistakes.map((_, i) => (
                          <td key={i} style={{ border: '1px solid #94a3b8', padding: '6px' }}>
                            {scorePerQuestion}分
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Detailed Solution Explanations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '1.5px solid #000000', paddingBottom: '6px' }}>
                    各題詳細解析與關鍵思路
                  </h3>
                  {mistakes.map((m, index) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 16px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        breakInside: 'avoid'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: '6px' }}>
                        第 {index + 1} 題 解析（{m.title}）：
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
                        {getEffectiveAnswerFields(m).map(field => (
                          <PrintFieldRenderer
                            key={field.id}
                            field={field}
                            value={field.type === 'options' ? (checkedStates[m.id]?.[field.id] || []) : m.data?.answerData?.[field.id]}
                            exportMode="solution"
                            onOptionToggle={(optVal) => togglePreviewOption(m.id, field.id, optVal)}
                            onImageClick={onImageClick}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mistakes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#888888' }}>
                選中的錯題為空。請先勾選錯題，然後再進行匯出。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-renderer for print values
interface PrintFieldRendererProps {
  field: Field;
  value: any;
  exportMode?: 'practice' | 'solution';
  onOptionToggle?: (optionValue: string) => void;
  onImageClick?: (src: string) => void;
}

function PrintFieldRenderer({ field, value, exportMode, onOptionToggle, onImageClick }: PrintFieldRendererProps) {
  const isOptions = field.type === 'options';
  const isUnderline = field.styleType === 'underline';
  const isEmptyValue = value === undefined || value === null || value === '';

  if (isEmptyValue && !isOptions && !isUnderline) {
    return null;
  }

  const containerStyle: React.CSSProperties = field.inline
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginRight: '20px',
        marginBottom: '8px',
        verticalAlign: 'middle'
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '10px'
      };

  const labelStyle: React.CSSProperties = field.inline
    ? {
        fontSize: '0.86rem',
        color: '#1e293b',
        fontWeight: 'bold',
        margin: 0,
        display: field.hideLabel ? 'none' : 'inline'
      }
    : {
        fontSize: '0.78rem',
        color: '#475569',
        fontWeight: 'bold',
        marginBottom: '2px',
        display: field.hideLabel ? 'none' : 'block'
      };

  return (
    <div style={containerStyle} className="dynamic-value-card">
      {!field.hideLabel && <span style={labelStyle}>{field.label}：</span>}

      {isUnderline && (field.type === 'text' || field.type === 'textarea') && (
        <span
          style={{
            borderBottom: '1px solid #000000',
            minWidth: '80px',
            padding: '0 4px',
            display: 'inline-block'
          }}
        >
          {value || '\u00A0'}
        </span>
      )}

      {!isUnderline && field.type === 'text' && (
        <p style={{ margin: 0, fontSize: '0.88rem', wordBreak: 'break-word' }}>{value}</p>
      )}

      {!isUnderline && field.type === 'textarea' && (
        <p style={{ margin: 0, fontSize: '0.88rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</p>
      )}

      {field.type === 'image' && (
        <div style={{ width: '100%', maxWidth: '340px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', marginTop: '6px' }}>
          <img
            src={resolveImageUrl(value)}
            alt={field.label}
            onClick={() => onImageClick?.(resolveImageUrl(value))}
            style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block', cursor: onImageClick ? 'zoom-in' : 'default' }}
          />
        </div>
      )}

      {field.type === 'options' && (
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '10px', verticalAlign: 'middle', marginTop: '4px' }}>
          {field.options?.map((opt, i) => {
            const isChecked = Array.isArray(value) && value.includes(opt.value);
            const isSolutionMode = exportMode === 'solution';
            return (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.86rem',
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
                    width: '18px',
                    height: '18px',
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
      )}
    </div>
  );
}
