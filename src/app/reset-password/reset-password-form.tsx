'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordForm() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        // Check if user came from a valid reset link
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // User clicked the reset link, ready to set new password
            }
        })
    }, [supabase])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            setMessage('Password updated successfully! Redirecting...')
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        } catch (error: any) {
            setError(error.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    Set new password
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Enter your new password below
                </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleReset}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            New Password
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm Password
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                </div>
            </form>

            {message && (
                <div className="mt-4 p-3 rounded-md text-sm text-center bg-green-50 text-green-700">
                    {message}
                </div>
            )}

            {error && (
                <div className="mt-4 p-3 rounded-md text-sm text-center bg-red-50 text-red-700">
                    {error}
                </div>
            )}
        </div>
    )
}
