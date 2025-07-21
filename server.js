const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const COOKIE_USER = "55736572";
const COOKIE_PASS = "70617373776f7264";
const USERS_FILE = path.join(__dirname, "users.json");

// ユーザー読み込み
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch {
    return {};
  }
}

// 保存
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ルート
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ログイン（ハッシュ済みの値を受け取る前提）
app.post("/login", (req, res) => {
  const { username, password } = req.body; // すでにSHA-256ハッシュ済み
  const users = loadUsers();

  if (!users[username] || users[username].password !== password) {
    return res.status(401).json({ success: false, message: "ユーザー名かパスワードが違う" });
  }

  res.json({ success: true, message: "ログイン成功", username, secret: users[username].secret });
});

// 自動ログイン（Cookie内のハッシュと比較）
app.post("/auto-login", (req, res) => {
  const { userHash, passHash } = req.body;
  const users = loadUsers();

  if (users[userHash] && users[userHash].password === passHash) {
    return res.json({ success: true, username: "ユーザー", secret: users[userHash].secret });
  }

  res.status(401).json({ success: false });
});

// 新規登録（ハッシュ済みの値をそのまま保存）
app.post("/register", (req, res) => {
  const { username, password, secret } = req.body;

  if (!username || !password || !secret) {
    return res.status(400).json({ success: false, message: "すべての項目を入力してください" });
  }

  const users = loadUsers();

  if (users[username]) {
    return res.status(409).json({ success: false, message: "そのユーザー名はすでに存在します" });
  }

  users[username] = {
    password: password, // 既にハッシュ済み
    secret: secret,
  };

  saveUsers(users);

  res.json({ success: true, message: "登録成功" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
