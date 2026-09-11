const { defineConfig } = require("cypress");

module.exports = defineConfig({
  env: {
    apiUrl: "http://localhost:8081",
  },

  e2e: {
    baseUrl: "http://localhost:4200",
  },
});