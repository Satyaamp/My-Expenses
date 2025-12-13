const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000/api"
  : "https://my-expenses-gryf.onrender.com/api";

// Inject Global Loader CSS
const loaderStyle = document.createElement('style');
loaderStyle.textContent = `
  #global-loader {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
    display: flex; justify-content: center; align-items: center;
    opacity: 0; pointer-events: none; transition: opacity 0.3s;
    backdrop-filter: blur(2px);
  }
  #global-loader.visible { opacity: 1; pointer-events: all; }
  .global-spinner {
    width: 50px; height: 50px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid #22c55e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(loaderStyle);

// Create Global Loader DOM
const loaderDiv = document.createElement('div');
loaderDiv.id = 'global-loader';
loaderDiv.innerHTML = '<div class="global-spinner"></div>';
document.body.appendChild(loaderDiv);

let activeRequests = 0;

export async function apiRequest(endpoint, method = "GET", body = null, { skipLoader = false } = {}) {
  const token = localStorage.getItem("token");

  if (!skipLoader) {
    activeRequests++;
    loaderDiv.classList.add('visible');
  }

  let res, data;
  try {
    res = await fetch(API_BASE + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: body ? JSON.stringify(body) : null
    });

    data = await res.json();
  } finally {
    if (!skipLoader) {
      activeRequests--;
      if (activeRequests <= 0) {
        activeRequests = 0;
        loaderDiv.classList.remove('visible');
      }
    }
  }

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
