function Login({ form, errors, onChange, onSubmit, loading }) {
  // Pre-fill to match design patterns if any
  if (!form.email) form.email = "admin@glpi.local";
  if (!form.password) form.password = "admin";

  return (
    <div className="login-page">
      <div className="login-card card shadow-lg border-0">
        <div className="card-body p-4 p-md-5">
          <div className="mb-4 text-center">
            <span className="badge bg-primary px-3 py-2">GLPI Suite</span>
            <h1 className="mt-3 mb-2">Connexion Admin</h1>
            <p className="text-muted mb-0">
              Accès à la console de réinitialisation.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">
                Email / Identifiant
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="admin@glpi.local"
                value={form.email}
                onChange={onChange}
                required
              />
              {errors.email ? (
                <div className="invalid-feedback">{errors.email}</div>
              ) : null}
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                required
              />
              {errors.password ? (
                <div className="invalid-feedback">{errors.password}</div>
              ) : null}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="remember"
                  name="remember"
                  checked={form.remember}
                  onChange={onChange}
                />
                <label className="form-check-label" htmlFor="remember">
                  Se souvenir de moi
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
