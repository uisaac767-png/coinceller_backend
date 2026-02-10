const axios = require('axios');

const apiService = {
 get: (url) => axios.get(url),
 post: (url, data) => axios.post(url, data),
};

module.exports = apiService;
