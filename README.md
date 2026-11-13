# PobiNotes ver3 - 活頁手帳風線上錯題本與數位書架系統

PobiNotes ver3 是一個結合實體活頁手帳質感（Skeuomorphic Stationery）與科學化錯題診斷的現代化線上系統。採用 React + Vite + TypeScript 前端與 Cloudflare Pages Functions + D1 + R2 無伺服器架構，支援多維度知識管理、數位書架、錯題手帳、大考題卷批次裁切匯入、自訂錯因標籤、純程式碼 AI 複習提詞生成與雙模式試卷工坊 PDF 匯出。

---

## ver3 核心亮點

1. 數位書架與活頁手帳體驗：
   - 包含我的數位書架（Bookshelf View）與各學科專屬錯題手帳（Notebook Open View），具備黃銅活頁環、裝訂線、側邊書脊索引導航。
   - 淺色模式採用溫潤柔和的經典米黃書頁紙張（Warm Cream / Ivory `#FAF6ED`）與手帳格線，告別冰冷死白的 AI 模板感。
   - 支援深色皮革模式切換，全站文字皆經高對比無障礙調校。

2. 嚴格帳號安全與權限系統：
   - 取消訪客模式，落實使用者資料隔離。
   - 支援標準帳號密碼註冊、登入與首位管理員註冊驗證，採用 Web Crypto API (PBKDF2/SHA-256) 與 JWT Cookie。

3. 學科、章節與單元三層結構：
   - 支援即時新增學科手帳、章節與細部單元，架構清楚且具備科目連動。

4. 獨立錯因標籤與熟悉度四維度：
   - 固定四維度熟悉度：順、卡、不會、誤解。
   - 支援設定通用錯因與自訂標籤，自動關聯統計。

5. 試卷工坊與雙模式 PDF 匯出：
   - 支援練習卷（僅題目）與解析卷（含完整圖文詳解）高解析度列印。

6. 大考題卷批次辨識與圖片標註裁切：
   - 內建圖片旋轉、紅筆圈記、螢光筆標註與即時儲存。

---

## 本地測試步驟 (Localhost Testing)

請依照以下三個步驟，在本地端以 localhost 啟動並測試完整功能：

### 步驟 1：初始化本地 D1 資料庫
在專案根目錄下開啟 PowerShell 或終端機，執行以下指令將 SQL 結構表寫入本地 D1 模擬器：
```bash
npx wrangler d1 execute mistake-notebook-db --local --file=./db/schema.sql
```
> 執行此步驟後，Wrangler 會在本地建立 `.wrangler/state/v3/d1` 目錄來儲存資料庫檔案。

### 步驟 2：啟動前端 Vite 開發伺服器
在第一個終端機視窗中，啟動 Vite 前端伺服器（預設運行在 `http://localhost:5173`）：
```bash
npm run dev
```

### 步驟 3：啟動 Wrangler Pages 後端模擬與代理
在第二個終端機視窗中，啟動 Cloudflare Pages 後端 Functions 模擬器，並將前端請求代理至 Vite：
```bash
npx wrangler pages dev --port=8788 --proxy=http://localhost:5173
```
> 此時，Wrangler 會在 `http://localhost:8788` 啟動整合後的伺服器。
> 請在瀏覽器中直接開啟 `http://localhost:8788` 來進行測試。

---

## 部署到 Cloudflare (Cloudflare Production Deployment)

當您在本地測試完成後，可以透過以下步驟部署至雲端：

### 1. 建立雲端 D1 資料庫與 R2 儲存桶
登入您的 Cloudflare 控制台，前往以下頁面建立資源：
- D1 資料庫：建立一個名為 `mistake-notebook-db` 的資料庫，並複製其 `database_id`。
- R2 儲存桶：建立一個名為 `mistake-notebook-bucket` 的儲存桶。

### 2. 更新資料庫 id
將 `wrangler.json` 中的 `database_id` 替換成您剛剛建立的雲端 D1 資料庫 ID：
```json
{
  "database_id": "您雲端的-D1-database-id"
}
```

### 3. 在 Cloudflare 執行雲端資料庫初始化
執行以下指令將結構表建立在雲端的 D1 資料庫中：
```bash
npx wrangler d1 execute mistake-notebook-db --remote --file=./db/schema.sql
```

### 4. 部署專案至 Cloudflare Pages
在 Cloudflare 控制台 -> Workers & Pages -> Create an application -> Pages 中，連結您的 GitHub 專案 `Jimmy0910/PobiNotes-ver3`：
- Build command: `npm run build`
- Build output directory: `dist`
- 環境變數 (Environment Variables)：在 Pages 設定中，新增變數 `JWT_SECRET`，填入您自訂的隨機安全金鑰字串。
- 綁定設定 (Bindings)：在 Pages 的 Settings -> Functions 中，新增以下兩個 Bindings：
  1. D1 database binding: 綁定名稱為 `DB`，選擇您的 `mistake-notebook-db`。
  2. R2 bucket binding: 綁定名稱為 `BUCKET`，選擇您的 `mistake-notebook-bucket`。

重新觸發部署後，您的線上錯題本網站便已成功上線。
