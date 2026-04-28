import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

if (apiUrl) {
  axios.defaults.baseURL = apiUrl.replace(/\/$/, '');
}
