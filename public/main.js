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

// Base32 → HEX 変換
function base32toHex(base32) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";

  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    bits += val.toString(2).padStart(5, "0");
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.substr(i, 4), 2).toString(16);
  }

  return hex;
}

// TOTP生成関数
function generateTOTP(secret) {
  const key = base32toHex(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / 30).toString(16).padStart(16, "0");

  const shaObj = new jsSHA("SHA-1", "HEX");
  shaObj.setHMACKey(key, "HEX");
  shaObj.update(time);
  const hmac = shaObj.getHMAC("HEX");

  const offset = parseInt(hmac.substring(hmac.length - 1), 16);
  const binary = parseInt(hmac.substr(offset * 2, 8), 16) & 0x7fffffff;
  const otp = binary % 1000000;

  return otp.toString().padStart(6, "0");
}

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
    const code = generateTOTP(secret);
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
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      alert("レスポンスがJSONではありません: " + text);
      return;
    }

    if (res.ok && data.success) {
      setCookie(COOKIE_USER, userHash, 1200);
      setCookie(COOKIE_PASS, passHash, 1200);
      show2FACode(data.secret, username);
    } else {
      alert(data.message || "ログインに失敗しました");
    }
  } catch (e) {
    alert("fetchエラー: " + e.message);
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
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      alert("レスポンスがJSONではありません: " + text);
      return;
    }

    if (res.ok && data.success) {
      alert("登録完了しました。ログインしてください。");
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      showRegisterBtn.style.display = "inline-block";
    } else {
      alert(data.message || "登録に失敗しました");
    }
  } catch (e) {
    alert("fetchエラー: " + e.message);
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
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        eraseCookie(COOKIE_USER);
        eraseCookie(COOKIE_PASS);
        return;
      }

      if (res.ok && data.success) {
        show2FACode(data.secret || "SECRET_MISSING", data.username || "ユーザー");
      } else {
        eraseCookie(COOKIE_USER);
        eraseCookie(COOKIE_PASS);
      }
    } catch (e) {
      eraseCookie(COOKIE_USER);
      eraseCookie(COOKIE_PASS);
    }
  }
});
