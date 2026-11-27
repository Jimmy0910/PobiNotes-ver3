import { useState } from 'react';
import {
  BookOpen,
  Inbox,
  RotateCcw,
  BarChart3,
  Sparkles,
  Archive,
  HelpCircle,
  Printer,
  Share2,
  LayoutTemplate,
  Crop,
  Mail,
  Sliders,
  ShieldCheck,
  Search
} from 'lucide-react';

type GuideSection = 'start' | 'review' | 'workshop' | 'ai_templates' | 'backup_share';

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<GuideSection>('start');

  const navItems: Array<{ id: GuideSection; label: string; icon: any }> = [
    { id: 'start', label: '書架與錯題管理', icon: BookOpen },
    { id: 'review', label: '每日複習與通知', icon: RotateCcw },
    { id: 'workshop', label: '分析與考卷工坊', icon: BarChart3 },
    { id: 'ai_templates', label: 'AI 提詞與模板', icon: Sparkles },
    { id: 'backup_share', label: '分享、備份與帳號', icon: Archive }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'start':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={19} style={{ color: 'var(--accent-primary)' }} /> 書架、錯題建檔與管理
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #145B38' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700 }}>1. 數位書架與手帳分頁</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>點「放置新錯題本」建立科目，支援自訂封面配色與圖示。</li>
                  <li>翻開書封可切換「查看錯題 / 每日複習 / 分析與工坊」。</li>
                  <li>書封或章節右上角「⋮」可分享、改名、移動階層或刪除。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700 }}>2. 新增錯題與四色熟悉度</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>點「+ 新增錯題」可拍照、上傳或直接貼上題目與解析圖片（點圖可放大）。</li>
                  <li>
                    熟悉度為必選四色標準：
                    <span style={{ color: '#15803D', fontWeight: 700 }}>順（綠）</span>、
                    <span style={{ color: '#CA8A04', fontWeight: 700 }}>卡（黃）</span>、
                    <span style={{ color: '#DC2626', fontWeight: 700 }}>不會（紅）</span>、
                    <span style={{ color: '#7C3AED', fontWeight: 700 }}>誤解（紫）</span>。
                  </li>
                  <li>可自由補充錯因標籤、自訂標籤、章節與小單元。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #C89A50' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Search size={15} /> 3. 自測模式與篩選搜尋
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>開啟「自測模式」可先隱藏解析，點擊單題再展開對答案。</li>
                  <li>支援依章節、小單元、熟悉度、錯因與關鍵字快速過濾。</li>
                  <li>點擊題卡上的熟悉度標籤即可即時循環切換掌握狀態。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #475569' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Inbox size={15} /> 4. 未分類區與安全刪除
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>刪除科目、章節或單元時，可選擇將題目保留至「未分類區」。</li>
                  <li>左側「未分類區」支援勾選多題，一次歸類到指定科目與章節。</li>
                </ul>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '3.5px solid #D97706' }}>
              <h4 style={{ margin: 0, marginBottom: '6px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crop size={15} style={{ color: 'var(--accent-primary)' }} /> AI 考卷批次匯入
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                書架上方點「AI 考卷批次匯入」：勾選範圍產生提詞 → 上傳試卷圖並交給 AI 辨識貼回結果 → 確認圖片配對 → 逐題點選熟悉度即可快速完成整份考卷建檔。
              </p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={19} style={{ color: 'var(--accent-primary)' }} /> 每日閃卡複習、排程與 Gmail 通知
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700 }}>1. 選擇範圍</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  進入科目「每日複習」後，預設全選本科所有章節與小單元，可自由勾選或縮小本次要複習的範圍。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #145B38' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700 }}>2. 開始閃卡複習</h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  可選擇只練「今日到期題目」或重練「已選範圍全部錯題」。閃卡先顯示題目，點開解析後回報最新熟悉度，系統自動推算下次複習日。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #7C3AED' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={15} /> 3. 整合排程設定
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  依各科目分別設定四種熟悉度的複習間隔天數（或設為「不再複習」），儲存後會自動同步套用於閃卡複習與 Gmail 每日通知。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #0A296B' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} /> 4. Gmail 每日自動通知
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  以 Google 帳號登入即可開啟。可自訂通知章節範圍、每日寄信時間（台灣時間 UTC+8）與星期，並支援寄送測試預覽信確認收信狀態。
                </p>
              </div>
            </div>
          </div>
        );

      case 'workshop':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={19} style={{ color: 'var(--accent-primary)' }} /> 分析與考卷工坊
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #145B38' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700 }}>步驟 1｜選擇分析維度</h4>
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  依「章節與單元」、「熟悉度與錯因」或「自訂標籤」切換檢視角度，快速找出失分集中區域。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700 }}>步驟 2｜圖表多選弱點</h4>
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  檢視占比圖與弱點熱度表，直接點擊多個分類或熱度格即可鎖定對應弱點題目清單。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #C89A50' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Printer size={14} /> 步驟 3｜匯出資料包或考卷
                </h4>
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  一鍵打包 AI 提示資料包（ZIP）給 AI 分析，或排版輸出 A4 防切題練習卷、附解析卷與系統列印。
                </p>
              </div>
            </div>
          </div>
        );

      case 'ai_templates':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={19} style={{ color: 'var(--accent-primary)' }} /> AI 提詞管理與題目模板
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #145B38' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} /> AI 提詞管理
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li>在左側「AI 提詞管理」自訂或微調解題指令範本，支援插入變數標籤。</li>
                  <li>儲存後，於「分析與工坊」匯出 ZIP 時可直接套用；將整包 ZIP 上傳至 Gemini／ChatGPT／Claude 即可取得個人化診斷。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LayoutTemplate size={15} /> 模板管理
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li>自訂不同科目的錄入欄位（單行文字、多行筆記、圖片、選項）。</li>
                  <li>新增錯題時可依題型自由切換對應模板，兼顧理科解題與文科筆記。</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'backup_share':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={19} style={{ color: 'var(--accent-primary)' }} /> 唯讀分享、備份還原與帳號設定
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #145B38' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={15} /> 唯讀錯題分享包（30 天效期）
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li>點書封或章節「⋮」→「分享錯題包」即可產生免登入唯讀連結，答案預設收折方便對方自測。</li>
                  <li>所有分享連結一律保留 <strong>30 天</strong>，到期後自動失效並清除，不影響原始錯題本資料。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Archive size={15} /> 完整備份與跨帳號還原
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li>書架上方點「備份與還原」，可匯出含所有圖片與分類結構的完整 ZIP 備份檔。</li>
                  <li>支援在原帳號或新帳號上傳 ZIP 一鍵還原，換裝置或轉移資料都安心。</li>
                </ul>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '3.5px solid #145B38' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} style={{ color: 'var(--accent-primary)' }} /> 介面與帳號小工具
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                <li><strong>POBI 互動教學</strong>：隨時可點選右上角導覽圖示，由比熊 POBI 帶你一步步實際操作。</li>
                <li><strong>深淺色模式</strong>：右上角月亮／太陽圖示可切換暖白紙張與高對比深色介面。</li>
                <li><strong>意見回饋與帳號管理</strong>：支援線上回報建議，亦可透過 Google 帳號登入解鎖 Gmail 每日通知，或隨時安全登出與註銷帳號。</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ flex: 1, padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ width: '100%', maxWidth: '1020px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #D97706, #B45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <HelpCircle size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.38rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              POBI STUDIO 使用導引
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              快速掌握建檔、每日複習、Gmail 通知、弱點分析、分享與備份操作
            </p>
          </div>
        </div>

        <div className="guide-layout-grid" style={{ display: 'grid', gap: '18px', alignItems: 'start' }}>
          <aside className="glass" style={{ padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={isActive ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    justifyContent: 'flex-start',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    fontWeight: isActive ? 700 : 500,
                    gap: '9px'
                  }}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="glass" style={{ padding: '20px 22px', borderRadius: '12px', minHeight: '340px' }}>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
