require('dotenv').config();
const http = require('http');
const app = require('./app');
//const mongoose = require('mongoose');

const port = process.env.PORT || 3001;

const server = http.createServer(app);

//mongoose.connect(process.env.MONGODB_URI);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});