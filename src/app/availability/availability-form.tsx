'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { Check, X, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type Role = 'interviewer' | 'interviewee'

interface TimeSlot {
    id: string
    date: string
    start_time: string
    end_time: string
}

interface AvailabilityFormProps {
    roundId: string
    userId: string
    timeSlots: TimeSlot[]
    initialAvailabilities: any[]
}

const SUBJECTS = ['Product Sense', 'Metrics', 'RCA', 'Execution', 'Behavioral']

export default function AvailabilityForm({ roundId, userId, timeSlots, initialAvailabilities }: AvailabilityFormProps) {
    const [activeRole, setActiveRole] = useState<Role>('interviewee')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    // Initialize state for both roles
    const getInitialState = (role: Role) => {
        const avail = initialAvailabilities.find((a) => a.role === role)
        return {
            subject: avail?.subject || '',
            selectedSlotIds: avail?.availability_slots?.map((s: any) => s.time_slot_id) || [],
            recordingConsent: avail?.recording_consent || false,
        }
    }

    const [state, setState] = useState({
        interviewee: getInitialState('interviewee'),
        interviewer: getInitialState('interviewer'),
    })

    const currentState = state[activeRole]
    const supabase = createClient()

    const updateState = (updates: Partial<typeof currentState>) => {
        setState((prev) => ({
            ...prev,
            [activeRole]: { ...prev[activeRole], ...updates },
        }))
    }

    const toggleSlot = (slotId: string) => {
        const currentSlots = currentState.selectedSlotIds
        const isSelected = currentSlots.includes(slotId)
        const limit = activeRole === 'interviewee' ? 2 : 3

        if (isSelected) {
            updateState({ selectedSlotIds: currentSlots.filter((id: string) => id !== slotId) })
        } else {
            if (currentSlots.length >= limit) {
                setMessage({ type: 'error', text: `You can only select up to ${limit} slots as an ${activeRole}.` })
                return
            }
            updateState({ selectedSlotIds: [...currentSlots, slotId] })
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        setMessage(null)

        try {
            // 1. Upsert availability record
            const { data: availData, error: availError } = await supabase
                .from('availabilities')
                .upsert(
                    {
                        user_id: userId,
                        round_id: roundId,
                        role: activeRole,
                        subject: currentState.subject,
                        recording_consent: currentState.recordingConsent,
                    },
                    { onConflict: 'user_id, round_id, role' }
                )
                .select()
                .single()

            if (availError) throw availError

            // 2. Manage slots
            // First, get existing slots for this availability
            const { data: existingSlots, error: fetchError } = await supabase
                .from('availability_slots')
                .select('time_slot_id')
                .eq('availability_id', availData.id)

            if (fetchError) throw fetchError

            const existingIds = existingSlots.map((s) => s.time_slot_id)
            const newIds = currentState.selectedSlotIds

            const toAdd = newIds.filter((id: string) => !existingIds.includes(id))
            const toRemove = existingIds.filter((id) => !newIds.includes(id))

            if (toRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from('availability_slots')
                    .delete()
                    .eq('availability_id', availData.id)
                    .in('time_slot_id', toRemove)
                if (deleteError) throw deleteError
            }

            if (toAdd.length > 0) {
                const { error: insertError } = await supabase
                    .from('availability_slots')
                    .insert(
                        toAdd.map((slotId: string) => ({
                            availability_id: availData.id,
                            time_slot_id: slotId,
                        }))
                    )
                if (insertError) throw insertError
            }

            // 3. Trigger Matchmaking
            await fetch('/api/matchmake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId }),
            })

            setMessage({ type: 'success', text: 'Availability updated and matchmaking run! Check the dashboard for any new interviews.' })

        } catch (error: any) {
            console.error('Error updating availability:', error)
            setMessage({ type: 'error', text: error.message || 'Failed to update availability.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                {(['interviewee', 'interviewer'] as const).map((role) => (
                    <button
                        key={role}
                        onClick={() => {
                            setActiveRole(role)
                            setMessage(null)
                        }}
                        className={`flex-1 py-4 px-6 text-center text-sm font-medium focus:outline-none cursor-pointer ${activeRole === role
                            ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-8">
                {/* Subject Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Subject (Required)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {SUBJECTS.map((subject) => (
                            <button
                                key={subject}
                                onClick={() => updateState({ subject })}
                                className={twMerge(
                                    'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                                    currentState.subject === subject
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                )}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Slots */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selected Slots ({currentState.selectedSlotIds.length} / {activeRole === 'interviewee' ? 2 : 3})
                    </label>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                        {currentState.selectedSlotIds.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No slots selected.</p>
                        ) : (
                            currentState.selectedSlotIds.map((slotId: string) => {
                                const slot = timeSlots.find((s) => s.id === slotId)
                                if (!slot) return null
                                return (
                                    <span
                                        key={slotId}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                                    >
                                        {new Date(slot.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {slot.start_time.slice(0, 5)}
                                        <button
                                            onClick={() => toggleSlot(slotId)}
                                            className="ml-1 text-indigo-600 hover:text-indigo-900 focus:outline-none"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Date Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Date
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(timeSlots.map(s => s.date))).sort().map((date) => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className={twMerge(
                                    'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                                    selectedDate === date
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                )}
                            >
                                {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Slot Selection */}
                {selectedDate && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Available Slots for {new Date(selectedDate).toLocaleDateString()}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {timeSlots
                                .filter(slot => slot.date === selectedDate)
                                .map((slot) => {
                                    const isSelected = currentState.selectedSlotIds.includes(slot.id)
                                    return (
                                        <button
                                            key={slot.id}
                                            onClick={() => toggleSlot(slot.id)}
                                            disabled={isSelected}
                                            className={twMerge(
                                                'flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors',
                                                isSelected
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'
                                            )}
                                        >
                                            <Clock className="w-4 h-4" />
                                            <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                        </button>
                                    )
                                })}
                        </div>
                    </div>
                )}

                {/* Recording Consent */}
                <div className="flex items-start gap-3 pt-4 border-t border-gray-100">
                    <div className="flex h-5 items-center">
                        <input
                            id="recording-consent"
                            name="recording-consent"
                            type="checkbox"
                            checked={currentState.recordingConsent}
                            onChange={(e) => updateState({ recordingConsent: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="text-sm">
                        <label htmlFor="recording-consent" className="font-medium text-gray-700">
                            I am okay with this interview being recorded
                        </label>
                        <p className="text-gray-500">
                            If checked, the interview may be recorded for review purposes.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !currentState.subject}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Update Availability'}
                    </button>
                    {!currentState.subject && (
                        <p className="mt-2 text-sm text-red-500 text-center">Please select a subject.</p>
                    )}
                </div>

                {/* Feedback Message */}
                {message && (
                    <div
                        className={twMerge(
                            'p-4 rounded-md text-sm text-center',
                            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        )}
                    >
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    )
}
