const COOKIE_USER = "55736572";
const COOKIE_PASS = "70617373776f7264";

let secret = "";
let intervalID = null;

window.onload = () => {
  const userHash = Cookies.get(COOKIE_USER);
  const passHash = Cookies.get(COOKIE_PASS);
  if (userHash && passHash) {
    loginToServer(userHash, passHash, true);
  }
};

document.getElementById("login-btn").addEventListener("click", () => {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (!user || !pass) {
    alert("両方入れろ");
    return;
  }

  const userHash = CryptoJS.SHA256(user).toString();
  const passHash = CryptoJS.SHA256(pass).toString();

  Cookies.set(COOKIE_USER, userHash, { expires: 1 / 72 });
  Cookies.set(COOKIE_PASS, passHash, { expires: 1 / 72 });

  loginToServer(userHash, passHash, false);
});

function loginToServer(userHash, passHash, auto) {
  fetch("https://your-render-backend.onrender.com/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: userHash, pass: passHash })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.secret) {
        secret = data.secret;
        showCodeScreen();
      } else {
        if (!auto) alert("ユーザー名またはパスワードが間違っています");
        Cookies.remove(COOKIE_USER);
        Cookies.remove(COOKIE_PASS);
      }
    })
    .catch(err => {
      console.error("通信エラー:", err);
      alert("サーバーに接続できませんでした");
    });
}

function showCodeScreen() {
  document.getElementById("login-box").classList.remove("visible");
  document.getElementById("code-box").classList.add("visible");

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/otplib@12.0.1/otplib-browser.min.js";
  script.onload = startTOTP;
  document.head.appendChild(script);
}

function startTOTP() {
  if (!secret) return;

  if (intervalID) clearInterval(intervalID);

  intervalID = setInterval(() => {
    const epoch = Math.floor(Date.now() / 1000);
    const remaining = 30 - (epoch % 30);
    const code = otplib.authenticator.generate(secret);

    document.getElementById("code").innerText = code;
    document.getElementById("countdown").innerText = "残り: " + remaining + " 秒";
  }, 1000);
}
