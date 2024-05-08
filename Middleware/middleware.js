const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, '9867d0d10bf402b709f14f7f2ac9c68b659f0969228d7e5ca06105698ab47ac0');
    req.token = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token." });
  }
}

module.exports = verifyToken;
