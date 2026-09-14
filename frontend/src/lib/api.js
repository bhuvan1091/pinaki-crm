import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = (method, path, data, opts = {}) =>
  axios({ method, url: `${API}${path}`, data, withCredentials: true, ...opts });

export const uploadFile = (orderId, file, category = "General") => {
  const form = new FormData();
  form.append("file", file);
  return axios.post(`${API}/orders/${orderId}/documents?category=${encodeURIComponent(category)}`, form, {
    withCredentials: true,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const downloadDocument = (documentId) =>
  `${API}/documents/${documentId}/download`;
