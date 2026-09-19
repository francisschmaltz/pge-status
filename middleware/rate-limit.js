const buckets = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);

cleanupInterval.unref();

module.exports = function rateLimit({ limit, windowMs, key: routeKey }) {
  return (req, res, next) => {
    const key = `${req.ip}:${routeKey || req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));

    if (bucket.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    next();
  };
};
