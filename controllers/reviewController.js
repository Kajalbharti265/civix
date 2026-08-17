import supabase from "../config/supabaseClient.js";

// ---------- POST a review ----------
export const addReview = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { customer_name, customer_phone, rating, comment } = req.body;

    if (!customer_name || !customer_phone || !rating) {
      return res.status(400).json({ message: "Name, phone and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({ vendor_id: vendorId, customer_name, customer_phone, rating, comment })
      .select()
      .single();

    if (reviewError) return res.status(500).json({ message: reviewError.message });

    // average rating nikaal ke vendor table update karo
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("vendor_id", vendorId);

    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await supabase
      .from("vendors")
      .update({ rating: Math.round(avg * 10) / 10 })
      .eq("id", vendorId);

    res.status(201).json({ message: "Review added", review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET reviews for a vendor ----------
export const getVendorReviews = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json({ count: data.length, reviews: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};