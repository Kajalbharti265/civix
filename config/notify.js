import axios from "axios";
import supabase from "./supabaseClient.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function sendEmail({ to, subject, text, link }) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL || !to) return; // email band hai
  const base = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: process.env.BREVO_SENDER_NAME || "Civix", email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px">
          <h2 style="margin:0 0 8px">${esc(subject)}</h2>
          <p style="color:#4C5A68">${esc(text)}</p>
          <p><a href="${esc(base + link)}" style="background:#FF5A1F;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open on Civix</a></p>
        </div>`,
      },
      { headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" }, timeout: 8000 }
    );
  } catch (err) {
    console.error("Email failed:", err.response?.data || err.message);
  }
}

// kabhi throw nahi karta, isliye quote/order ka flow kabhi nahi tootega
export async function notify({ userId, email = null, type, title, body = "", link = "" }) {
  if (!userId) return;
  try {
    await supabase.from("notifications").insert({ user_id: userId, type, title, body, link });
    let to = email;
    if (!to) {
      const { data } = await supabase.auth.admin.getUserById(userId);
      to = data?.user?.email || null;
    }
    await sendEmail({ to, subject: title, text: body, link });
  } catch (err) {
    console.error("notify failed:", err.message);
  }
}