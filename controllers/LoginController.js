const User = require("../Schema/UserSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    console.log(email,password);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { email: user.email, _id: user._id },
      '9867d0d10bf402b709f14f7f2ac9c68b659f0969228d7e5ca06105698ab47ac0'
    );

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = Login;
