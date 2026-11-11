import express from "express";
import {
  getOpenRFQsForVendor, submitQuote, getQuotesForRFQ, acceptQuote,
} from "../controllers/quoteController.js";
import { requireUserAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.get("/vendor/open-rfqs", requireUserAuth, getOpenRFQsForVendor);
router.post("/rfq/:rfqId", requireUserAuth, submitQuote);
router.get("/rfq/:rfqId", requireUserAuth, getQuotesForRFQ);
router.post("/accept/:quoteId", requireUserAuth, acceptQuote);

export default router;