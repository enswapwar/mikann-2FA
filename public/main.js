// ハッシュ関数（SHA-256）
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// DOM Elements
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const codeDisplay = document.getElementById("code-display");
const showRegisterBtn = document.getElementById("show-register");
const cancelRegisterBtn = document.getElementById("cancel-register");
const loginButton = document.getElementById("login-button");
const registerButton = document.getElementById("register-button");

// Cookie名（HEX）
const COOKIE_USER = "55736572";
const COOKIE_PASS = "70617373776f7264";

// Cookie操作
function setCookie(name, value, maxAgeSec) {
  document.cookie = `${name}=${value}; max-age=${maxAgeSec}; path=/`;
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp(name + "=([^;]+)"));
  return match ? match[1] : null;
}
function eraseCookie(name) {
  document.cookie = `${name}=; max-age=0; path=/`;
}

// jsOTPのインスタンス生成（CDNで読み込んでいる想定）
const totp = new jsOTP.totp();

let timerId = null;

// UI切替
showRegisterBtn.addEventListener("click", () => {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  codeDisplay.style.display = "none";
  showRegisterBtn.style.display = "none";
});

cancelRegisterBtn.addEventListener("click", () => {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  codeDisplay.style.display = "none";
  showRegisterBtn.style.display = "inline-block";
});

// 2FAコード表示＋残秒数表示
function show2FACode(secret, username) {
  if (timerId) clearInterval(timerId);

  loginForm.style.display = "none";
  registerForm.style.display = "none";
  showRegisterBtn.style.display = "none";
  codeDisplay.style.display = "block";

  function updateCode() {
    const code = totp.getOtp(secret);
    const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    codeDisplay.textContent = `ようこそ ${username} さん。2FAコード: ${code} （残り ${remaining} 秒）`;
  }

  updateCode();
  timerId = setInterval(updateCode, 1000);
}

// ログイン処理
loginButton.addEventListener("click", async () => {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!username || !password) {
    alert("ユーザー名とパスワードを入力してください");
    return;
  }

  const userHash = await hashText(username);
  const passHash = await hashText(password);

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setCookie(COOKIE_USER, userHash, 1200);
      setCookie(COOKIE_PASS, passHash, 1200);
      // ここでサーバーからsecretを受け取る想定
      show2FACode(data.secret, username);
    } else {
      alert(data.message || "ログインに失敗しました");
    }
  } catch (e) {
    alert("通信エラー");
  }
});

// 新規登録処理
registerButton.addEventListener("click", async () => {
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const secret = document.getElementById("register-secret").value.trim();

  if (!username || !password || !secret) {
    alert("全ての項目を入力してください");
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, secret }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert("登録完了しました。ログインしてください。");
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      showRegisterBtn.style.display = "inline-block";
    } else {
      alert(data.message || "登録に失敗しました");
    }
  } catch (e) {
    alert("通信エラー");
  }
});

// 自動ログイン処理
window.addEventListener("DOMContentLoaded", async () => {
  const userHash = getCookie(COOKIE_USER);
  const passHash = getCookie(COOKIE_PASS);
  if (userHash && passHash) {
    try {
      const res = await fetch("/auto-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userHash, passHash }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // サーバーからsecretを受け取る想定があればここで
        show2FACode(data.secret || "SECRET_MISSING", data.username || "ユーザー");
      } else {
        eraseCookie(COOKIE_USER);
        eraseCookie(COOKIE_PASS);
      }
    } catch {
      eraseCookie(COOKIE_USER);
      eraseCookie(COOKIE_PASS);
    }
  }
});
