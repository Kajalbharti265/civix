import supabase from "../config/supabaseClient.js";

const CITIES = ["Indore", "Bhopal", "Jabalpur", "Gwalior"];

// free-text item ke liye category ka andaza (catalog se chuna item ho to iski zaroorat nahi)
const keywordMap = {
  cement: "cement",
  tmt: "tmt_steel",
  steel: "tmt_steel",
  sariya: "tmt_steel",
  saria: "tmt_steel",
  jcb: "machinery",
  poclain: "machinery",
  excavator: "machinery",
  crane: "machinery",
  wiring: "plumbing_electrical",
  electric: "plumbing_electrical",
  plumb: "plumbing_electrical",
  pipe: "plumbing_electrical",
  contractor: "contractors",
  mistri: "contractors",
  mason: "contractors",
  labour: "contractors",
  labor: "contractors",
};

const guessCategory = (text) => {
  const t = String(text).toLowerCase();
  for (const [kw, cat] of Object.entries(keywordMap)) {
    if (t.includes(kw)) return cat;
  }
  return null;
};

// ---------- POST Site Need (login zaroori, route me requireUserAuth laga hai) ----------
export const postRFQ = async (req, res) => {
  try {
    const { items, city, location, phone } = req.body;

    if (!Array.isArray(items) || items.length === 0 || !city || !location || !phone) {
      return res.status(400).json({ message: "At least one item, city, location and phone are required" });
    }
    if (items.length > 20) {
      return res.status(400).json({ message: "Maximum 20 items per requirement" });
    }
    if (!CITIES.includes(city)) {
      return res.status(400).json({ message: "Please select a valid city" });
    }
    if (!/^[0-9]{10}$/.test(String(phone))) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
    }

    // catalog wale items ko ek hi query me verify karo
    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
    let productMap = {};
    if (productIds.length) {
      const { data: products } = await supabase
        .from("products")
        .select("id, category, name, unit")
        .in("id", productIds);
      productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));
    }

    const cleaned = [];
    for (const raw of items) {
      const product = productMap[raw.product_id] || null;
      const material = String(product ? product.name : raw.material || "").trim().slice(0, 120);
      const qty = Number(raw.qty);
      const unit = String(raw.unit || (product ? product.unit : "")).trim().slice(0, 20);

      if (!material || !(qty > 0) || !unit) {
        return res.status(400).json({ message: "Each item needs a name, a quantity above 0 and a unit" });
      }
      cleaned.push({
        product_id: product ? product.id : null,
        material,
        qty,
        unit,
        quantity: `${qty} ${unit}`,
        category_guess: product ? product.category : guessCategory(material),
      });
    }

    // us city ke approved vendors me se jinki category kisi item se match kare
    const { data: cityVendors, error: vendorError } = await supabase
      .from("vendors")
      .select("id, company_name, category, auth_user_id, email")
      .eq("city", city)
      .eq("is_approved", true);
    if (vendorError) return res.status(500).json({ message: vendorError.message });

    const matched = cityVendors.filter((v) =>
      cleaned.some((i) => !i.category_guess || i.category_guess === v.category)
    );

    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .insert({
        material: cleaned.map((i) => i.material).join(", "),
        quantity: cleaned.map((i) => i.quantity).join(", "),
        city,
        location: String(location).trim(),
        phone,
        customer_id: req.authUserId,
        category_guess: cleaned[0].category_guess,
        matched_vendor_count: matched.length,
        status: "open",
      })
      .select()
      .single();
    if (rfqError) return res.status(500).json({ message: rfqError.message });

    const { error: itemsError } = await supabase
      .from("rfq_items")
      .insert(cleaned.map((i) => ({ rfq_id: rfq.id, ...i })));

    if (itemsError) {
      await supabase.from("rfqs").delete().eq("id", rfq.id); // adhura RFQ mat chhodo
      return res.status(500).json({ message: itemsError.message });
    }
        matched.slice(0, 50).forEach((v) =>
      notify({
        userId: v.auth_user_id,
        email: v.email,
        type: "rfq_new",
        title: `New requirement in ${city}`,
        body: `${cleaned.map((i) => `${i.material} (${i.quantity})`).join(", ")} · ${String(location).trim()}`,
        link: "/vendor-quotes.html",
      })
    );

    res.status(201).json({
      message: `Requirement posted! ${matched.length} nearby vendor(s) can now see it and send quotes.`,
      rfq,
      matched_vendor_count: matched.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- GET my RFQ history ----------
export const getMyRFQs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("rfqs")
      .select("*, rfq_items(material, quantity), quotes(count)")
      .eq("customer_id", req.authUserId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json({ count: data.length, rfqs: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};