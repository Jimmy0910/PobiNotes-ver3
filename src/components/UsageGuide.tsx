import { useState } from 'react';
import {
  BookOpen,
  FileText,
  BarChart2,
  Printer,
  CircleHelp,
  FileCode,
  Sparkles,
  RotateCcw,
  MoreVertical,
  Crop,
  Compass,
  Smartphone,
  Filter,
  Archive,
  Share2
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

  // Strictly mirrors the current left sidebar (BinderSpineNav.tsx) order: 1 to 6
  const sections: GuideSection[] = [
    { id: 'bookshelf', order: '1', title: '我的書架', icon: BookOpen, badge: '三大模式 / AI' },
    { id: 'mistakes', order: '2', title: '錯題索引', icon: FileText },
    { id: 'dashboard', order: '3', title: '學習概覽', icon: BarChart2 },
    { id: 'export', order: '4', title: '列印試卷', icon: Printer },
    { id: 'guide', order: '5', title: '使用導引', icon: CircleHelp },
    { id: 'templates', order: '6', title: '模板管理', icon: FileCode }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'bookshelf':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(180, 83, 9, 0.12)',
                border: '1.5px solid #D97706',
                padding: '11px',
                borderRadius: '8px',
                color: '#92400E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.42rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  1. 我的書架（三大書本模式、手帳管理、4 階段 AI 匯入與備份）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  所有學科錯題本、POBI 閃卡複習、外部 AI 學習家教與分類管理皆整合於此核心入口。
                </p>
              </div>
            </div>

            {/* 3 Bookshelf Modes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: '#92400E' }}>
                  模式 1：檢視與編輯模式
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.6 }}>
                  點擊任一科目書封翻開錯題手帳，支援新增／編輯題目、自測隱藏解析、圖片紅筆手寫標註，以及單題作答進步軌跡（如：11-18 不會 -&gt; 11-20 順）。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #10B981' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RotateCcw size={15} /> 模式 2：閃卡複習模式
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.6 }}>
                  由比熊犬 POBI 對話式引導詢問今天要複習哪個科目與章節，進入閃卡翻面重測，並依熟悉度自動排定間隔複習日（不會 +1 天、卡 +3 天、誤解 +5 天、順 +14 天）。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #7C3AED' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={15} /> 模式 3：外部 AI 學習家教
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.6 }}>
                  原本的 AI 提詞工坊已移入此模式！點擊任一科目書封即帶入該科錯題，使用內建「名師思維樹」或自訂覆寫提詞範本，一鍵複製貼給 ChatGPT / Gemini / Claude。
                </p>
              </div>
            </div>

            {/* 3-Dot Menus & Embedded Category Manager */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, color: 'var(--pobi-blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MoreVertical size={15} /> 書封與章節直立三點（⋮）管理選單
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>書封「⋮」</strong>：分享此錯題本、重新命名、刪除。</li>
                  <li><strong>手帳內章節「⋮」</strong>：分享此章節題目包、重新命名、搬移（透過「科目 / 章節 / 小單元」三層下拉選單自由升降級）、刪除。</li>
                  <li><strong>內嵌分類與標籤管理</strong>：已合併至手帳上方工具列，支援平板卡片化排版與錯因標籤設定。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, color: 'var(--pobi-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={15} /> 錯題包唯讀分享與完整 ZIP 備份
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>唯讀分享連結</strong>：分享整本錯題本或單一章節後，收件人不須登入即可瀏覽圖片、切換自測模式，且仍可依<strong>章節與細部單元</strong>分類篩選。</li>
                  <li><strong>一鍵備份與還原</strong>：書架上方提供 <Archive size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />「備份與還原」，支援完整 ZIP（含圖片）與 JSON 匯出／增量還原。</li>
                </ul>
              </div>
            </div>

            {/* 4-Stage AI Batch Import */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderLeft: '4px solid #D97706',
              borderRadius: '8px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.04rem', fontWeight: 700, color: 'var(--binder-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crop size={18} style={{ color: '#D97706' }} /> AI 工具說明：4 階段 AI 考卷批次匯入流程
              </h3>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.8 }}>
                <li><strong>階段 1｜設計提詞</strong>：多選本次考卷涵蓋的科目與章節範圍，一鍵複製專屬 AI 辨識提詞。</li>
                <li><strong>階段 2｜上傳圖片 / AI 分析</strong>：上傳題目圖與解析圖（照片較多時可點擊「打包下載 ZIP 壓縮檔」連同提詞一次上傳給 ChatGPT / Gemini / Claude），再將 AI 回傳的 JSON 貼回解析。</li>
                <li><strong>階段 3｜調整配對</strong>：專注於獨立頁面微調題目順序、名稱、一鍵套用歸屬科目章節，以及一題多張解析圖勾選配對。</li>
                <li><strong>階段 4｜極速審核入庫</strong>：逐題標記熟悉度或一鍵批次寫入錯題本，完成後自動清空暫存以便接續下一份試卷。</li>
              </ol>
            </div>
          </div>
        );

      case 'mistakes':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1.5px solid #2563EB', padding: '11px', borderRadius: '8px', color: '#1D4ED8', display: 'flex' }}>
                <FileText size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.42rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  2. 錯題索引（全科資料庫與多維度篩選）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  跨科目統一檢索與批次勾選錯題，考前快速撈取重點弱點。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--pobi-blue)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={15} /> 多維度交集篩選
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  可同時依科目、章節、小單元、熟悉度（順／卡／不會／誤解）、錯因標籤、自訂標籤、日期區間與全文關鍵字交叉篩選。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--pobi-blue)', margin: '0 0 8px 0' }}>
                  勾選連動試卷工坊與 AI 學習家教
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  勾選多道題目後，可一鍵送往「4. 列印試卷」匯出專屬模擬練習卷，或送往「外部 AI 學習家教」產出跨題型思維樹提詞。
                </p>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1.5px solid #10B981', padding: '11px', borderRadius: '8px', color: '#047857', display: 'flex' }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.42rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  3. 學習概覽（四維度熟悉度與弱點分析）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  視覺化掌握各科精熟率與高頻失分原因，點擊圖表可直接下鑽檢視題目。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #10B981', background: 'rgba(16, 185, 129, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#047857', fontWeight: 700, fontSize: '0.95rem' }}>順（+14 天複習）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)' }}>看透題目本質且運算流暢，已精熟掌握。</p>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #F59E0B', background: 'rgba(245, 158, 11, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#B45309', fontWeight: 700, fontSize: '0.95rem' }}>卡（+3 天複習）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)' }}>有觀念印象，但關鍵轉換或計算步驟卡頓。</p>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #EF4444', background: 'rgba(239, 68, 68, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#B91C1C', fontWeight: 700, fontSize: '0.95rem' }}>不會（+1 天複習）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)' }}>毫無頭緒或未見過的題型，需優先重練。</p>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #DC2626', background: 'rgba(220, 38, 38, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#991B1B', fontWeight: 700, fontSize: '0.95rem' }}>誤解（+5 天複習）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)' }}>漏看條件限制或審題誤判情境。</p>
              </div>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1.5px solid #3B82F6', padding: '11px', borderRadius: '8px', color: '#1D4ED8', display: 'flex' }}>
                <Printer size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.42rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  4. 列印試卷（練習卷與解析卷雙模式 PDF）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  將線上錯題匯出為高解析度 A4 紙本考卷，提供真實的無提示重考情境。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '18px', borderTop: '4px solid #10B981' }}>
                <h3 style={{ fontSize: '1rem', color: '#047857', margin: '0 0 8px 0' }}>練習卷模式（無答案空白重練）</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  自動遮蔽解答文字與解析圖，僅保留題幹與手寫作答留白區，考前親手重寫最有效。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '18px', borderTop: '4px solid #3B82F6' }}>
                <h3 style={{ fontSize: '1rem', color: '#1D4ED8', margin: '0 0 8px 0' }}>解析卷模式（完整詳解複習）</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  完整呈現文字解析、多張板書圖解與錯因標籤，方便寫完後逐題訂正或裝訂成考前精華本。
                </p>
              </div>
            </div>
          </div>
        );

      case 'guide':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'rgba(180, 83, 9, 0.12)', border: '1.5px solid #D97706', padding: '11px', borderRadius: '8px', color: '#92400E', display: 'flex' }}>
                <CircleHelp size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.42rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  5. 使用導引（核心複習閉環、POBI 互動教學與平板優化）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  依循左側 1 至 6 面板順序編排，並可隨時從書架上方點擊「POBI 教學」重播比熊 POBI 互動導覽。
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '18px 20px' }}>
              <h3 style={{ fontSize: '1rem', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pobi-blue)' }}>
                <Compass size={18} /> 建議的高效錯題五步驟閉環
              </h3>
              <ol style={{ paddingLeft: '20px', color: 'var(--binder-text-body)', lineHeight: 1.8, fontSize: '0.89rem', margin: 0 }}>
                <li><strong>建立書架</strong>：新帳戶可透過 POBI 互動教學一鍵建立範例書架，或在書架新增各科錯題本。</li>
                <li><strong>快速入庫</strong>：單題錄入或使用「4 階段 AI 考卷批次匯入」整份考卷建檔。</li>
                <li><strong>每日閃卡</strong>：切換書架至「閃卡複習模式」，讓 POBI 依間隔重複排程帶你重測並累積進步軌跡。</li>
                <li><strong>弱點診斷與重練</strong>：於「學習概覽」找出弱點章節，用「列印試卷」產出無答案練習卷驗收。</li>
                <li><strong>外部 AI 家教與分享</strong>：卡關題切換書架至「外部 AI 學習家教」產出思維樹提詞，亦可分享章節題目包給同學討論。</li>
              </ol>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={15} /> 手機與 iPad 平板操作優化
              </h4>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-muted)', lineHeight: 1.65 }}>
                平板與手機支援左側收折書脊、分類卡片化排版、置中浮動視窗與統一右上角關閉鈕，以及觸控筆紅筆圈選標註。
              </p>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'rgba(100, 116, 139, 0.12)', border: '1.5px solid #64748B', padding: '11px', borderRadius: '8px', color: '#334155', display: 'flex' }}>
                <FileCode size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.42rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  6. 模板管理（自訂錯題表單欄位）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  針對不同學科需求自由設計題目區與解析區欄位（單行文字、多行筆記、圖片、選項標籤）。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>理科推薦欄位</h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                  可新增「題目來源（如 113 學測）」、「受力／幾何圖形」、「核心公式與限制條件」、「破題關鍵」。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>語文科推薦欄位</h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                  可新增「核心單字片語」、「長難句結構剖析」、「易混淆詞彙比較」與「修辭典故筆記」。
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1180px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ fontSize: '1.72rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--binder-text-title)' }}>
          系統使用導引與功能指南
        </h1>
        <p style={{ color: 'var(--binder-text-muted)', margin: 0, fontSize: '0.92rem' }}>
          完全依照最新左側功能面板順序（1 至 6）編排，涵蓋書架三大模式、4 階段 AI 匯入、POBI 閃卡與唯讀分享教學
        </p>
      </div>

      <div className="guide-layout-grid" style={{ display: 'grid', gap: '20px', alignItems: 'start' }}>
        <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                type="button"
                data-testid={`guide-tab-${section.id}`}
                onClick={() => setActiveTab(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'var(--glass-highlight)' : 'transparent',
                  color: isActive ? 'var(--pobi-blue)' : 'var(--binder-text-body)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? 'var(--pobi-blue)' : 'var(--bg-secondary)',
                    color: isActive ? '#FFFFFF' : 'var(--binder-text-muted)'
                  }}>
                    {section.order}
                  </span>
                  <Icon size={17} style={{ color: isActive ? 'var(--pobi-blue)' : 'var(--binder-text-muted)' }} />
                  <span>{section.title}</span>
                </div>
                {section.badge && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(217, 119, 6, 0.15)',
                    color: '#B45309',
                    fontWeight: 700
                  }}>
                    {section.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="glass-card" style={{ padding: '26px 30px', minHeight: '500px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
