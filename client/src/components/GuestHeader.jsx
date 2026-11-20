import { Link } from 'react-router-dom';

/** Top bar for the signed-out screens: landing, login, and register. */
export default function GuestHeader() {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="wordmark" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span className="wordmark__mark" />gapcheck
        </Link>
        <span className="label" style={{ marginLeft: 'auto' }}>WEB-BASED ASSESSMENT · MERN</span>
      </div>
    </header>
  );
}
