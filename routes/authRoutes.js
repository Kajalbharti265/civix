import express from "express";
import {
  registerUser, loginUser,
  registerVendor, loginVendor,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/user/register", registerUser);
router.post("/user/login", loginUser);
router.post("/vendor/register", registerVendor);
router.post("/vendor/login", loginVendor);
router.post("/forgot-password", forgotPassword);


export default router;

