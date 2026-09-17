// Fixture containing wildcard CORS setup
const cors = require('cors');

function configureApp(app) {
    app.use(cors({ origin: '*' }));
}

module.exports = { configureApp };
