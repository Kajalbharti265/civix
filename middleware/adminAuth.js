export const requireAdmin = (req, res, next) => {
  const key = req.headers["x-admin-key"];
  if (key !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: "Unauthorized: invalid admin key" });
  }
  next();
};