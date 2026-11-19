import { useState } from 'react';
import {
  BookOpen,
  FileText,
  BarChart2,
  Printer,
  CircleHelp,
  FolderTree,
  FileCode,
  Sparkles,
  Move,
  Crop,
  Compass,
  Smartphone,
  PenTool,
  Filter
} from 'lucide-react';

interface GuideSection {
  id: string;
  order: string;
  title: string;
  icon: React.ComponentType<any>;
  badge?: string;
  description: string;
}

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<string>('bookshelf');

  // Strictly mirrors the left sidebar (BinderSpineNav.tsx) order from top to bottom
  const sections: GuideSection[] = [
    {
      id: 'bookshelf',
      order: '1',
      title: '我的書架',
      icon: BookOpen,
      badge: '含 AI 匯入',
      description: '學科手帳書封、手帳內頁工具、架構搬運與 3 步驟 AI 批次匯入'
    },
    {
      id: 'mistakes',
      order: '2',
      title: '錯題索引',
      icon: FileText,
      description: '全科跨章節檢索、多維度複合篩選與批次操作'
    },
    {
      id: 'dashboard',
      order: '3',
      title: '學習概覽',
      icon: BarChart2,
      description: '四維度熟悉度統計、弱點分析與圖表下鑽'
    },
    {
      id: 'export',
      order: '4',
      title: '列印試卷',
      icon: Printer,
      description: '練習卷與解析卷雙模式，A4 高解析度列印與 PDF 匯出'
    },
    {
      id: 'guide',
      order: '5',
      title: '使用導引',
      icon: CircleHelp,
      description: '核心學習閉環、手機與 iPad 平板觸控操作說明'
    },
    {
      id: 'categories',
      order: '6',
      title: '分類管理',
      icon: FolderTree,
      badge: '含架構搬運',
      description: '五大分類維度、跨層級搬運選單、停用與安全刪除'
    },
    {
      id: 'templates',
      order: '7',
      title: '模板管理',
      icon: FileCode,
      description: '自訂題目與解析表單欄位，打造各科專屬筆記格式'
    },
    {
      id: 'prompt',
      order: '8',
      title: 'AI 提詞',
      icon: Sparkles,
      badge: 'AI 工具',
      description: 'AI 提示詞工坊、破題思維樹與自訂提詞範本協作'
    }
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
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  1. 我的書架（學科手帳與 AI 考卷批次匯入）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  管理每一門學科的獨立錯題本，點擊書封即可進入手帳內頁，並內建 AI 批次歸納考卷工具。
                </p>
              </div>
            </div>

            {/* Sub-features in Bookshelf & NotebookOpenView */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--pobi-blue)', margin: '0 0 8px 0' }}>
                  書架首頁與精裝書封
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  支援 8 款精裝書封色彩與 10 款學科徽章，一眼區分數學、物理、化學、英文、國文等科目，並即時顯示收錄錯題總數、待複習數與整體掌握率。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--pobi-blue)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PenTool size={15} /> 手帳內頁：自測、標註與掌握度
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  翻開手帳後可切換「自測模式（隱藏解析）」進行盲測；點擊錯題圖片右上角畫筆可開啟「紅筆標註」手寫筆記；點擊掌握度徽章即可快速循環切換熟悉度。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#B45309', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Move size={15} /> 章節與單元獨立「搬運」功能
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  每個章節分頁與小單元膠囊皆設有獨立「搬運」按鈕，點擊即可透過「科目 / 章節 / 小單元」下拉式選單自由調整層級（如將小單元提升為章節、或將章節併入其他章節），桌面版亦支援直接拖曳調整。
                </p>
              </div>
            </div>

            {/* AI Tool Explanation inside Bookshelf */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderLeft: '4px solid #D97706',
              borderRadius: '8px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--binder-text-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crop size={18} style={{ color: '#D97706' }} /> AI 工具說明：3 步驟 AI 考卷批次匯入與外部 AI 協作
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.65 }}>
                點擊書架右上角<strong>「AI 考卷批次匯入」</strong>，可將整份段考卷或模擬考照片搭配 ChatGPT、Google Gemini 或 Claude 一次性辨識入庫：
              </p>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.89rem', color: 'var(--binder-text-body)', lineHeight: 1.8 }}>
                <li style={{ marginBottom: '6px' }}>
                  <strong>步驟 1｜設計提詞（多選範圍）</strong>：勾選本次考卷涵蓋的科目與章節範圍，一鍵複製專屬 AI 提示詞，讓外部 AI 嚴格在指定架構內分類。
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>步驟 2｜上傳圖片、一鍵打包 ZIP 與貼上 JSON</strong>：分別選取題目圖與解析圖。若照片超過 5 張，強烈建議點擊<strong>「打包下載 ZIP 壓縮檔」</strong>，系統會自動分夾並附上 <code>外部AI提詞說明.txt</code>，直接上傳單一 ZIP 檔給 ChatGPT / Gemini / Claude 即可整批辨識；再將 AI 回傳的 JSON 貼回工作台，即可微調順序與一題多張解析圖配對。
                </li>
                <li>
                  <strong>步驟 3｜極速卡片審核入庫</strong>：逐題點選熟悉度（不會／卡／順）與錯因標籤即完成寫入，系統預設於完成一份考卷後自動清空暫存，方便連續處理下一份試卷。
                </li>
              </ol>
            </div>
          </div>
        );

      case 'mistakes':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1.5px solid #2563EB',
                padding: '11px',
                borderRadius: '8px',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  2. 錯題索引（全科資料庫與多維度篩選）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  跨科目統一檢視所有錯題卡片，適合考前精準撈取特定條件的弱點題目。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--pobi-blue)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={15} /> 多維度交集篩選
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  可同時組合篩選：科目、章節、小單元、熟悉度（順／卡／不會／誤解）、錯因標籤、自訂標籤、錄入日期區間與全文關鍵字，快速鎖定「近一個月內仍標記為卡或不會」的題目。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--pobi-blue)', margin: '0 0 8px 0' }}>
                  勾選題目連動試卷與 AI 提詞
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  在錯題索引中勾選多道錯題後，可直接一鍵送至<strong>「4. 列印試卷」</strong>製作專屬考前複習卷，或送至<strong>「8. AI 提詞」</strong>請外部 AI 針對這批題目進行跨題型觀念歸納。
                </p>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1.5px solid #10B981',
                padding: '11px',
                borderRadius: '8px',
                color: '#047857',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  3. 學習概覽（四維度熟悉度與弱點分析）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  將日常累積的錯題數據視覺化，快速找出最常失分的科目、章節與錯誤模式。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #10B981', background: 'rgba(16, 185, 129, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#047857', fontWeight: 700, fontSize: '0.95rem' }}>順（精熟掌握）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)', lineHeight: 1.55 }}>
                  能迅速看透題目本質且運算流暢，已完全掌握核心解法。
                </p>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #F59E0B', background: 'rgba(245, 158, 11, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#B45309', fontWeight: 700, fontSize: '0.95rem' }}>卡（過程卡頓）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)', lineHeight: 1.55 }}>
                  觀念有印象，但在關鍵公式轉換、輔助線或計算步驟受阻。
                </p>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #EF4444', background: 'rgba(239, 68, 68, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#B91C1C', fontWeight: 700, fontSize: '0.95rem' }}>不會（完全生疏）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)', lineHeight: 1.55 }}>
                  題型未曾見過或完全無頭緒，需回頭重讀課本定義與例題。
                </p>
              </div>

              <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #DC2626', background: 'rgba(220, 38, 38, 0.08)' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#991B1B', fontWeight: 700, fontSize: '0.95rem' }}>誤解（審題失誤）</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--binder-text-body)', lineHeight: 1.55 }}>
                  漏看條件限制（如正整數、非負實數）或誤判題幹情境。
                </p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', color: 'var(--binder-text-title)' }}>
                圖表下鑽與弱點追蹤
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                點擊任一科目、章節、熟悉度或錯因統計區塊，系統會自動套用對應篩選條件並跳轉至詳細分析清單，方便立刻針對高頻錯因進行補強複習。
              </p>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1.5px solid #3B82F6',
                padding: '11px',
                borderRadius: '8px',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Printer size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  4. 列印試卷（試卷工坊與雙模式 PDF）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  將線上錯題轉換為乾淨的 A4 紙本考卷，提供真實的無提示重考情境。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '18px', borderTop: '4px solid #10B981' }}>
                <h3 style={{ fontSize: '1.02rem', color: '#047857', margin: '0 0 8px 0' }}>
                  練習卷模式（無答案空白重練）
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  自動隱藏詳解文字與解答圖片，僅保留題幹與題目圖檔，並於每題下方保留充裕的手寫作答區，最適合考前重新檢測是否真正學會。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '18px', borderTop: '4px solid #3B82F6' }}>
                <h3 style={{ fontSize: '1.02rem', color: '#1D4ED8', margin: '0 0 8px 0' }}>
                  解析卷模式（完整詳解複習）
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-body)', lineHeight: 1.65, margin: 0 }}>
                  完整呈現答案解析、多張板書圖解、熟悉度與錯因標籤，方便寫完練習卷後逐題核對訂正，或裝訂成考前衝刺重點本。
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '14px 18px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', color: 'var(--binder-text-title)' }}>列印與存檔小技巧</h4>
              <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--binder-text-muted)', lineHeight: 1.65 }}>
                點擊「立即列印 / 另存為 PDF」時，請勾選瀏覽器列印視窗中的<strong>「背景圖形」</strong>選項，即可保留完整的標籤色彩與排版邊框。
              </p>
            </div>
          </div>
        );

      case 'guide':
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
                <CircleHelp size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  5. 使用導引（核心複習閉環與跨裝置操作）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  本頁依循左側主功能列順序編排，隨時可快速查詢各面板功能與建議工作流程。
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '18px 20px' }}>
              <h3 style={{ fontSize: '1.02rem', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pobi-blue)' }}>
                <Compass size={18} /> 建議的高效錯題閉環（五步驟）
              </h3>
              <ol style={{ paddingLeft: '20px', color: 'var(--binder-text-body)', lineHeight: 1.8, fontSize: '0.9rem', margin: 0 }}>
                <li><strong>建立書架</strong>：在「1. 我的書架」建立學科與章節架構。</li>
                <li><strong>快速入庫</strong>：單題可直接錄入，整份考卷則使用「AI 考卷批次匯入」快速建檔。</li>
                <li><strong>診斷弱點</strong>：在「2. 錯題索引」與「3. 學習概覽」追蹤熟悉度與高頻錯因。</li>
                <li><strong>重測驗收</strong>：透過「4. 列印試卷」產出無答案練習卷親手重寫，寫順後更新熟悉度。</li>
                <li><strong>深度解惑</strong>：卡關難題交給「8. AI 提詞」產出名師思維樹提詞，搭配外部 AI 徹底搞懂。</li>
              </ol>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={15} /> 手機與平板左側收折導覽
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-muted)', lineHeight: 1.6 }}>
                  點擊左側書脊頂端的收折按鈕即可切換精簡圖示模式，為小螢幕保留最大閱讀空間。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>
                  iPad / 觸控筆與下拉搬運優化
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-muted)', lineHeight: 1.6 }}>
                  紅筆標註支援平板觸控筆手寫圈選；架構搬運視窗採用置中浮動與「科目 / 章節 / 小單元」三層下拉選單，在觸控裝置上操作同樣流暢。
                </p>
              </div>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(217, 119, 6, 0.12)',
                border: '1.5px solid #D97706',
                padding: '11px',
                borderRadius: '8px',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FolderTree size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  6. 分類管理（五大維度與跨層級架構搬運）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  集中管理科目、熟悉度、錯因、章節與小單元，任何異動都會即時同步全站錯題與統計圖表。
                </p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #D97706' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Move size={16} /> 獨立「搬運」功能：依序透過「科目 / 章節 / 小單元」選單自由搬移
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.89rem', color: 'var(--binder-text-body)', lineHeight: 1.8 }}>
                <li><strong>每個章節與單元皆有獨立「搬運」按鈕</strong>：點擊頁首的「架構拖曳搬運」或表格中任一列的「搬運」即可開啟置中浮動視窗。</li>
                <li><strong>子單元提升為章節</strong>：選好來源小單元後，於目標位置選擇目標科目、且「目標章節」保持「提升為此科目的章節」（或直接點擊「直接提升為章節」快捷鈕），即可將小單元升級為章節。</li>
                <li><strong>章節併入為子單元</strong>：選擇來源章節後，指定另一個「目標章節」，系統會將該章節轉為目標章節底下的小單元；若原章節底下已有小單元，也會一併移入並保留所有錯題。</li>
                <li><strong>跨科目搬移與排序</strong>：可自由將章節或小單元移至其他科目，並可於「目標小單元排序」指定排在特定項目之前。</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>
                  錯因標籤：多選／單選與專屬範圍
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.6 }}>
                  可切換「多選模式」或「單選互斥模式」，並能將錯因設為「全科目通用」、「科目專屬」或「章節專屬」。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>
                  停用與安全刪除機制
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--binder-text-body)', lineHeight: 1.6 }}>
                  刪除含有錯題的分類時，可選擇將錯題重新指派至其他分類、保留為未分類、或僅停用該分類，避免誤刪重要筆記。
                </p>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(100, 116, 139, 0.12)',
                border: '1.5px solid #64748B',
                padding: '11px',
                borderRadius: '8px',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileCode size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  7. 模板管理（自訂錯題表單欄位）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  針對不同學科的解題特性，自由設計題目區與解析區的輸入欄位。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', color: 'var(--pobi-blue)' }}>
                  支援四種欄位類型
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.87rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>單行文字</strong>：適合記錄出處（如「113 學測第 8 題」）、考點關鍵字。</li>
                  <li><strong>多行文字</strong>：適合撰寫詳解步驟、破題思路與易錯提醒。</li>
                  <li><strong>圖片欄位</strong>：上傳或貼上題幹截圖、手寫算式與板書照片。</li>
                  <li><strong>選項標籤</strong>：自訂多選或單選屬性（如題型分類、難易度標記）。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', color: 'var(--pobi-blue)' }}>
                  各科推薦配置範例
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.87rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>物理／數學</strong>：增加「受力分析／關鍵圖形」、「使用公式與前提條件」。</li>
                  <li><strong>英文／國文</strong>：增加「核心單字片語」、「長難句結構剖析」、「修辭或典故」。</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'prompt':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(124, 58, 237, 0.12)',
                border: '1.5px solid #7C3AED',
                padding: '11px',
                borderRadius: '8px',
                color: '#6D28D9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  8. AI 提詞（AI 提示詞工坊與外部 AI 工具實戰）
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  將錯題庫直接轉化為高品質的教學引導提詞，搭配外部 AI 成為你的專屬一對一名師。
                </p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #7C3AED' }}>
              <h3 style={{ fontSize: '1.02rem', color: '#6D28D9', margin: '0 0 8px 0' }}>
                內建「名師思維樹」提詞架構
              </h3>
              <p style={{ fontSize: '0.89rem', color: 'var(--binder-text-body)', lineHeight: 1.75, margin: 0 }}>
                直接把題目貼給 AI 往往只會得到跳步的解答，無法真正建立解題直覺。系統內建的思維樹提詞會引導 AI 依循<strong>「核心觀念提取 -&gt; 題目盲點破譯 -&gt; 思考分岔樹 -&gt; 類題演練」</strong>四階段逐步啟發，幫你把真正卡住的那一步想通。
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>
                  自訂與覆寫專屬提詞模板
                </h4>
                <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--binder-text-body)', lineHeight: 1.65 }}>
                  除了系統預設範本，你也可以新增自己的專屬提詞（例如「考前 30 秒口訣總結」、「英文作文潤稿與替換句型」），或直接修改預設範本存為個人版本。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--pobi-blue)' }}>
                  搭配外部 AI 工具使用流程
                </h4>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.87rem', color: 'var(--binder-text-body)', lineHeight: 1.7 }}>
                  <li>勾選 1 題或多題錯題，選擇合適的提詞範本。</li>
                  <li>點擊「一鍵複製提詞」（若該題為純圖片題，系統會主動提醒一併附上原題目圖片）。</li>
                  <li>貼入 ChatGPT、Google Gemini 或 Claude 對話框送出，即可展開互動式複習。</li>
                </ol>
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
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--binder-text-title)' }}>
          系統使用導引與功能指南
        </h1>
        <p style={{ color: 'var(--binder-text-muted)', margin: 0, fontSize: '0.93rem' }}>
          依循左側功能面板順序（1 至 8）逐一介紹各項小功能、跨層級架構搬運與外部 AI 工具協作方式
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="guide-layout-grid" style={{ display: 'grid', gap: '20px', alignItems: 'start' }}>
        {/* Left Side Navigation Menu (Ordered identically to BinderSpineNav) */}
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

        {/* Right Side Content Stage */}
        <div className="glass-card" style={{ padding: '26px 30px', minHeight: '520px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
