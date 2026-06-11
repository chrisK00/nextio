import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../state/AppContext'
import styles from './Auth.module.css'

export default function LoginPage() {
    const navigate = useNavigate()
    const { login, authLoading } = useAppContext()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if(!username || username.length < 3) return setError('Username must be at least 3 characters')
        if(!password || password.length < 6) return setError('Password must be at least 6 characters')
        try {
            await login(username, password)
            navigate('/')
        } catch(err: any) {
            setError(err?.message || 'Login failed')
        }
    }

    return (
        <div className={styles.authPage}>
            <h2>Login</h2>
            <form onSubmit={submit} className={styles.form}>
                <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button disabled={authLoading} type="submit">{authLoading ? 'Loading...' : 'Login'}</button>
                {error && <div className={styles.error}>{error}</div>}
            </form>
        </div>
    )
}
