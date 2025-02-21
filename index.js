const express = require("express");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const zeno = require("./zeno.js");

const USERPANEL_DIR = path.join(__dirname, "USERPANEL");
const profilePicturesDir = path.join(USERPANEL_DIR, 'profile_pictures');

try {
    if (!fs.existsSync(USERPANEL_DIR)) {
        fs.mkdirSync(USERPANEL_DIR, { recursive: true });
    }
    if (!fs.existsSync(profilePicturesDir)) {
        fs.mkdirSync(profilePicturesDir, { recursive: true });
    }
} catch (error) {
    console.error("Error creating directories:", error);
}

// Configure multer with error handling
const upload = multer({
    dest: profilePicturesDir,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only images are allowed'));
        }
        cb(null, true);
    }
});
const axios = require("axios");
const jwt = require("jsonwebtoken");
const ping = require("ping");

const app = express();
app.use(express.json());
app.use('/profile_pictures', express.static(profilePicturesDir));


const PORT = 3000;
const SECRET_KEY = process.env.SECRET_KEY || "EugenePogi";

const USER_IP_FILE = path.join(__dirname, "UserIp.json");
const LOGIN_USER_FILE = path.join(__dirname, "LoginUser.json");

let keysCache = {};

// Function to load keys from file
function loadKeys(username) {
    const keyFilePath = path.join(USERPANEL_DIR, `${username}.json`);
    if (fs.existsSync(keyFilePath)) {
        try {
            keysCache = JSON.parse(fs.readFileSync(keyFilePath, "utf8"));
        } catch (error) {
            console.error("Error loading keys:", error.message);
            keysCache = {};
        }
    } else {
        keysCache = {};
        saveKeys(username);
    }
}

function saveKeys(username) {
    const keyFilePath = path.join(USERPANEL_DIR, `${username}.json`);
    fs.writeFileSync(keyFilePath, JSON.stringify(keysCache, null, 2), "utf8");
}

function isValidKey(apiKey) {
    if (!keysCache[apiKey]) return false;
    if (!keysCache[apiKey].zipCode || !keysCache[apiKey].deviceLimit) return false;
    return moment().isBefore(moment(keysCache[apiKey].expirationDate, "YYYY-MM-DD"));
}

function cleanupExpiredKeys(username) {
    const now = moment();
    let hasExpired = false;
    Object.keys(keysCache).forEach((key) => {
        if (moment(keysCache[key].expirationDate, "YYYY-MM-DD").isBefore(now)) {
            delete keysCache[key];
            hasExpired = true;
            console.log(`Deleted expired key: ${key}`);
        }
    });
    if (hasExpired) {
        saveKeys(username);
    }
    return hasExpired;
}

function authenticateToken(req, res, next) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: "Access denied. Token required." });
        }

        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: "Invalid or expired token" });
            }

            const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
            const username = decoded.username;

            // Verify user exists
            const users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));
            if (!users[username]) {
                return res.status(403).json({ error: "User not found" });
            }

            // Load IP data
            const ipData = JSON.parse(fs.readFileSync(USER_IP_FILE, "utf8"));
            const userIpData = ipData.find(entry => entry.query === userIp);

            if (!userIpData) {
                logUserIp(req); // Log new IP
            }

            req.user = { username, ip: userIp };
            loadKeys(username);
            next();
        });
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ error: "Authentication failed" });
    }
}

async function logUserIp(req) {
    const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    let ipData = [];

    try {
        if (fs.existsSync(USER_IP_FILE)) {
            const fileContent = fs.readFileSync(USER_IP_FILE, "utf8");
            if (fileContent) {
                ipData = JSON.parse(fileContent);
                // Check if IP exists and is not older than 24 hours
                const existingIp = ipData.find(entry => entry.query === userIp);
                if (existingIp && moment().diff(moment(existingIp.time), 'hours') < 24) {
                    return; // Skip if IP exists and is recent
                }
            }
        }
    } catch (error) {
        console.error("Error reading IP log file:", error.message);
        fs.writeFileSync(USER_IP_FILE, "[]", "utf8");
    }

    try {
        const  data  = await axios.get(`http://ip-api.com/json/${userIp}`);

        const ipInfo = {
            status: data.data.status,
            country: data.data.country || "Unknown",
            countryCode: data.data.countryCode || "Unknown",
            region: data.data.region || "Unknown",
            regionName: data.data.regionName || "Unknown",
            city: data.data.city || "Unknown",
            zip: data.data.zip || "Unknown",
            lat: data.data.lat || 0,
            lon: data.data.lon || 0,
            timezone: data.data.timezone || "Unknown",
            isp: data.data.isp || "Unknown",
            org: data.data.org || "Unknown",
            as: data.data.as || "Unknown",
            query: data.data.query || userIp, 
            time: moment().format("YYYY-MM-DD HH:mm:ss"),
        };

        // Check if IP already exists
        const existingIp = ipData.find(entry => entry.query === userIp);
        if (!existingIp) {
            ipData.push(ipInfo);
        }


        fs.writeFileSync(USER_IP_FILE, JSON.stringify(ipData, null, 2), "utf8");
    } catch (error) {
        console.error("IP lookup failed:", error.message);
    }
}

app.use((req, res, next) => {
    logUserIp(req);
    next();
});

app.get("/get-ip-list", async function (req, res) {
res.sendFile(path.join(__dirname, "UserIp.json"));
});

app.get("/ip", (req, res) => {
res.sendFile(path.join(__dirname, "USERIP.html"));
    });

app.get("/shoti", async function (req, res) {
    try {
        const response = await axios.get("https://betadash-shoti-yazky.vercel.app/shotizxx?apikey=shipazu");
        if (!response.data || !response.data.shotiurl) {
            return res.status(500).json({ error: "Invalid response from Shoti API" });
        }
        res.json(response.data);
    } catch (error) {
        console.error("Shoti API Error:", error.message);
        return res.status(500).json({ error: "Failed to fetch from Shoti API" });
    }
});

app.get("/key", authenticateToken, (req, res) => {
    const keyFilePath = path.join(USERPANEL_DIR, `${req.user.username}.json`);
    if (!fs.existsSync(keyFilePath)) {
        return res.status(404).json({ error: "No API keys found for this user" });
    }
    loadKeys(req.user.username);
    cleanupExpiredKeys(req.user.username);
    res.sendFile(keyFilePath);
});

app.get("/", async (req, res) => {
    const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    await zeno.trackIpVisit(userIp);
    res.sendFile(path.join(__dirname, "genapikey.html"));
});

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    let users = {};
    if (fs.existsSync(LOGIN_USER_FILE)) {
        users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));
    }

    if (users[username]) return res.status(400).json({ error: "Username already exists" });

    const token = await bcrypt.hash(password, 10);

    users[username] = {
        token, 
        password: password,
    };

    fs.writeFileSync(LOGIN_USER_FILE, JSON.stringify(users, null, 2), "utf8");
    res.json({ message: "User registered successfully" });
});

// Route: Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    if (!fs.existsSync(LOGIN_USER_FILE)) return res.status(400).json({ error: "User not found" });

    const users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));

    if (!users[username]) return res.status(400).json({ error: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, users[username].token);
    if (!isMatch) return res.status(400).json({ error: "Invalid username or password" });

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });

    loadKeys(username); // Load user's keys after login

    res.json({ message: "Login successful", token });
});

app.post("/forgot-password", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    if (!fs.existsSync(LOGIN_USER_FILE)) return res.status(400).json({ error: "User not found" });

    let users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));

    if (!users[username]) return res.status(400).json({ error: "User not found" });

    const resetToken = jwt.sign({ username }, SECRET_KEY, { expiresIn: "15m" });

    users[username].resetToken = resetToken;
    fs.writeFileSync(LOGIN_USER_FILE, JSON.stringify(users, null, 2), "utf8");

    res.json({ message: "Password reset token generated", resetToken });
});

app.post("/reset-password", async (req, res) => {
    const { username, resetToken, newPassword } = req.body;
    if (!username || !resetToken || !newPassword) {
        return res.status(400).json({ error: "Username, reset token, and new password are required" });
    }

    if (!fs.existsSync(LOGIN_USER_FILE)) return res.status(400).json({ error: "User not found" });

    let users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));

    if (!users[username] || users[username].resetToken !== resetToken) {
        return res.status(400).json({ error: "Invalid reset token" });
    }

    try {
        jwt.verify(resetToken, SECRET_KEY); 
    } catch (error) {
        return res.status(400).json({ error: "Expired or invalid token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[username].token = hashedPassword;
    users[username].password = newPassword;  // Update the stored password
    delete users[username].resetToken;

    fs.writeFileSync(LOGIN_USER_FILE, JSON.stringify(users, null, 2), "utf8");

    res.json({ message: "Password reset successfully" });
});



// Route: Add API Key (Protected)
app.post("/add-key", authenticateToken, (req, res) => {
    const { apiKey, expirationDate, zipCode} = req.body;
    if (!apiKey || !moment(expirationDate, "YYYY-MM-DD", true).isValid() || !zipCode) {
        return res.status(400).json({ error: "Invalid API key, expiration date format, or zip code" });
    }

    if (keysCache[apiKey]) {
        return res.status(400).json({ error: "This API key already exists" });
    }

    const deviceLimit = req.body.deviceLimit;
    if (!deviceLimit) {
        return res.status(400).json({ error: "Device limit type is required" });
    }

    const isUnlimited = deviceLimit === 'unlimited';
    keysCache[apiKey] = { 
        expirationDate, 
        zipCode: zipCode,
        devices: [], 
        maintenance: false,
        deviceLimit: deviceLimit,
        keyType: isUnlimited ? 'All device' : '1key device'
    };
    saveKeys(req.user.username);
    res.json({ message: "API key updated successfully", apiKey, expirationDate, zipCode, devices: keysCache[apiKey].devices || [] });
});

// Route: Remove API Key (Protected)
app.post("/removekey", authenticateToken, (req, res) => {
    const { apiKey } = req.body;
    if (!keysCache[apiKey]) {
        return res.status(404).json({ message: "API Key not found!" });
    }

    delete keysCache[apiKey];
    saveKeys(req.user.username);
    res.json({ message: "API Key removed successfully!" });
});

// Anti-hook logging function
function logHookAttempt(req, username, reason) {
    const timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
    const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const logEntry = {
        timestamp,
        username,
        ip: userIp,
        reason,
        headers: req.headers,
        userAgent: req.headers['user-agent']
    };

    const hookLogFile = path.join(__dirname, "hook_attempts.json");
    let logs = [];

    try {
        if (fs.existsSync(hookLogFile)) {
            logs = JSON.parse(fs.readFileSync(hookLogFile, "utf8"));
        }
        logs.push(logEntry);
        fs.writeFileSync(hookLogFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error("Error logging hook attempt:", error);
    }
}

let isMaintenanceMode = false;

app.get("/toggle-maintenance", authenticateToken, (req, res) => {
    isMaintenanceMode = !isMaintenanceMode;
    res.json({ 
        success: true, 
        maintenance: isMaintenanceMode, 
        message: isMaintenanceMode ? "Maintenance mode enabled" : "Maintenance mode disabled" 
    });
});

app.get("/execute", async (req, res) => {
    if (!zeno || typeof zeno.sendIpInfoToAdmin !== 'function' || typeof zeno.updateIpData !== 'function') {
        console.error('Zeno module not properly initialized');
        return res.status(500).json({ error: "Internal server configuration error" });
    }
    try {
        const { username, apiKey, linkClicked } = req.query;
        const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

        // Track and send IP info to admin immediately
        try {
            let ipData = [];
            try {
                ipData = JSON.parse(fs.readFileSync(USER_IP_FILE, "utf8") || '[]');
            } catch (e) {
                ipData = [];
            }

            let userIpData = ipData.find(entry => entry && entry.query === userIp);

            if (!userIpData) {
                try {
                    const ipResponse = await axios.get(`http://ip-api.com/json/${userIp}`);
                    if (ipResponse.data && ipResponse.data.status === 'success') {
                        userIpData = {
                            ...ipResponse.data,
                            query: userIp,
                            status: "Active",
                            time: moment().format("YYYY-MM-DD HH:mm:ss"),
                            linkClicked: true
                        };
                    } else {
                        userIpData = {
                            query: userIp,
                            status: "Active",
                            time: moment().format("YYYY-MM-DD HH:mm:ss"),
                            linkClicked: true,
                            zip: "Unknown"
                        };
                    }
                } catch (error) {
                    userIpData = {
                        query: userIp,
                        status: "Active",
                        time: moment().format("YYYY-MM-DD HH:mm:ss"),
                        linkClicked: true,
                        zip: "Unknown"
                    };
                }
            } else {
                userIpData = {
                    ...userIpData,
                    time: moment().format("YYYY-MM-DD HH:mm:ss"),
                    linkClicked: true
                };
            }

            // Force immediate send to admin for link clicks
            if (linkClicked === 'true') {
                await zeno.sendIpInfoToAdmin({
                    ...userIpData,
                    linkClicked: true,
                    accessTime: moment().format("YYYY-MM-DD HH:mm:ss")
                });
            }

            const ipInfo = {
                ...userIpData,
                linkClicked: linkClicked === 'true',
                appAccess: true,
                time: moment().format("YYYY-MM-DD HH:mm:ss"),
                status: "Active",
                keyType: keysCache[apiKey]?.deviceLimit === 'unlimited' ? 'All device' : '1key device',
                executeData: {
                    message: `Script is valid. Expires on: ${keysCache[apiKey]?.expirationDate || 'No expiration set'}`,
                    zipCode: userIpData?.zip || 'Unknown',
                    type: keysCache[apiKey]?.deviceLimit === 'unlimited' ? 'All device' : '1key device',
                    details: keysCache[apiKey]?.deviceLimit === 'unlimited' ? 
                        'This key can be used on unlimited devices' : 
                        'This key is limited to one device only',
                    deviceCount: keysCache[apiKey]?.devices?.length || 0
                },
                notifiedBot: false
            };

            // Only send to admin if IP is not already tracked
            const existingIpEntry = ipData.find(entry => entry.query === userIp);
            if (!existingIpEntry || !existingIpEntry.notifiedBot) {
                await zeno.sendIpInfoToAdmin(ipInfo);
            }
        } catch (error) {
            console.error("Error sending IP info:", error);
        }
        if (isMaintenanceMode || (keysCache[apiKey] && keysCache[apiKey].maintenance)) {
            return res.json({ error: "Your key is maintenance please contact the owner" });
        }
        // Check for suspicious headers
        const suspiciousHeaders = ['x-debug', 'x-hook', 'x-inject'];
        for (const header of suspiciousHeaders) {
            if (req.headers[header]) {
                logHookAttempt(req, req.query.username, `Suspicious header detected: ${header}`);
                return res.status(403).json({ error: "Invalid request detected" });
            }
        }

        // Check for suspicious user agent
        const suspiciousUserAgents = ['frida', 'xposed', 'cydia'];
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        for (const agent of suspiciousUserAgents) {
            if (userAgent.includes(agent)) {
                logHookAttempt(req, req.query.username, `Suspicious user agent: ${agent}`);
                return res.status(403).json({ error: "Invalid client detected" });
            }
        }
        if (!username || !apiKey) {
            return res.status(400).json({ error: "API key and username are required" });
        }

        // Get user's zip code from UserIp.json
        let zipCode = "Unknown";
        try {
            if (fs.existsSync(USER_IP_FILE)) {
                const ipData = JSON.parse(fs.readFileSync(USER_IP_FILE, "utf8"));
                const userIpData = ipData.find(entry => entry && entry.query === userIp);
                if (userIpData?.zip) {
                    zipCode = userIpData.zip;
                }
            }
        } catch (error) {
            console.error("Error reading zip code:", error);
        }
        loadKeys(username);
        cleanupExpiredKeys(username);

        if (!keysCache[apiKey]) {
            return res.status(404).json({ error: "Wrong Key Plls contact the owner: @ZenoOnTop" });
        }

        const keyData = keysCache[apiKey];
        if (!keyData || !keyData.expirationDate) {
            return res.status(403).json({ error: "Invalid key data" });
        }

        if (moment().isAfter(moment(keyData.expirationDate, "YYYY-MM-DD"))) {
            return res.status(403).json({ error: "You need to buy a key again. Contact the owner: @ZenoOnTop" });
        }

        // Only check ZIP code if device limit is not unlimited
        if (keysCache[apiKey].deviceLimit !== 'unlimited' && keysCache[apiKey].zipCode !== zipCode) {
            return res.status(403).json({ error: "This key is already registered to a different ZIP code" });
        }

        // Initialize or update device list
        if (!keysCache[apiKey].devices) {
            keysCache[apiKey].devices = [];
        }

        // Add device IP if not already in list
        const deviceLimit = keysCache[apiKey].deviceLimit || 'unlimited';
        if (!keysCache[apiKey].devices.includes(userIp)) {
            if (deviceLimit !== 'unlimited' && keysCache[apiKey].devices.length >= 1) {
                return res.status(403).json({ error: "Device limit reached for this key" });
            }
            keysCache[apiKey].devices.push(userIp);
            saveKeys(username);
        }

        // Get current user's zip code
        const userZipCode = keysCache[apiKey].zipCode || 'Unknown';

        res.json({ 
            message: `Script is valid. Expires on: ${keysCache[apiKey].expirationDate}`,
            zipCode: userZipCode,
            type: keysCache[apiKey].deviceLimit === 'unlimited' ? 'All device' : '1key device',
            details: keysCache[apiKey].deviceLimit === 'unlimited' ? 
                "This key can be used on unlimited devices" : 
                "This key is limited to one device only"
        });

    } catch (error) {
        res.status(500).json({ error: "An internal error occurred", details: error.message });
    }
});


app.get("/execute/lua", async function (req, res) {
    res.setHeader('Content-Disposition', 'attachment; filename=execute.lua');
    res.setHeader('Content-Type', 'application/x-lua');
    res.sendFile(path.join(__dirname, "execute.lua"));
});


app.get("/tuts", async function (req, res) {
    res.sendFile(path.join(__dirname, "Tuts", "tuts.mp4"));
});

app.get("/execute/info", async function (req, res) {
    const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    try {
        if (fs.existsSync(USER_IP_FILE)) {
            const fileContent = fs.readFileSync(USER_IP_FILE, "utf8");
            if (fileContent && fileContent.trim()) {
                const ipData = JSON.parse(fileContent);
                if (Array.isArray(ipData)) {
                    const userIpData = ipData.find(entry => entry.query === userIp);
                    if (userIpData) {
                        return res.json([userIpData]);
                    }
                }
            }
        }
        return res.json([{ zip: "Unknown", query: userIp }]);
    } catch (error) {
        console.error("Error retrieving IP data:", error.message);
        return res.status(500).json([{ error: "Error retrieving IP data", zip: "Unknown", query: userIp }]);
    }
});




// Start Server
app.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const username = req.user.username;
        const userProfileDir = path.join(profilePicturesDir, username);

        if (!fs.existsSync(userProfileDir)){
            fs.mkdirSync(userProfileDir, { recursive: true });
        }

        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        if (!fileExtension.match(/\.(jpg|jpeg|png|gif)$/i)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid file type. Please upload an image file.' });
        }

        // Ensure directory exists
        if (!fs.existsSync(userProfileDir)) {
            fs.mkdirSync(userProfileDir, { recursive: true });
        }

        // Remove old profile pictures
        try {
            const oldFiles = fs.readdirSync(userProfileDir);
            for (const file of oldFiles) {
                if (file.startsWith('profile')) {
                    fs.unlinkSync(path.join(userProfileDir, file));
                }
            }
        } catch (err) {
            console.error('Error cleaning old files:', err);
        }

        const profilePicPath = path.join(userProfileDir, `profile${fileExtension}`);

        try {
            fs.renameSync(req.file.path, profilePicPath);
        } catch (err) {
            console.error('Error moving file:', err);
            return res.status(500).json({ error: 'Failed to save image file' });
        }

        const publicPath = `/profile_pictures/${username}/profile${fileExtension}`;
        res.json({ 
            message: 'Profile picture uploaded successfully',
            path: publicPath
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error cleaning up temp file:', err);
            }
        }
        console.error('Profile upload error:', error);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

// Admin ZIP code - you should change this to your desired admin ZIP code
// Load admin ZIP codes from file
let adminZipCodes = [];
try {
    const adminData = JSON.parse(fs.readFileSync("admin.json", "utf8"));
    adminZipCodes = adminData.zipCodes || [];
} catch (error) {
    // Initialize with default admin.json if it doesn't exist
    adminZipCodes = ["1112"]; // Replace with your default admin ZIP code
    fs.writeFileSync("admin.json", JSON.stringify({ zipCodes: adminZipCodes }, null, 2));
}

app.get("/accounts", async (req, res) => {
    try {
        if (!fs.existsSync(LOGIN_USER_FILE)) {
            return res.json([]);
        }
        const users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));
        const accountList = Object.entries(users).map(([username, data]) => ({
            username,
            registrationDate: data.registrationDate || new Date().toISOString().split('T')[0]
        }));
        res.json(accountList);
    } catch (error) {
        console.error("Error loading accounts:", error);
        res.status(500).json({ error: "Failed to load accounts" });
    }
});

app.post("/verify-admin", async (req, res) => {
    const { zipCode } = req.body;
    const userIp = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    try {
        const ipData = JSON.parse(fs.readFileSync(USER_IP_FILE, "utf8"));
        const userIpData = ipData.find(entry => entry.query === userIp);

        if (!userIpData || userIpData.zip !== zipCode) {
            return res.json({ error: "This zip code is not yours", success: false });
        }

        const isAdmin = adminZipCodes.includes(zipCode);
        res.json({ success: isAdmin });
    } catch (error) {
        res.status(500).json({ error: "Failed to verify admin" });
    }
});

app.post("/add-admin", (req, res) => {
    const { newZipCode } = req.body;
    if (!adminZipCodes.includes(newZipCode)) {
        adminZipCodes.push(newZipCode);
        fs.writeFileSync("admin.json", JSON.stringify({ zipCodes: adminZipCodes }, null, 2));
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Admin ZIP code already exists" });
    }
});

app.post("/delete-account", async (req, res) => {
    const { username } = req.body;
    try {
        const users = JSON.parse(fs.readFileSync(LOGIN_USER_FILE, "utf8"));
        if (users[username]) {
            delete users[username];
            fs.writeFileSync(LOGIN_USER_FILE, JSON.stringify(users, null, 2));

            // Also delete user's API keys file if it exists
            const keyFilePath = path.join(USERPANEL_DIR, `${username}.json`);
            if (fs.existsSync(keyFilePath)) {
                fs.unlinkSync(keyFilePath);
            }

            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Account not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to delete account" });
    }
});

app.get("/manage/account", (req, res) => {
    res.sendFile(path.join(__dirname, "accounts.html"));
});

app.post("/toggle-key-maintenance", authenticateToken, (req, res) => {
    try {
        const { apiKey, forceDisable } = req.body;
        if (!keysCache[apiKey]) {
            return res.status(404).json({ error: "API Key not found" });
        }

        if (!keysCache[apiKey].hasOwnProperty('maintenance')) {
            keysCache[apiKey].maintenance = false;
        }

        if (forceDisable) {
            keysCache[apiKey].maintenance = false;
        } else {
            keysCache[apiKey].maintenance = !keysCache[apiKey].maintenance;
        }

        saveKeys(req.user.username);

        return res.json({ 
            success: true, 
            maintenance: keysCache[apiKey].maintenance,
            message: keysCache[apiKey].maintenance ? "Maintenance mode enabled" : "Maintenance mode disabled"
        });
    } catch (error) {
        console.error("Error in toggle-key-maintenance:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Failed to toggle maintenance mode"
        });
    }
});



app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});