const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证 token 的中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的令牌' });
    }
    req.user = user;
    next();
  });
};

// 验证管理员权限的中间件
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的令牌' });
    }
    console.log(JSON.stringify(user))
    // 验证用户是否为管理员
    if (user.user_role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    
    req.user = user;
    next();
  });
};

// 生成 token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email,
      user_role: user.user_role
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  generateToken
}; 