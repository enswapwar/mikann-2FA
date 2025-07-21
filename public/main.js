// DOM取得
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const codeDisplay = document.getElementById("code-display");

// クッキー名定義（hex表記）
const cookieUserKey = "55736572"; // User
const cookiePassKey = "70617373776f7264"; // password

// ハッシュ化関数
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// クッキー読み取り
function getCookie(name) {
  const match = document.cookie.match(new RegExp(name + "=([^;]+)"));
  return match ? match[1] : null;
}

// 自動ログイン試行
window.addEventListener("DOMContentLoaded", async () => {
  const userHash = getCookie(cookieUserKey);
  const passHash = getCookie(cookiePassKey);
  if (userHash && passHash) {
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userHash, passHash })
      });
      const data = await res.json();
      if (data.code) {
        loginForm.style.display = "none";
        registerForm.style.display = "none";
        codeDisplay.textContent = `2FAコード: ${data.code}`;
      }
    } catch (e) {
      console.error("自動ログイン失敗:", e);
    }
  }
});

// ログイン処理
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const userHash = await hashText(username);
  const passHash = await hashText(password);

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userHash, passHash })
  });
  const data = await res.json();

  if (data.code) {
    document.cookie = `${cookieUserKey}=${userHash}; max-age=1200`;
    document.cookie = `${cookiePassKey}=${passHash}; max-age=1200`;
    loginForm.style.display = "none";
    registerForm.style.display = "none";
    codeDisplay.textContent = `2FAコード: ${data.code}`;
  } else {
    alert("ユーザー名またはパスワードが違います。");
  }
});

// 新規登録処理
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const secret = document.getElementById("register-secret").value;

  const userHash = await hashText(username);
  const passHash = await hashText(password);

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userHash, passHash, secret })
  });

  const data = await res.json();

  if (data.success) {
    alert("登録完了。ログインしてください。");
  } else {
    alert("登録に失敗しました。既に存在するユーザーかもしれません。");
  }
});
