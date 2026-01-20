# LOL Summoner Spell Tracker

**League of Legends 召喚師技能追蹤器** —— 專為 iPhone 16 Pro Max 優化的多設備即時同步應用。

## ✨ 功能特點

- 🎯 **5x3 網格佈局**：追蹤 TOP、JG、MID、AD、SUP 五個位置的召喚師技能
- ⏱️ **智能冷卻計時**：點擊技能開始倒數，視覺化敵方脆弱期
- 🔄 **即時多設備同步**：使用 Firebase 實現跨設備即時狀態更新
- 📱 **iOS 優化**：100dvh 佈局，獨立模式支援，Wake Lock 防止螢幕休眠
- 🔊 **音效提醒**：30 秒警告音 + 技能就緒音
- ⚡ **加速符文計算**：支援艾歐尼亞靴 (+10) 和星界洞悉 (+18) 同時使用
- 🎨 **高對比視覺**：冷卻期間以亮黃色大字顯示剩餘秒數，強調進攻時機

## 📦 安裝步驟

### 1. Firebase 設定

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案或使用現有專案
3. 啟用 **Realtime Database**
4. 設定安全規則（開發階段可用）：

```json
{
  "rules": {
    "sessions": {
      ".read": true,
      ".write": true
    }
  }
}
```

5. 取得 Firebase 配置資訊：
   - 專案設定 → 一般 → 你的應用程式 → Firebase SDK 程式碼片段
6. 將配置貼到 `firebase-config.js`：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. 音效檔案（選用）

專案包含基礎的生成音效。如果你想使用自訂音效：

1. 準備兩個音效檔案：
   - `sounds/warning.mp3` - 30 秒警告音
   - `sounds/ready.mp3` - 技能就緒音
2. 替換 `sounds/` 資料夾中的檔案

### 3. 本地測試

啟動本地伺服器：

```bash
npx http-server -p 8080
```

在瀏覽器開啟 `http://localhost:8080`

### 4. 部署到 iPhone

#### 方法 A：使用 GitHub Pages / Vercel / Netlify

1. 將專案上傳到 GitHub
2. 啟用 GitHub Pages 或部署到 Vercel/Netlify
3. 在 iPhone Safari 開啟部署的 URL

#### 方法 B：本地網路

1. 確保手機和電腦在同一 Wi-Fi
2. 找到電腦 IP 位址（例如 `192.168.1.100`）
3. 在 iPhone Safari 開啟 `http://192.168.1.100:8080`

#### 加入主畫面（獨立模式）

1. 在 Safari 開啟應用
2. 點擊「分享」按鈕 (底部中間)
3. 選擇「加入主畫面」
4. 命名為「LOL Spell Tracker」
5. 從主畫面啟動應用（無位址欄，完整螢幕體驗）

## 🎮 使用方式

### 基本操作

1. **開始對局**：點擊「開始對局」解鎖音訊（iOS 要求）
2. **點擊技能**：當敵人使用技能時，點擊對應按鈕開始倒數
3. **查看計時**：紅色覆蓋層 + 黃色大字顯示剩餘秒數（這是進攻時機！）
4. **長按重置**：長按 2 秒重置技能狀態

### 設定功能

1. 點擊「⚙️ 設定」
2. **更換技能 1**：選擇位置 → 點擊技能圖示
3. **加速符文**：勾選艾歐尼亞靴和/或星界洞悉
4. 點擊「套用設定」

### 召喚師技能冷卻時間

| 技能 | 基礎冷卻 | +10 加速 | +28 加速 (兩個符文) |
|------|---------|----------|---------------------|
| Flash (閃現) | 300s | 273s | 234s |
| Teleport (傳送) | 360s | 327s | 281s |
| Ignite (點燃) | 180s | 164s | 141s |
| Exhaust (虛弱) | 210s | 191s | 164s |
| Ghost (疾跑) | 240s | 218s | 188s |
| Heal (治療) | 240s | 218s | 188s |
| Barrier (屏障) | 180s | 164s | 141s |
| Cleanse (淨化) | 210s | 191s | 164s |
| Smite (懲戒) | 15s | 14s | 12s |

**公式**：實際冷卻 = 基礎冷卻 × (100 / (100 + 總加速))

## 🔧 技術細節

- **前端**：純 HTML + Tailwind CSS (CDN) + Vanilla JavaScript
- **後端**：Firebase Realtime Database
- **API**：Riot Data Dragon CDN (技能圖示)
- **瀏覽器 API**：
  - `Wake Lock API` - 防止螢幕休眠
  - `Web Audio API` - 音效播放
  - `100dvh` - iOS Safari 視窗高度
  - `Standalone Mode` - iOS PWA 模式

## 📱 響應式設計

- **主要目標**：iPhone 16 Pro Max (430×932)
- **支援設備**：所有現代智慧型手機
- **自適應**：字體大小、圖示尺寸、間距根據螢幕寬度調整

## 🐛 疑難排解

### 音效無法播放
- 確認已點擊「開始對局」按鈕
- iOS Safari 需要用戶互動才能播放音訊

### 多設備不同步
- 檢查 Firebase 配置是否正確
- 確認兩台設備連接網路
- 查看瀏覽器主控台的錯誤訊息

### Wake Lock 無效
- Wake Lock API 僅在 HTTPS 或 localhost 可用
- 部分瀏覽器可能不支援（需檢查兼容性）

### 技能圖示載入失敗
- 檢查網路連線
- Riot Data Dragon CDN 可能暫時無法使用
- 可考慮下載圖示到本地

## 📄 授權

本專案僅供學習和個人使用。League of Legends 及相關資產版權歸 Riot Games 所有。

---

**Enjoy tracking and dominating your games! 🎮⚔️**
