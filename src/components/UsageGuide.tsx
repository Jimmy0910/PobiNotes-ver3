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
  Crop
} from 'lucide-react';

type GuideSection = 'start' | 'review' | 'workshop' | 'ai_templates' | 'backup_share';

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<GuideSection>('start');

  const navItems: Array<{ id: GuideSection; label: string; icon: any }> = [
    { id: 'start', label: '快速上手與書架', icon: BookOpen },
    { id: 'review', label: '每日閃卡複習', icon: RotateCcw },
    { id: 'workshop', label: '分析與考卷工坊', icon: BarChart3 },
    { id: 'ai_templates', label: 'AI 提詞與模板', icon: Sparkles },
    { id: 'backup_share', label: '分享與備份還原', icon: Archive }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'start':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={19} style={{ color: 'var(--accent-primary)' }} /> 快速上手與錯題建立
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #145B38' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700 }}>1. 建立與翻開錯題本</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>點書架「放置新錯題本」建立科目。</li>
                  <li>點任一書封翻開，切換「查看錯題 / 每日複習 / 分析與工坊」。</li>
                  <li>點書封右上角「⋮」可分享、改名或刪除。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700 }}>2. 新增與標記錯題</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>點右上角「+ 新增錯題」，可拍照或貼上題目與解析圖片。</li>
                  <li>熟悉度（順／卡／不會／誤解）為必選；錯因可依需要補充。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderTop: '3px solid #C89A50' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Inbox size={15} /> 3. 未分類區與安全刪除
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>刪除科目、章節或單元時，可選擇將題目移至「未分類區」保留。</li>
                  <li>從左側「未分類區」可勾選題目，一次歸類到指定科目與章節。</li>
                </ul>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '3.5px solid #D97706' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crop size={15} style={{ color: 'var(--accent-primary)' }} /> AI 考卷批次匯入
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                書架上方點「AI 考卷批次匯入」：勾選範圍產生提詞 → 上傳試卷圖並交給 AI 辨識貼回結果 → 微調圖片配對 → 逐題標記熟悉度即完成建檔。
              </p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={19} style={{ color: 'var(--accent-primary)' }} /> 每日閃卡複習與排程
            </h2>
            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
                <li><strong>自選複習範圍</strong>：進入科目「每日複習」後，自由勾選章節與小單元，可選擇「今日到期題」或「範圍內全部題目」開始閃卡重測。</li>
                <li><strong>各科獨立複習間隔</strong>：右側可針對每種熟悉度輸入任意天數，或點「不再複習」移出排程。</li>
                <li><strong>自測互動</strong>：閃卡先只顯示題目，點開解析後回報最新熟悉度，系統自動推算下次複習日。</li>
              </ul>
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
              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700 }}>步驟 1｜選擇分析維度</h4>
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  依「章節與單元」、「熟悉度與錯因」或「自訂標籤」切換檢視角度。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700 }}>步驟 2｜圖表多選弱點</h4>
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  檢視占比圖與弱點熱度表，直接點擊多個分類或熱度格即可鎖定弱點題目。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Printer size={14} /> 步驟 3｜匯出資料包或考卷
                </h4>
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  匯出 AI 提示資料包（ZIP）丟給 AI 指導，或排版匯出 A4 防切題考卷與系統列印。
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
              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} /> AI 提詞管理
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li>在左側「AI 提詞管理」自訂或微調解題指令範本，支援插入變數標籤。</li>
                  <li>儲存後，於「分析與工坊」匯出 ZIP 時可直接套用；將整包 ZIP 上傳至 Gemini／ChatGPT／Claude 即可分析。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LayoutTemplate size={15} /> 模板管理
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li>自訂不同科目的錄入欄位（文字、多行筆記、圖片、選項）。</li>
                  <li>新增錯題時可依題型自由切換對應模板。</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'backup_share':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.22rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={19} style={{ color: 'var(--accent-primary)' }} /> 唯讀分享與備份還原
            </h2>
            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
                <li><strong>唯讀題目分享包</strong>：點書封或章節「⋮」→「分享錯題包」產生連結。收件人免登入即可依章節與小單元瀏覽，答案預設收折方便自測。</li>
                <li><strong>完整備份與還原</strong>：書架上方點「備份與還原」，可匯出含圖片的 ZIP 備份檔，並支援跨帳號上傳還原資料。</li>
                <li><strong>深淺色切換</strong>：右上角月亮／太陽圖示可隨時切換淺色紙張與高對比深色介面。</li>
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
              快速掌握建檔、複習、弱點分析與匯出操作
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
