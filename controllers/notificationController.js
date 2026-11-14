import supabase from "../config/supabaseClient.js";

export const listNotifications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.authUserId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ notifications: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const unreadCount = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.authUserId)
      .eq("is_read", false);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ unread: count || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markRead = async (req, res) => {
  try {
    await supabase.from("notifications").update({ is_read: true })
      .eq("id", req.params.id).eq("user_id", req.authUserId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", req.authUserId).eq("is_read", false);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};