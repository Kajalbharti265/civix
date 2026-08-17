import supabase from "../config/supabaseClient.js";

// keyword se category guess karne ke liye
const keywordMap = {
  cement: "cement",
  tmt: "tmt_steel",
  steel: "tmt_steel",
  jcb: "machinery",
  excavator: "machinery",
  crane: "machinery",
  wiring: "plumbing_electrical",
  electric: "plumbing_electrical",
  plumb: "plumbing_electrical",
  pipe: "plumbing_electrical",
  contractor: "contractors",
  labour: "contractors",
  labor: "contractors",
};

const guessCategory = (materialText) => {
  const text = materialText.toLowerCase();
  for (const [kw, cat] of Object.entries(keywordMap)) {
    if (text.includes(kw)) return cat;
  }
  return null;
};

// ---------- POST Site Need (RFQ) ----------
export const postRFQ = async (req, res) => {
  try {
    const { items, city, location, phone } = req.body;
    // items = [{ material: "500 Bags Cement", quantity: "500 Bags" }, { material: "TMT Steel", quantity: "200 bars" }]

    if (!items || !Array.isArray(items) || items.length === 0 || !city || !location || !phone) {
      return res.status(400).json({ message: "At least one item, city, location and phone are required" });
    }

    let customerId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) customerId = userData.user.id;
    }

    // pehla item ka material summary bana lo naam ke liye
    const summaryMaterial = items.map((i) => i.material).join(", ");
    const summaryQuantity = items.map((i) => i.quantity).join(", ");

    // har item ke liye category guess karo aur unke matched vendors combine karo
    const allMatchedVendorIds = new Set();
    const itemsWithCategory = [];

    for (const item of items) {
      const categoryGuess = guessCategory(item.material);
      itemsWithCategory.push({ ...item, category_guess: categoryGuess });

      let matchQuery = supabase.from("vendors").select("id").eq("city", city).eq("is_approved", true);
      if (categoryGuess) matchQuery = matchQuery.eq("category", categoryGuess);
      const { data: matched } = await matchQuery;
      (matched || []).forEach((v) => allMatchedVendorIds.add(v.id));
    }

    // parent RFQ save karo
    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .insert({
        material: summaryMaterial,
        quantity: summaryQuantity,
        city,
        location,
        phone,
        customer_id: customerId,
        matched_vendor_count: allMatchedVendorIds.size,
      })
      .select()
      .single();

    if (rfqError) return res.status(500).json({ message: rfqError.message });

    // har item ko rfq_items table me save karo
    const itemRows = itemsWithCategory.map((i) => ({
      rfq_id: rfq.id,
      material: i.material,
      quantity: i.quantity,
      category_guess: i.category_guess,
    }));
    await supabase.from("rfq_items").insert(itemRows);

    // saare matched vendors ka poora data nikaal lo response ke liye
    let matchedVendors = [];
    if (allMatchedVendorIds.size > 0) {
      const { data: fullVendors } = await supabase
        .from("vendors")
        .select("*")
        .in("id", Array.from(allMatchedVendorIds));
      matchedVendors = fullVendors || [];
    }

    res.status(201).json({
      message: `Requirement posted! ${matchedVendors.length} nearby vendor(s) matched and notified.`,
      rfq,
      items: itemsWithCategory,
      matched_vendors: matchedVendors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// ---------- GET my RFQ history (protected) ----------
export const getMyRFQs = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const { data, error } = await supabase
      .from("rfqs")
      .select("*")
      .eq("customer_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json({ count: data.length, rfqs: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};