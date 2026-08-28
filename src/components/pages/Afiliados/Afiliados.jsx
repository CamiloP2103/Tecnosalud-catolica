import { useState } from 'react';
import './Afiliados.css';

const captchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function Afiliados() {
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', documento: '', tipo: '' });

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const response = window.grecaptcha?.getResponse();
    if (!response) {
      window.alert('Por favor, completa el captcha antes de registrarte.');
      return;
    }
    window.alert('Registro realizado correctamente. ¡Bienvenido a Tecnosalud!');
    setForm({ nombre: '', correo: '', telefono: '', documento: '', tipo: '' });
    window.grecaptcha.reset();
  };

  return (
    <section className="page page--form">
      <h2>Afiliados</h2>
      <p>Completa el formulario para registrarte como afiliado de Tecnosalud.</p>
      <form onSubmit={handleSubmit}>
        <label>Nombre completo<input name="nombre" value={form.nombre} onChange={handleChange} required /></label>
        <label>Correo electrónico<input type="email" name="correo" value={form.correo} onChange={handleChange} required /></label>
        <label>Teléfono<input type="tel" name="telefono" value={form.telefono} onChange={handleChange} required /></label>
        <label>Número de documento<input name="documento" value={form.documento} onChange={handleChange} required /></label>
        <label>Tipo de afiliación
          <select name="tipo" value={form.tipo} onChange={handleChange} required>
            <option value="">Selecciona una opción</option>
            <option value="paciente">Paciente</option>
            <option value="profesional">Profesional de la salud</option>
            <option value="empresa">Empresa</option>
          </select>
        </label>
        <div className="g-recaptcha" data-sitekey={captchaKey}></div>
        <button type="submit">Registrarme</button>
      </form>
    </section>
  );
}

export default Afiliados;
