import supabase from "../config/supabaseClient.js";

export const getCatalog = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, category, name, unit")
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    if (error) return res.status(500).json({ message: error.message });
    res.json({ count: data.length, products: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};