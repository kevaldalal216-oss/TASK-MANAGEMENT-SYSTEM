import { AlertCircle } from 'lucide-react'

export default function SetupScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-card)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: 36,
        width: '100%', maxWidth: 560,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <AlertCircle size={24} color="#f59e0b" />
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Supabase not configured</h1>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          TaskFlow TMS needs a <code style={codeStyle}>.env</code> file at the project root
          with your Supabase credentials before it can connect to the backend.
        </p>

        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
          Setup steps
        </h2>

        <ol style={{ fontSize: 14, color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Create a file called <code style={codeStyle}>.env</code> inside the <code style={codeStyle}>frontend-mis/</code> folder</li>
          <li>Add these two lines (replace with your project values):</li>
        </ol>

        <pre style={{
          background: 'var(--bg-tertiary)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-button)',
          fontSize: 13,
          color: 'var(--text-primary)',
          margin: '12px 0 16px',
          overflowX: 'auto',
          border: '1px solid var(--border-light)',
        }}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
        </pre>

        <ol start={3} style={{ fontSize: 14, color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Find these values in your Supabase project → Settings → API</li>
          <li>Restart the dev server: <code style={codeStyle}>npm run dev</code></li>
        </ol>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20, borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
          Vite only reads <code style={codeStyle}>.env</code> on startup — changes to it require a server restart.
        </p>
      </div>
    </div>
  )
}

const codeStyle = {
  background: 'var(--bg-tertiary)',
  padding: '2px 6px',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: 'monospace',
  color: 'var(--accent-primary)',
}
