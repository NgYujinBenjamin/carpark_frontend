const webpack = require('webpack');

module.exports = {
  webpack(config) {
    config.plugins.push(new webpack.EnvironmentPlugin({
      MAPS_API_KEY: process.env.MAPS_API_KEY,
      MAPS_ID: process.env.MAPS_ID,
      BASE_URL: process.env.BASE_URL,
    }));
    return config;
  },
};
