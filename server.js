const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// HEX形式のCookie名
const USER_COOKIE = "55736572"; // "User"
const PASS_COOKIE = "70617373776f7264"; // "password"
const USERS_FILE = path.join(__dirname, "users.json");

// ユーザーデータ読み込み関数
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch (e) {
    console.error("users.json読み込み失敗:", e);
    return {};
  }
}

// ユーザーデータ保存関数
function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// ハッシュ関数（SHA256, hex出力）
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// トップページ配信
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ログイン処理
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const h_user = hash(username);
  const h_pass = hash(password);

  if (!users[h_user] || users[h_user] !== h_pass) {
    return res.status(401).json({ success: false, message: "ユーザー名またはパスワードが違います" });
  }

  // Cookie用のHEX形式キーとハッシュを返す
  res.json({
    success: true,
    userHex: USER_COOKIE,
    passHex: PASS_COOKIE,
    userHash: h_user,
    passHash: h_pass,
  });
});

// 新規登録処理
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const h_user = hash(username);

  if (users[h_user]) {
    return res.status(409).json({ success: false, message: "このユーザー名はすでに登録されています" });
  }

  users[h_user] = hash(password);
  saveUsers(users);

  res.json({ success: true, message: "登録が完了しました" });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
