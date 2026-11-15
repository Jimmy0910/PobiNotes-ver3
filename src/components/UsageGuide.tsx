import { useState } from 'react';
import {
  BookOpen,
  FolderTree,
  FileText,
  Printer,
  Sparkles,
  BarChart2,
  Layers,
  Crop,
  Smartphone,
  Compass
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  badge?: string;
  description: string;
}

export default function UsageGuide() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const sections: GuideSection[] = [
    { id: 'overview', title: '系統總覽與設計理念', icon: BookOpen, badge: 'ver3', description: '數位書架與活頁手帳的現代複習架構' },
    { id: 'import', title: '3 步驟 AI 批次錯題與外部 AI 教學', icon: Crop, badge: '核心必讀', description: '多選範圍提詞、外部 AI 協作、多圖配對與自動清空' },
    { id: 'bookshelf', title: '數位書架與手帳書封', icon: Layers, description: '多色彩皮革書封、徽章與翻頁手帳導覽' },
    { id: 'mastery', title: '四維度熟悉度與錯因診斷', icon: BarChart2, description: '順、卡、不會、誤解與多維度弱點標籤' },
    { id: 'export', title: '試卷工坊與 PDF 雙模式', icon: Printer, description: '練習卷與解析卷，高解析度 A4 列印' },
    { id: 'prompt', title: 'AI 複習提詞工坊', icon: Sparkles, description: '搭配 Claude/ChatGPT/Gemini 的破題思維樹' },
    { id: 'structure', title: '學科章節與單元三層管理', icon: FolderTree, description: '靈活規劃各科綱要與自訂題型模板' },
    { id: 'mobile', title: '行動裝置與左側收折導覽', icon: Smartphone, description: '手機左側收折書脊面板與平板觸控優化' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(180, 83, 9, 0.12)',
                border: '1.5px solid #D97706',
                padding: '12px',
                borderRadius: '8px',
                color: '#92400E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={26} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
                  歡迎來到數位錯題手帳系統
                </h2>
                <p style={{ color: 'var(--binder-text-muted)', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
                  結合實體手帳質感、外部 AI 批次歸納與科學化錯題診斷的現代學習工作站
                </p>
              </div>
            </div>

            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.96rem' }}>
              很多同學在整理錯題時，往往流於「剪下貼上」或「拍照存檔」，但真正大考前卻沒有時間重新作答。
              本系統的核心精神在於打造<strong>「收集 -&gt; 標記 -&gt; 診斷 -&gt; 重練 -&gt; 攻克」</strong>的高效閉環：
              讓每一道錯題都有獨立的知識脈絡，隨時能透過 3 步驟 AI 批次歸納快速入庫，並一鍵生成無答案練習卷重新檢驗。
            </p>

            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '22px'
            }}>
              <h3 style={{ fontSize: '1.12rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pobi-blue)' }}>
                <Compass size={20} /> 核心複習五步驟：
              </h3>
              <ol style={{ paddingLeft: '22px', color: 'var(--binder-text-body)', lineHeight: 1.85, fontSize: '0.94rem', margin: 0 }}>
                <li style={{ marginBottom: '10px' }}>
                  <strong style={{ color: 'var(--binder-text-title)' }}>放置學科手帳</strong>：在「我的數位書架」中挑選藍、綠、紅、橘、粉、棕、紫、黑等精裝書封，建立國文、英文、數學、物理、化學等科目。
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <strong style={{ color: 'var(--binder-text-title)' }}>3 步驟 AI 考卷批次匯入</strong>：先於第一階段多選科目與章節範圍產生提詞，交由外部 AI（ChatGPT / Gemini / Claude）辨識後，在第二階段自由調整順序與一題多張解析圖配對，最後於第三階段極速審核寫入錯題索引。
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <strong style={{ color: 'var(--binder-text-title)' }}>標記四維度熟悉度</strong>：依據真實答題體感標記「順、卡、不會、誤解」，並附上粗心、觀念、審題等錯因標籤。
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <strong style={{ color: 'var(--binder-text-title)' }}>試卷工坊重新演練</strong>：考前勾選目標章節，切換「練習卷模式」隱藏答案匯出 A4 試卷，給自己一次真正的無提示重測。
                </li>
                <li>
                  <strong style={{ color: 'var(--binder-text-title)' }}>AI 提詞深入剖析</strong>：遇到想不通的難題，使用 AI 提詞工坊產出學測自然/數學破題思維樹，引導 AI 逐步啟發盲點。
                </li>
              </ol>
            </div>
          </div>
        );

      case 'bookshelf':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              數位書架與多學科手帳
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              書架首頁採用溫潤質感書架陳列，每一本學科手帳都象徵一門獨立的知識庫。
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--pobi-blue)', marginBottom: '8px' }}>
                  八款精裝皮革書封色彩
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.6 }}>
                  提供藏青深藍、翡翠墨綠、經典緋紅、暖陽蜜橘、櫻花柔粉、復古牛皮棕、紫檀原木褐、石墨曜岩黑共 8 種色彩。每一種都具備皮革紋理光澤與細緻燙金。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '18px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--pobi-blue)', marginBottom: '8px' }}>
                  專屬學科徽章與翻頁體驗
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.6 }}>
                  支援自然科學、數學計算、語言文學、歷史社會等 10 款徽章標誌。點選書封即可「翻開手帳」，進入左右對開的活頁筆記本模式。
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.96rem', color: 'var(--binder-text-title)' }}>
                手帳翻開後的內頁功能：
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.8 }}>
                <li><strong>左頁章節單元導航</strong>：以活頁色標紙籤呈現科目底下的章節與單元，附帶各章節題目數與熟悉度圓點。</li>
                <li><strong>右頁核心工具與進度</strong>：快速開啟新增錯題、試卷工坊列印、章節新增，以及各科目精熟掌握度的即時百分比進度條。</li>
              </ul>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              3 步驟 AI 考卷批次錯題歸納與外部 AI 協作完整教學
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              當手邊有一整份段考卷、模擬考卷或多張錯題與詳解照片時，無須逐題手動打字建檔。點擊書架或總覽頁面的<strong>「AI 考卷批次匯入」</strong>，系統會引導您透過以下標準三步驟完成批次歸納：
            </p>

            {/* Step-by-Step 3 Stages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #D97706' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', color: 'var(--binder-text-title)' }}>
                  第一階段（步驟 1）：多選科目／章節範圍，產生專屬 AI 提詞
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li>點擊「AI 考卷批次匯入」後，系統會優先帶您進入<strong>「1. 設計提詞 (多選範圍)」</strong>。</li>
                  <li><strong>自由多選科目與章節範圍</strong>：您可勾選本次考卷涵蓋的 1 個或多個科目，並在科目卡片內點選多個章節標籤（亦可使用上方輸入框即時新增自訂科目與章節至多選範圍）。</li>
                  <li><strong>智慧範圍鎖定</strong>：若您只勾選「單一科目＋單一章節」（例如只選【物理】【運動&amp;力】），提詞會自動命令外部 AI 將這批錯題全部歸入該章節；若勾選多個科目與章節，提詞會列出您選定的清單，讓外部 AI 嚴格在該範圍內為各題分類。</li>
                  <li>確認範圍後，點擊<strong>「複製提詞並前往第 2 步」</strong>，系統即會將專屬提詞複製到剪貼簿。</li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #2563EB' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', color: 'var(--binder-text-title)' }}>
                  特別說明：如何搭配外部 AI（ChatGPT / Google Gemini / Claude）進行辨識？
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.6 }}>
                  本系統與外部主流多模態 AI 完美協作。若錯題張數較多，強烈建議善用系統內建的圖片打包功能：
                </p>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.8 }}>
                  <li>
                    <strong>開啟外部 AI 對話視窗</strong>：打開您習慣使用的外部多模態 AI（推薦使用 ChatGPT-4o、Google Gemini 或 Claude 3.5 / 3.7 Sonnet）。
                  </li>
                  <li>
                    <strong>重點建議：圖片較多時，請使用本系統內建「一鍵打包為 ZIP 壓縮檔」</strong>：
                    <ul style={{ margin: '4px 0 6px 0', paddingLeft: '18px', color: '#1E40AF', fontSize: '0.86rem', lineHeight: 1.65 }}>
                      <li><strong>為何需要打包？</strong>大考考卷或模擬考通常有十幾至數十張題目與解析照片，但 ChatGPT 與 Claude 的對話框通常有單次貼圖張數上限（例如一次最多 5 至 10 張），逐張上傳非常容易遺漏或順序錯亂。</li>
                      <li><strong>如何一鍵打包？</strong>在系統第 2 階段「選圖與調整配對」中選取好全部題目與解析照片後，點擊藍色的<strong>「打包下載 ZIP 壓縮檔」</strong>按鈕，系統會將所有照片自動依序歸類為 <code>題目圖片/</code> 與 <code>解析圖片/</code> 兩個資料夾，並自動附帶步驟 1 所產生的 <code>外部AI提詞說明.txt</code>。</li>
                      <li><strong>直接上傳單一 ZIP 檔</strong>：直接將下載的單一 <code>.zip</code> 壓縮檔拖曳上傳至外部 AI（ChatGPT Code Interpreter / Claude / Gemini 均支援讀取 ZIP 壓縮包），並在訊息中告知「請解壓縮此 ZIP 檔，依照裡面的外部AI提詞說明.txt 與圖片進行分析」，外部 AI 即可一次性批次讀取全部照片！</li>
                    </ul>
                  </li>
                  <li>
                    <strong>若圖片較少時（5 張以內）</strong>：亦可直接在外部 AI 對話框中依序拖曳上傳題目圖與解析圖，並貼上步驟 1 複製的提詞後送出。
                  </li>
                  <li>
                    <strong>一鍵複製外部 AI 輸出的 JSON 代碼</strong>：外部 AI 會自動辨識每題的核心題旨（<code>title</code>）、整理詳解重點說明（<code>key_concept</code>）、歸類至您指定的科目與章節，並配對題目與多張解析圖編號，最後輸出一段 <code>[ &#123; ... &#125; ]</code> 格式的 JSON 陣列。請直接點擊外部 AI 程式碼區塊右上角的<strong>「Copy code（複製代碼）」</strong>貼回本系統第 2 階段。
                  </li>
                </ol>
              </div>

              <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #059669' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', color: 'var(--binder-text-title)' }}>
                  第二階段（步驟 2）：上傳題目／解析圖片、一鍵打包 ZIP、貼上 JSON 與手動微調配對
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li><strong>雙區圖片上傳</strong>：在「1. 題目圖片區」與「2. 解析圖片區」分別選取題目圖與解析圖（系統會自動進行高畫質壓縮並永久存入資料庫）。</li>
                  <li><strong>內建圖片打包為 ZIP 功能</strong>：上傳圖片後，可隨時點擊「打包下載 ZIP 壓縮檔」，系統會自動整理所有圖片與提詞說明為單一檔案，供外部 AI 高速解析。</li>
                  <li><strong>貼上 JSON 陣列</strong>：將外部 AI 回傳的 JSON 貼入「3. 貼上外部 AI 分析結果」輸入框，下方會立即展開可視化配對工作台。</li>
                  <li><strong>自由調整順序與一題多張解析圖配對</strong>：
                    <ul>
                      <li>可使用上下箭頭按鈕調整題目順序，或直接在欄位內修改題目名稱、科目、章節與解析說明文字。</li>
                      <li>在每題右側的「配對解析圖」區域，可同時點選<strong>多張解析圖片</strong>（例如同時勾選「解析 #2」與「解析 #3」），支援單一題目對應多張詳解圖！</li>
                      <li>亦可使用上方橘色快捷列「一鍵把全部錯題放在指定科目與章節」，瞬間覆寫整批題目的歸屬位置。</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #7C3AED' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', color: 'var(--binder-text-title)' }}>
                  第三階段（步驟 3）：極速卡片審核與「完成一份自動清空」機制
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                  <li>點擊「確認順序與配對，進入極速審核」後，系統會以全幅卡片逐題呈現題目圖、多張解析圖與解析文字。</li>
                  <li><strong>一鍵標記熟悉度</strong>：只需點擊「完全不會」、「過程卡住」或「已經熟練」（或展開選填錯因標籤），系統就會自動跳往下一題；最後一題點選後即會<strong>正式寫入資料庫、錯題索引與各科手帳</strong>。</li>
                  <li><strong>自動清空第一、二階段資料</strong>：工作台右上角預設勾選「完成一份後自動清空第 1、2 階段」。每當您完成一份提詞或考卷配對入庫後，系統會自動清空第一階段的選取範圍與第二階段的圖片／JSON 暫存，讓您能直接無縫接續處理下一份考卷！</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'mastery':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              四維度熟悉度與錯因診斷體系
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              很多錯題本僅記錄「對或錯」，無法反映學習深度的差異。本系統嚴格標準化為四大核心熟悉度指標：
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #10B981', background: 'rgba(16, 185, 129, 0.08)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#047857', fontWeight: 700 }}>「順」 (精熟掌握)</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-body)' }}>
                  題目能迅速看透本質，運算無礙，完全掌握解題核心步驟。
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #F59E0B', background: 'rgba(245, 158, 11, 0.08)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#B45309', fontWeight: 700 }}>「卡」 (過程卡頓)</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-body)' }}>
                  觀念有印象，但某個公式卡住、輔助線想不出來或計算過程受挫。
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #EF4444', background: 'rgba(239, 68, 68, 0.08)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#B91C1C', fontWeight: 700 }}>「不會」 (完全生疏)</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-body)' }}>
                  題目毫無頭緒或題型未曾見過，需要重新回顧課本基礎定義。
                </p>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #DC2626', background: 'rgba(220, 38, 38, 0.08)' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#991B1B', fontWeight: 700 }}>「誤解」 (審題失誤)</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-body)' }}>
                  漏看題目限制條件（如正整數、非負實數等）或將物理情境混淆。
                </p>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--binder-text-title)', marginBottom: '8px' }}>
                獨立多維度錯誤原因標籤：
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--binder-text-muted)', lineHeight: 1.7 }}>
                系統提供「計算粗心」、「觀念模糊」、「審題不清」、「題型生疏」等標籤，亦可於分類管理中為個別學科新增專屬標籤（例如英文的「字彙量不足」、數學的「公式代入錯誤」）。
              </p>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              試卷工坊與雙模式 PDF 列印
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              試卷工坊是 PobiNotes 的一大特色，專為需要用紙筆親手重新作答的學生設計：
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '20px', borderTop: '4px solid #10B981' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#047857', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={18} /> 練習卷模式 (無答案空白重練)
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.7 }}>
                  自動遮蔽答案與解析，僅保留題幹文字與題目圖檔，並在每一題下方自動產生專業的手寫作答留白方框，提供最真實的考試情境。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '20px', borderTop: '4px solid #3B82F6' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#1D4ED8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} /> 解析卷模式 (完整詳解複習)
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--binder-text-body)', lineHeight: 1.7 }}>
                  完整顯示詳細文字解析、板書圖解、熟悉度狀態與錯誤原因標籤，適合在練習後比對訂正或隨身攜帶翻閱。
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '16px 20px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--binder-text-title)' }}>列印小技巧：</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--binder-text-muted)', lineHeight: 1.7 }}>
                點選右上角的「立即列印 / 另存為 PDF」時，請確保瀏覽器列印選項中的**「背景圖形」**已打勾，即可產出色彩飽和、字體清晰的高解析度 A4 文件。
              </p>
            </div>
          </div>
        );

      case 'prompt':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              AI 複習提詞工坊
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              直接將題目丟給 AI 往往只會得到生硬的答案，無法真正幫助吸收。本系統內建針對高中大考研發的思維樹提示詞架構：
            </p>

            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--pobi-blue)', marginBottom: '10px' }}>
                學測自然與數學：思維樹思考架構 Prompt
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--binder-text-body)', lineHeight: 1.75 }}>
                提詞會引導 AI 扮演親切的頂尖名師，遵循「核心觀念提取 -&gt; 題目盲點破譯 -&gt; 思考分岔樹 -&gt; 類題演練」四層架構逐步啟發，絕不直接爆答案，引導同學自己想通！
              </p>
              <div style={{ marginTop: '12px', fontSize: '0.88rem', color: 'var(--binder-text-muted)' }}>
                支援一鍵複製純代碼，可直接貼至 Claude 3.7 / ChatGPT 4o / Google Gemini 等對話視窗中使用。
              </div>
            </div>
          </div>
        );

      case 'structure':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              學科、章節與單元三層架構
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              清晰的目錄架構是檢視學習死角的最有效工具：
            </p>

            <ul style={{ paddingLeft: '22px', fontSize: '0.94rem', color: 'var(--binder-text-body)', lineHeight: 1.85 }}>
              <li><strong>第一層：學科手帳 (Subject)</strong>：如「高中數學甲」、「學測自然科」、「多益核心單字」。</li>
              <li><strong>第二層：章節 (Chapter)</strong>：如「第一單元 多項式函數」、「第二單元 空間向量」。</li>
              <li><strong>第三層：細部單元 (Unit)</strong>：如「1-1 餘式定理綜合變形」、「1-2 根與係數關係」。</li>
            </ul>

            <div className="glass-card" style={{ padding: '16px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--pobi-blue)' }}>自訂輸入模板 (Templates)：</h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.65 }}>
                可為不同學科設計獨一無二的欄位（例如：為物理增加「受力分析圖」與「守恆定律依據」，為英文增加「核心生詞」與「搭配詞例句」）。
              </p>
            </div>
          </div>
        );

      case 'mobile':
        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--binder-text-title)' }}>
              行動裝置左側收折導航與觸控筆支援
            </h2>
            <p style={{ color: 'var(--binder-text-body)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              為了讓同學們在通勤時用手機複習、在書桌前用平板搭配觸控筆做筆記，系統全面提供行動裝置自適應介面：
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--pobi-blue)' }}>手機版左側收折書脊面板</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.65 }}>
                  在手機螢幕上，側邊導覽列會自動收折於螢幕左側邊緣（僅保留精緻書脊圖示），不會遮擋底部閱讀空間；點擊頂部導覽按鈕或左側書脊即可隨時展開完整學科與功能選單。
                </p>
              </div>

              <div className="glass-card" style={{ padding: '18px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--pobi-blue)' }}>iPad / 觸控筆手寫圈選</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--binder-text-muted)', lineHeight: 1.65 }}>
                  圖片標註器具備原生的粗細感壓與多點觸控支援，在平板上可以像真筆一樣在題幹上畫線與標註重點。
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
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--binder-text-title)' }}>
          系統使用導引與功能指南
        </h1>
        <p style={{ color: 'var(--binder-text-muted)', margin: 0, fontSize: '0.94rem' }}>
          掌握數位錯題手帳、3 步驟 AI 考卷批次歸納、外部 AI 協作、四維度熟悉度與試卷工坊的完整操作指南
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="guide-layout-grid" style={{ display: 'grid', gap: '20px', alignItems: 'start' }}>
        {/* Left Side Navigation Menu */}
        <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeTab === section.id;
            return (
              <button
                key={section.id}
                type="button"
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
                  <Icon size={18} style={{ color: isActive ? 'var(--pobi-blue)' : 'var(--binder-text-muted)' }} />
                  <span>{section.title}</span>
                </div>
                {section.badge && (
                  <span style={{
                    fontSize: '0.72rem',
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
        <div className="glass-card" style={{ padding: '28px 32px', minHeight: '560px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
