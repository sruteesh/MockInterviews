'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useRef, useEffect } from 'react'
import { Check, X, Clock, Calendar, User, PlusCircle, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useRouter } from 'next/navigation'

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
    occupiedSlotIds: string[]
    profile?: any
}

const SUBJECTS = ['Product Sense', 'Metrics', 'RCA', 'Execution', 'Behavioral']

export default function AvailabilityForm({ roundId, userId, timeSlots, initialAvailabilities, occupiedSlotIds, profile }: AvailabilityFormProps) {
    const [activeRole, setActiveRole] = useState<Role>('interviewee')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const messageRef = useRef<HTMLDivElement>(null)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsapp_number || '')

    // Initialize state for both roles
    const getInitialState = (role: Role) => {
        const avail = initialAvailabilities.find((a) => a.role === role)
        return {
            subjects: avail?.subject || [],
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
    const router = useRouter()

    // Auto-scroll to message when it appears
    useEffect(() => {
        if (message && messageRef.current) {
            messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [message])

    const updateState = (updates: Partial<typeof currentState>) => {
        setState((prev) => ({
            ...prev,
            [activeRole]: { ...prev[activeRole], ...updates },
        }))
    }

    const toggleSlot = (slotId: string) => {
        const currentSlots = currentState.selectedSlotIds
        const isSelected = currentSlots.includes(slotId)
        const limit = 5

        if (isSelected) {
            updateState({ selectedSlotIds: currentSlots.filter((id: string) => id !== slotId) })
        } else {
            if (currentSlots.length >= limit) {
                setMessage({ type: 'error', text: `You have reached the limit of ${limit} slots.` })
                return
            }
            updateState({ selectedSlotIds: [...currentSlots, slotId] })
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        setMessage(null)

        try {
            // 0. Update WhatsApp number in profile
            if (whatsappNumber !== profile?.whatsapp_number) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ whatsapp_number: whatsappNumber })
                    .eq('id', userId)

                if (profileError) throw profileError
            }

            // 1. Upsert availability record
            const { data: availData, error: availError } = await supabase
                .from('availabilities')
                .upsert(
                    {
                        user_id: userId,
                        round_id: roundId,
                        role: activeRole,
                        subject: currentState.subjects,
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

                // Create open interviews for new slots (for BOTH roles)
                if (activeRole === 'interviewer') {
                    // Interviewer providing slots - create with null interviewee
                    const openInterviewsData = toAdd.map((slotId: string) => ({
                        round_id: roundId,
                        subject: currentState.subjects,
                        interviewer_id: userId,
                        interviewee_id: null,
                        time_slot_id: slotId,
                        recording_allowed: currentState.recordingConsent,
                        status: 'Upcoming'
                    }))

                    const { error: interviewError } = await supabase
                        .from('interviews')
                        .insert(openInterviewsData)

                    if (interviewError) throw interviewError
                } else if (activeRole === 'interviewee') {
                    // Interviewee providing slots - create with null interviewer
                    const openInterviewsData = toAdd.map((slotId: string) => ({
                        round_id: roundId,
                        subject: currentState.subjects,
                        interviewer_id: null,
                        interviewee_id: userId,
                        time_slot_id: slotId,
                        recording_allowed: currentState.recordingConsent,
                        status: 'Upcoming'
                    }))

                    const { error: interviewError } = await supabase
                        .from('interviews')
                        .insert(openInterviewsData)

                    if (interviewError) throw interviewError
                }
            }

            // Delete corresponding open interviews when removing slots
            if (toRemove.length > 0) {
                if (activeRole === 'interviewer') {
                    const { error: deleteInterviewError } = await supabase
                        .from('interviews')
                        .delete()
                        .eq('interviewer_id', userId)
                        .is('interviewee_id', null)
                        .in('time_slot_id', toRemove)

                    if (deleteInterviewError) throw deleteInterviewError
                } else if (activeRole === 'interviewee') {
                    const { error: deleteInterviewError } = await supabase
                        .from('interviews')
                        .delete()
                        .eq('interviewee_id', userId)
                        .is('interviewer_id', null)
                        .in('time_slot_id', toRemove)

                    if (deleteInterviewError) throw deleteInterviewError
                }
            }

            // 3. Trigger Matchmaking (to auto-match remaining slots)
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

            {/* Feedback Message (Moved to top for visibility) */}
            {message && (
                <div
                    ref={messageRef}
                    className={twMerge(
                        'm-6 p-4 rounded-lg text-sm flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 duration-300',
                        message.type === 'success'
                            ? 'bg-green-50 text-green-800 border-green-100'
                            : 'bg-red-50 text-red-800 border-red-100'
                    )}
                >
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <p className="font-medium">{message.text}</p>
                </div>
            )}

            <div className="p-6 space-y-8">
                {/* Contact Details */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 max-w-md">
                    <label className="block text-sm font-semibold text-indigo-900 mb-2">
                        WhatsApp Contact (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium text-sm">+91</span>
                        <input
                            type="tel"
                            placeholder="10-digit number"
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-48 px-3 py-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 bg-white"
                        />
                    </div>
                    <p className="text-[10px] text-indigo-600 mt-2">
                        Other participants will see a "Ping" button to reach you.
                    </p>
                </div>

                {/* Subject Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Subjects (1-3 required)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {SUBJECTS.map((subject) => {
                            const isSelected = currentState.subjects.includes(subject)
                            return (
                                <button
                                    key={subject}
                                    onClick={() => {
                                        if (isSelected) {
                                            updateState({ subjects: currentState.subjects.filter((s: string) => s !== subject) })
                                        } else {
                                            if (currentState.subjects.length >= 3) {
                                                setMessage({ type: 'error', text: 'You can only select up to 3 subjects' })
                                                return
                                            }
                                            updateState({ subjects: [...currentState.subjects, subject] })
                                        }
                                    }}
                                    className={twMerge(
                                        'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    )}
                                >
                                    {subject} {isSelected && '✓'}
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{currentState.subjects.length}/3 selected</p>
                </div>

                {/* Selected Slots */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selected Slots ({currentState.selectedSlotIds.length} / 5)
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
                        {Array.from(new Set(timeSlots
                            .filter(s => {
                                const slotTime = new Date(`${s.date}T${s.start_time}`);
                                return slotTime > new Date();
                            })
                            .map(s => s.date)))
                            .sort()
                            .map((date) => (
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
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Available Slots for {new Date(selectedDate).toLocaleDateString()}
                            </label>
                            {/* Legend */}
                            <div className="flex gap-3 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-white border border-gray-300"></div>
                                    <span className="text-gray-600">Available</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
                                    <span className="text-gray-600">Selected</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-red-50 border border-red-300"></div>
                                    <span className="text-gray-600">Conflict</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-amber-50 border border-amber-300"></div>
                                    <span className="text-gray-600">Limit Reached</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {timeSlots
                                .filter(s => s.date === selectedDate)
                                .filter(s => {
                                    const slotTime = new Date(`${s.date}T${s.start_time}`);
                                    return slotTime > new Date();
                                })
                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                .map((slot) => {
                                    const isSelected = currentState.selectedSlotIds.includes(slot.id)
                                    const isOccupiedByOppositeRole = occupiedSlotIds.includes(slot.id) && !isSelected
                                    const isLimitReached = currentState.selectedSlotIds.length >= 5 && !isSelected
                                    const isDisabled = isSelected || isOccupiedByOppositeRole

                                    const oppositeRole = activeRole === 'interviewer' ? 'interviewee' : 'interviewer'
                                    const tooltipText = isOccupiedByOppositeRole
                                        ? `⚠️ Already committed as ${oppositeRole}`
                                        : isSelected
                                            ? '✓ Selected'
                                            : isLimitReached
                                                ? '⚠️ Limit of 5 slots reached'
                                                : 'Click to select'

                                    return (
                                        <div key={slot.id} className="relative group">
                                            <button
                                                onClick={() => toggleSlot(slot.id)}
                                                disabled={isSelected || isOccupiedByOppositeRole}
                                                className={twMerge(
                                                    'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors',
                                                    isSelected
                                                        ? 'bg-gray-100 text-gray-600 border-gray-300 cursor-default'
                                                        : isOccupiedByOppositeRole
                                                            ? 'bg-red-50 text-red-600 border-red-300 cursor-not-allowed'
                                                            : isLimitReached
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500 hover:text-indigo-600'
                                                )}
                                            >
                                                <Clock className="w-4 h-4" />
                                                <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                            </button>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                                                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                                    {tooltipText}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                                        <div className="border-4 border-transparent border-t-gray-900"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
                        disabled={loading || currentState.subjects.length === 0}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Update Availability'}
                    </button>
                    {currentState.subjects.length === 0 && (
                        <p className="mt-2 text-sm text-red-500 text-center">Please select at least one subject.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
