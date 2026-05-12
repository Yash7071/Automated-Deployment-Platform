const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
    // 1. Get the token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format is "Bearer <token>"

    // 2. If there is no token, reject the request
    if (token == null) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // 3. Verify the token is valid and hasn't expired
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        
        // 4. Attach the decoded user data to the request and move to the next step
        req.user = user; 
        next();
    });
}

module.exports = authenticateToken;