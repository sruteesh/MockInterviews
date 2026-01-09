'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { Mail, Lock, UserPlus, LogIn, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
    const supabase = createClient()
    const router = useRouter()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            if (mode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                })
                if (error) throw error
                setMessage('Check your email for the password reset link!')
            } else if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                })
                if (error) throw error

                if (data.session) {
                    router.push('/dashboard')
                    router.refresh()
                } else {
                    setMessage('Check your email to confirm your account!')
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                if (data.session) {
                    router.push('/dashboard')
                    router.refresh()
                }
            }
        } catch (error: any) {
            setMessage(error.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const getTitle = () => {
        if (mode === 'signup') return 'Create an account'
        if (mode === 'reset') return 'Reset your password'
        return 'Welcome back'
    }

    const getSubtitle = () => {
        if (mode === 'signup') return 'Start your mock interview journey'
        if (mode === 'reset') return 'Enter your email to receive a reset link'
        return 'Sign in to your account'
    }

    return (
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    {getTitle()}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    {getSubtitle()}
                </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email address
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    {mode !== 'reset' && (
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'signin' && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setMode('reset')
                                setMessage('')
                            }}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Forgot password?
                        </button>
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            {mode === 'signup' ? (
                                <UserPlus className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
                            ) : mode === 'reset' ? (
                                <KeyRound className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
                            ) : (
                                <LogIn className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
                            )}
                        </span>
                        {loading ? 'Processing...' : mode === 'signup' ? 'Sign Up' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
                    </button>
                </div>
            </form>

            <div className="mt-4 text-center space-y-2">
                {mode === 'reset' ? (
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signin')
                            setMessage('')
                        }}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        Back to sign in
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === 'signin' ? 'signup' : 'signin')
                            setMessage('')
                        }}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                )}
            </div>

            {message && (
                <div className={`mt-4 p-3 rounded-md text-sm text-center ${message.includes('Check') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}
        </div>
    )
}
