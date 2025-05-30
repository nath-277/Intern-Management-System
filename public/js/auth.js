// Example validation middleware
const validateInternData = (req, res, next) => {
    const { name, year } = req.body;
    if (!name || !year) return res.status(400).json({ error: 'Missing required fields' });
    if (typeof year !== 'number') return res.status(400).json({ error: 'Invalid year' });
    next();
  };