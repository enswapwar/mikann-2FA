const COOKIE_USER = "55736572";
const COOKIE_PASS = "70617373776f7264";

window.onload = () => {
  const userHash = Cookies.get(COOKIE_USER);
  const passHash = Cookies.get(COOKIE_PASS);
  if (userHash && passHash) {
    showCodeScreen();
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

  showCodeScreen();
});

function showCodeScreen() {
  document.getElementById("login-box").classList.remove("visible");
  document.getElementById("code-box").classList.add("visible");
}
