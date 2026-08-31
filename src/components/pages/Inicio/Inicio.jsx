import { useEffect, useState } from 'react';
import logoTecnosalud from './Images/Logo.png';
import './Inicio.css';

function Inicio() {
  const [horaCarga, setHoraCarga] = useState('--:--:--');

  useEffect(() => {
    setHoraCarga(new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }));
  }, []);

  return (
    <section className="page page--inicio">
      <h2>Bienvenido a Tecnosalud</h2>
      <p>
        Tecnología, salud e ingeniería al servicio de la vida. Esta aplicación
        reúne nuestros servicios en una sola experiencia.
      </p>
      <p>
        Hora de carga: <strong className="highlight">{horaCarga}</strong>
      </p>
      <div className="inicio__brand" aria-label="Tecnosalud">
        <span>TECNOSALUD</span>
        <small>INNOVACIÓN AL SERVICIO DE LA VIDA</small>
        <img src={logoTecnosalud} alt="Logo Tecnosalud" className="inicio__logo" />
      </div>
    </section>
  );
}

export default Inicio;
