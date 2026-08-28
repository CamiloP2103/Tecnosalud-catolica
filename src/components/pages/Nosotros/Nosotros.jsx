import { useState } from 'react';
import './Nosotros.css';

function Nosotros() {
  const [visitas, setVisitas] = useState(0);

  return (
    <section className="page page--nosotros">
      <h2>Nosotros</h2>
      <p>
        Tecnosalud Católica integra tecnología, salud e ingeniería para crear
        soluciones innovadoras enfocadas en mejorar la calidad de vida.
      </p>
      <p>
        Trabajamos con una visión humana, responsable y orientada a las
        necesidades de nuestros pacientes, profesionales e instituciones.
      </p>
      <div className="visits">
        <span>Visitas a esta sección</span>
        <strong>{visitas}</strong>
        <button type="button" onClick={() => setVisitas((value) => value + 1)}>
          Registrar visita
        </button>
      </div>
    </section>
  );
}

export default Nosotros;
