import './Footer.css';

const contactInfo = {
  phone: '+57 601 456 7890',
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
          <span className="site-footer__logo">Tecnosalud</span>
          <p>Innovación, cuidado y confianza para cada etapa de la salud.</p>
        </div>

        <div className="site-footer__column">
          <h3>Contacto</h3>
          <ul>
            <li>
              <span>Telefono</span>
              <a href={`tel:${contactInfo.phone.replace(/\s+/g, '')}`}>{contactInfo.phone}</a>
            </li>
            <li>
              <span>Correo</span>
              <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            </li>
          </ul>
        </div>

        <div className="site-footer__column">
          <h3>Redes sociales</h3>
          <ul className="site-footer__socials">
            {contactInfo.socialLinks.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© 2026 Tecnosalud</span>
        <span>Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}

export default Footer;
