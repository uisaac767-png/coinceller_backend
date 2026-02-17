exports.getProfile = (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    wallets: user.wallets || { network: "testnet" },
  });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const { username, displayName } = req.body || {};

    if (typeof username === "string" && username.trim()) {
      user.username = username.trim();
    }
    if (typeof displayName === "string" && displayName.trim()) {
      user.displayName = displayName.trim();
    }

    await user.save();
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};
