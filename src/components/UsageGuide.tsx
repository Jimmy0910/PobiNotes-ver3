import { useState } from 'react';
import {
  BookOpen,
  FileCode,
  Sparkles,
  RotateCcw,
  BarChart3,
  Printer,
  Package,
  MoreVertical,
  Crop,
  Archive,
  Share2,
  Compass
} from 'lucide-react';

interface GuideSection {
  id: string;
  order: string;
  title: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<string>('bookshelf');

  // Mirrors the streamlined left sidebar + Subject Hub architecture
  const sections: GuideSection[] = [
    { id: 'bookshelf', order: '1', title: '我的書架與手帳主頁', icon: BookOpen, badge: '核心入口' },
    { id: 'daily_review', order: '2', title: '每日複習（POBI 閃卡）', icon: RotateCcw },
    { id: 'workshop', order: '3', title: '分析與工坊（診斷 / AI包 / 練習卷）', icon: BarChart3 },
    { id: 'templates', order: '4', title: '模板管理', icon: FileCode },
    { id: 'prompt', order: '5', title: 'AI 提詞管理', icon: Sparkles }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'bookshelf':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(180, 83, 9, 0.12)', border: '1.5px solid #D97706', padding: '10px', borderRadius: '8px', color: '#92400E', display: 'flex' }}>
                <BookOpen size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  1. 我的書架與單科手帳主頁
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  左側僅保留「我的書架」、「模板管理」、「AI 提詞管理」。點開任一錯題本，即可使用該科專屬三大模式。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: '#92400E' }}>
                  分頁 1：查看錯題
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                  延續直覺的章節／小單元分頁模式，支援新增與編輯題目、自測隱藏解析、圖片紅筆手寫標註、單題進步軌跡，以及內嵌「分類與標籤管理」。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #10B981' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: '#047857' }}>
                  分頁 2：每日複習
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                  比熊 POBI 引導挑選要複習的章節與小單元（預設全選），並可針對「不同科目」各自設定 4 種熟悉度的複習天數，或設為「不再複習」。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #2563EB' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: '#1D4ED8' }}>
                  分頁 3：分析與工坊
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                  以進階多維度篩選為主畫面，篩選完範圍後可切換「1. 學習診斷（分類占比／熱度表）」或「2. 錯題清單與工坊（AI 提詞包 ZIP／匯出 A4 練習卷）」。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--pobi-blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MoreVertical size={15} /> 書封與章節三點（⋮）管理選單
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>書封白色「⋮」</strong>：無論淺色或深色模式皆以清晰白色圖示顯示，可分享此錯題本、重新命名或刪除。</li>
                  <li><strong>章節標籤「⋮」</strong>：分享此章節題目包、重新命名、搬移（科目／章節／小單元三層下拉選單）、刪除。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--pobi-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={15} /> 唯讀分享連結與跨帳號 ZIP 備份還原
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>錯題本分享</strong>：打開連結後免登入即可看圖與自測，並可依章節與小單元分類篩選。</li>
                  <li><strong>備份與還原</strong>：書架上方 <Archive size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />「備份與還原」支援跨帳號上傳還原舊 ZIP／JSON 資料與圖片。</li>
                </ul>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderLeft: '4px solid #D97706', borderRadius: '8px', padding: '16px 18px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Crop size={17} style={{ color: '#D97706' }} /> 4 階段 AI 考卷批次匯入
              </h3>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                <li><strong>階段 1｜設計提詞</strong>：勾選本次考卷涵蓋的科目與章節，產生專屬 AI 辨識提詞。</li>
                <li><strong>階段 2｜上傳圖片 / AI 分析</strong>：上傳題目與解析圖片，可打包 ZIP 直接丟給 Gemini／ChatGPT／Claude 分析並貼回 JSON。</li>
                <li><strong>階段 3｜調整配對</strong>：獨立調整題目名稱、順序、歸屬章節與一題多張解析圖配對。</li>
                <li><strong>階段 4｜極速審核入庫</strong>：標記熟悉度後一鍵入庫。</li>
              </ol>
            </div>
          </div>
        );

      case 'daily_review':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={21} style={{ color: '#B45309' }} /> 2. 每日複習（POBI 閃卡與各科自訂複習週期）
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', lineHeight: 1.85, color: 'var(--binder-text-body)' }}>
                <li><strong>預設全選章節與小單元</strong>：點進科目手帳的「每日複習」，比熊 POBI 會列出本科所有章節與小單元並預設全選，可自由勾選／取消勾選範圍後立即開始閃卡重測。</li>
                <li><strong>各科獨立設定熟悉度週期</strong>：右側「熟悉度複習週期設定」可為每個科目獨立調整「不會、卡、誤解、順」各自幾天後複習（預設 1 / 3 / 5 / 14 天）。</li>
                <li><strong>支援設為「不再複習」</strong>：例如某科「順」已經完全掌握，可直接切換為「不再複習」，該熟悉度的題目就不會再出現在今日到期提醒中。</li>
              </ul>
            </div>
          </div>
        );

      case 'workshop':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={21} style={{ color: '#B45309' }} /> 3. 分析與工坊（學習診斷、AI 提詞包 ZIP 與 A4 練習卷）
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, color: '#92400E' }}>
                  步驟一：進階多維度篩選
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--binder-text-body)' }}>
                  以進階多維度篩選為主畫面，可依章節、小單元、熟悉度、錯因、標籤、日期區間與關鍵字即時交叉鎖定本科錯題範圍。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #10B981' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, color: '#047857' }}>
                  按鈕 1：學習診斷（分類占比 / 熱度表）
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--binder-text-body)' }}>
                  檢視章節、單元、熟悉度與錯因占比（長條圖／圓餅圖），以及雙維度弱點熱度表；點擊任一熱度格可立即篩選該弱點並前往工坊。
                </p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '4px solid #D97706' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: '#92400E' }}>
                按鈕 2：錯題清單（含圖片縮圖預覽）與兩大工坊模式
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--binder-text-body)' }}>
                清單卡片會直接顯示每道錯題的題幹摘要、題目圖片縮圖（「題」標記）與解析圖片縮圖（「解」標記），點擊縮圖可放大檢視原圖，自由勾選後即可套用下方兩大工坊模式：
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #7C3AED' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={15} /> 工坊模式 1：AI 提詞包（打包 ZIP）
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--binder-text-body)' }}>
                  勾選錯題與選擇 AI 提詞模板後，一鍵將所有題目圖、解析圖與提詞檔打包成 <code>.zip</code>，直接整個壓縮檔上傳給 ChatGPT／Gemini／Claude 即可進行圖文深度診斷。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #2563EB' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={15} /> 工坊模式 2：匯出練習卷（A4 不切題）
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--binder-text-body)' }}>
                  預設 A4 尺寸，自動偵測每題高度並於換頁前完整跳頁，避免任何題目或圖片被切斷；同時支援「系統列印」讓手機／平板與電腦自由調整列印版面與縮放比例，解析卷亦已移除多餘的前置快速對答表。
                </p>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={21} style={{ color: '#B45309' }} /> 4. 模板管理
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--binder-text-body)' }}>
                可依科目需求自訂錯題錄入欄位（文字、多行筆記、圖片上傳、選項欄位等），讓不同科目的錯題皆能維持最順手的記錄格式。
              </p>
            </div>
          </div>
        );

      case 'prompt':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={21} style={{ color: '#B45309' }} /> 5. AI 提詞管理
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--binder-text-body)' }}>
                集中管理所有內建與自訂 AI 提詞範本（支援變數標籤如 <code>{'{{科目清單}}'}</code>、<code>{'{{錯題完整清單}}'}</code>）。儲存後的自訂範本會自動同步至每個科目的「分析與工坊 → AI 提詞包（ZIP）」供即時選用。
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ width: '100%', maxWidth: '1040px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div className="glass" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass size={22} style={{ color: '#B45309' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>POBI STUDIO 使用導引手冊</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                快速掌握精簡側邊欄、單科三大模式、POBI 閃卡複習與工坊匯出流程
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sections.map(sec => {
            const Icon = sec.icon;
            const active = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '0.84rem', fontWeight: active ? 700 : 600 }}
              >
                <Icon size={15} />
                <span>{sec.order}. {sec.title}</span>
              </button>
            );
          })}
        </div>

        <div className="glass" style={{ padding: '24px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
