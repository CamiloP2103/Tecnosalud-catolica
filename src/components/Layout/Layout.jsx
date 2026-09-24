import './Layout.css';

function Layout({ children }) {
  return (
    <main className="layout">
      <div className="layout__container">{children}</div>
    </main>
  );
}

export default Layout;
