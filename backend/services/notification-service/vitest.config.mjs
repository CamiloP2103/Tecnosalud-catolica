// Configuración propia para que Vitest no use la del frontend (vite.config.js de la raíz)
export default {
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
};
