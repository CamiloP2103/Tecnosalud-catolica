// src/utils/apiClient.js

export async function fetchAutenticado(url, options = {}) {
  const token = localStorage.getItem('tecnosalud_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const respuesta = await fetch(url, {
    ...options,
    headers,
  });

  // Si el microservicio responde 401 (token expirado o manipulado)
  if (respuesta.status === 401) {
    localStorage.removeItem('tecnosalud_token');
    localStorage.removeItem('tecnosalud_sesion_activa');
    window.location.reload();
  }

  return respuesta;
}