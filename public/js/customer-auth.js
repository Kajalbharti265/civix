let mode = "login"; // or "signup"

const $ = (s) => document.querySelector(s);

function updateUI() {
  if (mode === "login") {
    $("#formTitle").textContent = "Login";
    $("#formSub").textContent = "Welcome back";
    $("#submitBtn").textContent = "Login";
    $("#switchText").textContent = "Don't have an account?";
    $("#switchLink").textContent = "Sign up";
    $("#signupFields").hidden = true;
  } else {
    $("#formTitle").textContent = "Create Account";
    $("#formSub").textContent = "Join Civix as a customer";
    $("#submitBtn").textContent = "Sign Up";
    $("#switchText").textContent = "Already have an account?";
    $("#switchLink").textContent = "Login";
    $("#signupFields").hidden = false;
  }
  $("#errBox").hidden = true;
  $("#okBox").hidden = true;
}

$("#switchLink").addEventListener("click", () => {
  mode = mode === "login" ? "signup" : "login";
  updateUI();
});

$("#submitBtn").addEventListener("click", async () => {
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const errBox = $("#errBox");
  const okBox = $("#okBox");
  errBox.hidden = true;
  okBox.hidden = true;

  if (mode === "login") {
    const res = await fetch("/api/auth/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errBox.textContent = data.message || "Login failed";
      errBox.hidden = false;
      return;
    }
    localStorage.setItem("civix_customer_token", data.session?.access_token || "");
    localStorage.setItem("civix_customer_name", data.user.name);
    window.location.href = "/";
  } else {
    const name = $("#name").value.trim();
    const phone = $("#phone").value.trim();
    const city = $("#city").value;

    const res = await fetch("/api/auth/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone, city }),
    });
    const data = await res.json();
    if (!res.ok) {
      errBox.textContent = data.message || "Signup failed";
      errBox.hidden = false;
      return;
    }
    okBox.textContent = "Account created! You can now login.";
    okBox.hidden = false;
    mode = "login";
    setTimeout(updateUI, 1200);
  }
});

updateUI();