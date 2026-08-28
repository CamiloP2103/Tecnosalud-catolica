import { useState } from 'react';
import './Acceso.css';

const captchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function Acceso() {
  const [form, setForm] = useState({ usuario: '', contrasena: '' });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!window.grecaptcha?.getResponse()) {
      window.alert('Por favor, completa el captcha para iniciar sesión.');
      return;
    }
    window.alert('Inicio de sesión realizado correctamente.');
    setForm({ usuario: '', contrasena: '' });
    window.grecaptcha.reset();
  };

  return (
    <section className="page page--form">
      <h2>Acceso</h2>
      <p>Ingresa tus datos para acceder a tu cuenta de Tecnosalud.</p>
      <form onSubmit={handleSubmit}>
        <label>Correo electrónico<input type="email" value={form.usuario} onChange={(event) => setForm({ ...form, usuario: event.target.value })} required /></label>
        <label>Contraseña<input type="password" value={form.contrasena} onChange={(event) => setForm({ ...form, contrasena: event.target.value })} required /></label>
        <div className="g-recaptcha" data-sitekey={captchaKey}></div>
        <button type="submit">Iniciar sesión</button>
      </form>
    </section>
  );
}

export default Acceso;
