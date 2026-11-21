import { useState } from 'react';
import {
  BookOpen,
  Inbox,
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
  Compass,
  Flame
} from 'lucide-react';

interface GuideSection {
  id: string;
  order: string;
  title: string;
  icon: React.ComponentType<any>;
}

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<string>('bookshelf');

  const sections: GuideSection[] = [
    { id: 'bookshelf', order: '1', title: '我的書架與手帳主頁', icon: BookOpen },
    { id: 'uncategorized', order: '2', title: '未分類區與安全刪除', icon: Inbox },
    { id: 'daily_review', order: '3', title: '每日複習（POBI 閃卡）', icon: RotateCcw },
    { id: 'workshop', order: '4', title: '分析與工坊（三步驟）', icon: BarChart3 },
    { id: 'templates', order: '5', title: '模板管理', icon: FileCode },
    { id: 'prompt', order: '6', title: 'AI 提詞管理', icon: Sparkles }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'bookshelf':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                1. 我的書架與單科三大模式主頁
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                左側側邊欄保留「我的書架」、「未分類區」、「模板管理」、「AI 提詞管理」四大核心入口。打開任一本錯題本，頂部即可切換三大模式：
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700 }}>分頁 1：查看錯題</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  依章節與小單元瀏覽錯題，支援新增／編輯（強制勾選熟悉度，並貼心提醒是否填寫錯因）、自測隱藏解析、圖片紅筆手寫標註，以及內嵌「分類與標籤管理」。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #10B981' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700 }}>分頁 2：每日複習</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  由比熊 POBI 引導挑選要複習的章節與小單元（預設全選），並可針對不同科目獨立設定熟悉度的複習天數，或設為「不再複習」。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #2563EB' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700 }}>分頁 3：分析與工坊</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  透過三步驟引導：選分析模式 → 多選範圍檢視視覺化弱點熱度圖與占比圖 → 直接複選圖表項目，匯出外部 AI 提示資料包（ZIP）或 A4 防跨頁練習卷。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MoreVertical size={15} /> 書封白色「⋮」與章節管理選單
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li><strong>書封白色「⋮」</strong>：分享此錯題本、重新命名或刪除。</li>
                  <li><strong>章節標籤「⋮」</strong>：分享此章節題目包、重新命名、跨層級搬移（科目／章節／小單元三層下拉）、刪除。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={15} /> 唯讀分享、跨帳號 ZIP 備份與深色模式
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                  <li><strong>唯讀分享連結</strong>：打開連結後免登入即可看圖與自測，並可依章節與小單元分類篩選。</li>
                  <li><strong>備份與還原</strong>：書架上方 <Archive size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> 支援跨帳號上傳還原舊 ZIP／JSON；右上角月亮圖示可隨時切換全介面深色模式。</li>
                </ul>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '4px solid #D97706' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Crop size={17} style={{ color: 'var(--accent-secondary)' }} /> 4 階段 AI 考卷批次匯入
              </h3>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                <li><strong>階段 1｜設計提詞</strong>：勾選本次考卷涵蓋的科目與章節，產生專屬 AI 辨識提詞。</li>
                <li><strong>階段 2｜上傳圖片 / AI 分析</strong>：上傳題目與解析圖片，可打包 ZIP 直接丟給 Gemini／ChatGPT／Claude 分析並貼回 JSON。</li>
                <li><strong>階段 3｜調整配對</strong>：微調題目順序、名稱、歸屬章節與一題多張解析圖配對。</li>
                <li><strong>階段 4｜極速審核入庫</strong>：逐題標記熟悉度後一鍵寫入錯題本。</li>
              </ol>
            </div>
          </div>
        );

      case 'uncategorized':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={21} style={{ color: 'var(--accent-secondary)' }} /> 2. 未分類區與刪除分類雙選項
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
                <li><strong>刪除前貼心詢問</strong>：每當刪除任一「錯題本（科目）」、「章節」或「小單元」且底下有題目時，系統皆會跳出確認視窗，讓您選擇「<strong>刪除分類並將題目放到未分類區</strong>」或「<strong>連同題目一併永久刪除</strong>」。</li>
                <li><strong>未分類區集中整理</strong>：左側側邊欄的「未分類區」會顯示目前暫存題數；點擊進入後可檢視題目縮圖、單筆編輯，或批次勾選並一鍵歸類到指定的「科目 / 章節 / 小單元」。</li>
              </ul>
            </div>
          </div>
        );

      case 'daily_review':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={21} style={{ color: 'var(--accent-secondary)' }} /> 3. 每日複習（POBI 閃卡與各科自訂週期）
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
                <li><strong>預設全選章節與小單元</strong>：點進科目手帳的「每日複習」，比熊 POBI 會列出本科所有章節與小單元並預設全選，自由勾選後即可啟動閃卡重測。</li>
                <li><strong>各科獨立設定熟悉度週期</strong>：右側「熟悉度複習週期設定」可為每個科目獨立調整「不會、卡、誤解、順」各自幾天後複習（預設 1 / 3 / 5 / 14 天）。</li>
                <li><strong>支援設為「不再複習」</strong>：例如某科的「順」題目已完全精熟，直接切換為「不再複習」即可停用該層級的到期提醒。</li>
              </ul>
            </div>
          </div>
        );

      case 'workshop':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={21} style={{ color: 'var(--accent-secondary)' }} /> 4. 分析與工坊（三步驟引導流程）
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #D97706' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700 }}>步驟 1：選擇分析依據</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  先決定要以「章節與單元模式」、「熟悉度與錯因模式」或「自訂標籤模式」來分析本科目錯題。
                </p>
              </div>
              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #EA580C' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Flame size={15} /> 步驟 2：多選範圍與視覺熱度圖
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  勾選範圍後檢視分類占比圖與 5 階色階視覺化弱點熱度圖（含 Top 3 熱點卡片），並可直接在圖表或熱度色塊上<strong>多選多個弱點範圍</strong>。
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #7C3AED' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={15} /> 步驟 3 選項一：外部 AI 提示資料包 (.zip)
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  清單可直接預覽每題的題目圖與解析圖縮圖；選擇提詞範本後一鍵打包成 <code>.zip</code>（僅含 1 份 <code>00_AI提詞與錯題清單.txt</code> 不重複包裝，搭配 <code>images/</code> 圖片檔），免解壓縮直接丟給 ChatGPT／Gemini／Claude 分析。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '16px 18px', borderTop: '3px solid #2563EB' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={15} /> 步驟 3 選項二：匯出考卷（A4 不切題）
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  預設 A4 尺寸並逐題計算高度防止跨頁切割，同時提供「系統列印」讓手機／平板自由調整列印版面與縮放比例；解析卷已移除多餘前置快速對答表。
                </p>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={21} style={{ color: 'var(--accent-secondary)' }} /> 5. 模板管理
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                依學科習慣自訂錯題錄入欄位（文字、多行詳解、圖片上傳、選項欄位等），讓不同科目皆能以最直覺的方式記錄錯題。
              </p>
            </div>
          </div>
        );

      case 'prompt':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={21} style={{ color: 'var(--accent-secondary)' }} /> 6. AI 提詞管理
            </h2>
            <div className="glass-card" style={{ padding: '18px' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                純粹專注於新增、編輯、複製與管理您的 AI 提詞範本（支援 <code>{'{{科目清單}}'}</code>、<code>{'{{錯題完整清單}}'}</code> 等動態變數）。儲存後即可於各科「分析與工坊 → 步驟 3」打包外部 AI 提示資料包時直接選用。
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
            <Compass size={22} style={{ color: 'var(--accent-secondary)' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>POBI STUDIO 使用導引手冊</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                最新 Ver 3 功能完整說明：四欄導覽、未分類區、POBI 閃卡、三步驟分析工坊與深色模式
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
