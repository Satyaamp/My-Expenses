const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000/api"
  : "https://my-expenses-gryf.onrender.com/api";

export async function apiRequest(endpoint, method = "GET", body) {
  const token = localStorage.getItem("token");

  const res = await fetch(API_BASE + endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
