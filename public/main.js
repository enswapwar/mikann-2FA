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
      show2FACode(username);
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

// 2FAコード表示（仮）
function show2FACode(username) {
  loginForm.style.display = "none";
  registerForm.style.display = "none";
  showRegisterBtn.style.display = "none";
  codeDisplay.style.display = "block";
  codeDisplay.textContent = `ようこそ ${username} さん。2FAコード表示は未実装。`;
}

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
        show2FACode(data.username || "ユーザー");
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
