import express from "express";
import { postRFQ } from "../controllers/rfqController.js";

const router = express.Router();

router.post("/", postRFQ);

export default router;