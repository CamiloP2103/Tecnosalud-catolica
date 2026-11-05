import './Footer.css';

const contactInfo = {
  phone: '+57 (601) 456 7890',
  tollFree: '01 8000 123 456',
  email: 'contacto@tecnosalud.com',
  socialLinks: [
    { label: 'GitHub', href: 'https://github.com/CamiloP2103/Tecnosalud-catolica.git' },
    { label: 'Instagram', href: 'https://www.instagram.com/tecnosalud' },
  ],
};

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <div className="site-footer__brand">
          <span className="site-footer__logo">Tecnosalud EPS</span>
          <p>Innovación, salud y confianza para cada etapa de tu bienestar.</p>
          <p className="site-footer__nit">NIT: 900.123.456-7 | Vigilado Supersalud</p>
        </div>

        <div className="site-footer__column">
          <h3>Atención y Urgencias</h3>
          <ul>
            <li>
              <span>Urgencias 24/7</span>
              <a href={`tel:${contactInfo.phone.replace(/\D/g, '')}`}>{contactInfo.phone}</a>
            </li>
            <li>
              <span>Línea Gratuita</span>
              <a href={`tel:${contactInfo.tollFree.replace(/\D/g, '')}`}>{contactInfo.tollFree}</a>
            </li>
            <li>
              <span>Correo</span>
              <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            </li>
          </ul>
        </div>

        <div className="site-footer__column">
          <h3>Redes e institucional</h3>
          <ul className="site-footer__socials">
            {contactInfo.socialLinks.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer">
                  {social.label}
                </a>
              </li>
            ))}
            <li>
              <a href="https://www.supersalud.gov.co" target="_blank" rel="noreferrer">
                Supersalud
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} Tecnosalud EPS</span>
        <span>Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}

export default Footer;