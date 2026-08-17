import express from "express";
import { addReview, getVendorReviews } from "../controllers/reviewController.js";

const router = express.Router({ mergeParams: true });

router.post("/", addReview);
router.get("/", getVendorReviews);

export default router;