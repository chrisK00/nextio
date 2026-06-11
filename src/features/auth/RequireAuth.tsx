import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../state/AppContext'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, authLoading } = useAppContext()
    if(authLoading) return <div>Loading...</div>
    if(!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}
