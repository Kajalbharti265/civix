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
    const { material, quantity, city, location, phone } = req.body;
    if (!material || !quantity || !city || !location || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const categoryGuess = guessCategory(material);

    // matching vendors dhoondo (same city, +category agar guess mila)
    let matchQuery = supabase
      .from("vendors")
      .select("*")
      .eq("city", city)
      .eq("is_approved", true);

    if (categoryGuess) matchQuery = matchQuery.eq("category", categoryGuess);

    const { data: matchedVendors, error: matchError } = await matchQuery;
    if (matchError) return res.status(500).json({ message: matchError.message });

    // RFQ save karo DB me
    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .insert({
        material,
        quantity,
        city,
        location,
        phone,
        category_guess: categoryGuess,
        matched_vendor_count: matchedVendors.length,
      })
      .select()
      .single();

    if (rfqError) return res.status(500).json({ message: rfqError.message });

    res.status(201).json({
      message: `Requirement posted! ${matchedVendors.length} nearby vendor(s) matched and notified.`,
      rfq,
      matched_vendors: matchedVendors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};