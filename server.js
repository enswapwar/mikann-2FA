const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ユーザー情報のJSONファイル
const USERS_FILE = path.join(__dirname, 'users.json');

// ユーザーデータの読み込み
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

// ハッシュ化関数（SHA256）
function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ログインAPI
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const hashedUser = hash(username);
  const hashedPass = hash(password);

  if (users[hashedUser] && users[hashedUser].password === hashedPass) {
    res.cookie('55736572', hashedUser, { maxAge: 20 * 60 * 1000 }); // User
    res.cookie('70617373776f7264', hashedPass, { maxAge: 20 * 60 * 1000 }); // Password
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'ユーザー名またはパスワードが間違っています。' });
  }
});

// 登録API
app.post('/api/register', (req, res) => {
  const { username, password, secret } = req.body;
  const users = loadUsers();
  const hashedUser = hash(username);
  const hashedPass = hash(password);

  if (users[hashedUser]) {
    return res.status(409).json({ success: false, message: 'すでに登録されています。' });
  }

  users[hashedUser] = {
    password: hashedPass,
    secret
  };

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.status(201).json({ success: true });
});

// index.htmlをルートで返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
