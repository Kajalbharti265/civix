import express from "express";
import { addReview, getVendorReviews } from "../controllers/reviewController.js";
import { requireUserAuth } from "../middleware/userAuth.js";

const router = express.Router({ mergeParams: true });

router.get("/", getVendorReviews);
router.post("/", requireUserAuth, addReview);

export default router;