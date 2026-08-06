(function () {
  const LOCAL_API_URL = "http://localhost:5000";

  // Replace this with your actual deployed backend URL later
  const PRODUCTION_API_URL = "https://dastyaab-api.onrender.com";

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "";

  const API_BASE_URL = isLocal
    ? LOCAL_API_URL
    : PRODUCTION_API_URL;

  window.DASTYAAB_CONFIG = {
    API_BASE_URL,
    API_URL: `${API_BASE_URL}/api`,
    SOCKET_URL: API_BASE_URL,
  };
})();