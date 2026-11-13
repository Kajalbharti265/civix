import supabase from "../config/supabaseClient.js";

// ---------- POST review (login + delivered order zaroori) ----------
export const addReview = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { order_id, comment = "" } = req.body;
    const rating = Number(req.body.rating);

    if (!order_id) return res.status(400).json({ message: "order_id is required" });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, customer_id, vendor_id, status")
      .eq("id", order_id)
      .maybeSingle();

    if (!order || order.customer_id !== req.authUserId) {
      return res.status(403).json({ message: "You can only review your own orders" });
    }
    if (order.vendor_id !== vendorId) {
      return res.status(400).json({ message: "This order is not with this vendor" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "You can review only after the order is delivered" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", req.authUserId)
      .maybeSingle();

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        vendor_id: vendorId,
        order_id,
        customer_id: req.authUserId,
        customer_name: profile?.name || "Customer",
        rating,
        comment: String(comment).trim().slice(0, 300),
      })
      .select("id, rating, comment, customer_name, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ message: "You have already reviewed this order" });
      }
      return res.status(500).json({ message: error.message });
    }

    // vendor ki average rating dobara nikalo
    const { data: all } = await supabase.from("reviews").select("rating").eq("vendor_id", vendorId);
    const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length;
    await supabase.from("vendors").update({ rating: Math.round(avg * 10) / 10 }).eq("id", vendorId);

    res.status(201).json({ message: "Thanks! Your review is live.", review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET reviews (public, phone number kabhi nahi bhejte) ----------
export const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { data, error } = await supabase
      .from("reviews")
      .select("id, customer_name, rating, comment, created_at, order_id")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    const reviews = data.map(({ order_id, ...r }) => ({ ...r, verified: !!order_id }));
    res.json({ count: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};