const lowercaseAddress = (req, res, next) => {
  if (req.body.address) {
    req.body.address = req.body.address.toLowerCase();
  }
  if (req.params.address) {
    req.params.address = req.params.address.toLowerCase();
  }
  next();
};

module.exports = {
  lowercaseAddress,
};
