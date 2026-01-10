'use client'

import React, { useState } from 'react'
import { Calendar, Video, User, PlusCircle, UserCircle, LogOut, Link as LinkIcon, MessageCircle } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { createClient } from '@/utils/supabase/client'
import { updateMeetingLink, joinInterview, updateRecordingLink } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface DashboardClientProps {
    user: any
    activeRound: any
    interviews: any[]
    openInterviews: any[]
    allInterviews: any[]
}

export default function DashboardClient({ user, activeRound, interviews, openInterviews, allInterviews }: DashboardClientProps) {
    const [activeTab, setActiveTab] = useState<'my' | 'all' | 'open'>('my')
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [autoEditId, setAutoEditId] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const getInterviewStatus = (interview: any) => {
        const now = new Date()
        const startTime = new Date(`${interview.time_slot.date}T${interview.time_slot.start_time}`)
        const endTime = new Date(`${interview.time_slot.date}T${interview.time_slot.end_time}`)

        if (interview.status === 'Upcoming') {
            if (now >= startTime && now <= endTime) return 'Live'
            if (now > endTime) return 'Completed'
        }
        return interview.status
    }

    const filteredInterviews = activeTab === 'my'
        ? interviews.filter(i =>
            ['Upcoming', 'Live'].includes(getInterviewStatus(i)) &&
            i.interviewer_id &&
            i.interviewee_id
        )
        : activeTab === 'open'
            ? openInterviews.filter(i => ['Upcoming', 'Live'].includes(getInterviewStatus(i)))
            : allInterviews.filter(i =>
                getInterviewStatus(i) === 'Completed' &&
                i.interviewer_id &&
                i.interviewee_id
            )

    const handleJoin = async (interview: any) => {
        setJoiningId(interview.id)
        try {
            await joinInterview(interview.id)

            const placeholders = ['tbd', 'placeholder', 'pending', 'to be decided', 'none', 'null', 'meet.google.com/placeholder']
            const isPlaceholder = !interview.meeting_link || placeholders.some(p => interview.meeting_link?.toLowerCase().includes(p))

            if (isPlaceholder) {
                setAutoEditId(interview.id)
            }

            router.refresh()
            setActiveTab('my')
        } catch (error) {
            alert('Failed to join interview')
        } finally {
            setJoiningId(null)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Mock Interviews</h1>
                        {activeRound && (
                            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:base">
                                {activeRound.name} • {new Date(activeRound.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(activeRound.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <a
                            href="/availability"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-600 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-indigo-200 hover:bg-indigo-50"
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">Manage Availability</span>
                        </a>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto px-4 py-2.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                            >
                                <div className="flex items-center gap-3">
                                    <UserCircle className="w-6 h-6 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[150px] sm:max-w-none">{user.email}</span>
                                </div>
                                <PlusCircle className={twMerge("w-4 h-4 text-gray-400 transition-transform sm:hidden", showUserMenu && "rotate-45")} />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {!activeRound ? (
                    <div className="bg-white shadow-lg rounded-xl p-12 text-center">
                        <h3 className="text-lg font-medium text-gray-900">No active round</h3>
                        <p className="mt-2 text-gray-500">There are no mock interview rounds currently active.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex overflow-x-auto no-scrollbar">
                            {(['my', 'open', 'all'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={twMerge(
                                        "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                        activeTab === tab
                                            ? "bg-indigo-600 text-white shadow-md"
                                            : "text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {tab === 'my' && <User className="w-4 h-4" />}
                                    {tab === 'open' && <PlusCircle className="w-4 h-4" />}
                                    {tab === 'all' && <Calendar className="w-4 h-4" />}
                                    {tab === 'my' ? 'My Interviews' : tab === 'open' ? 'Open Interviews' : 'All Interviews'}
                                </button>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredInterviews.length === 0 ? (
                                <div className="col-span-full bg-white shadow-lg rounded-xl p-12 text-center">
                                    <p className="text-gray-500">No interviews found.</p>
                                </div>
                            ) : (
                                filteredInterviews.map((interview) => (
                                    <InterviewCard
                                        key={interview.id}
                                        interview={interview}
                                        currentUserId={user.id}
                                        onJoin={() => handleJoin(interview)}
                                        isOpen={activeTab === 'open'}
                                        isJoining={joiningId === interview.id}
                                        autoEdit={autoEditId === interview.id}
                                        onAutoEditComplete={() => setAutoEditId(null)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function InterviewCard({
    interview,
    currentUserId,
    onJoin,
    isOpen,
    isJoining,
    autoEdit,
    onAutoEditComplete
}: {
    interview: any;
    currentUserId: string;
    onJoin?: () => void;
    isOpen?: boolean;
    isJoining?: boolean;
    autoEdit?: boolean;
    onAutoEditComplete?: () => void;
}) {
    const isParticipant = interview.interviewer_id === currentUserId || interview.interviewee_id === currentUserId
    const isInterviewer = interview.interviewer_id === currentUserId
    const isInterviewee = interview.interviewee_id === currentUserId
    const [isEditingLink, setIsEditingLink] = useState(false)
    const [meetingLink, setMeetingLink] = useState(interview.meeting_link || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isEditingRecording, setIsEditingRecording] = useState(false)
    const [recordingLink, setRecordingLink] = useState(interview.recording_link || '')
    const [editMessage, setEditMessage] = useState<string | null>(null)

    // Dynamically calculate status based on current time
    const now = new Date()
    const startTime = new Date(`${interview.time_slot.date}T${interview.time_slot.start_time}`)
    const endTime = new Date(`${interview.time_slot.date}T${interview.time_slot.end_time}`)

    let displayStatus = interview.status
    if (displayStatus === 'Upcoming') {
        if (now >= startTime && now <= endTime) {
            displayStatus = 'Live'
        } else if (now > endTime) {
            displayStatus = 'Completed'
        }
    }

    // Handle auto-edit trigger
    React.useEffect(() => {
        if (autoEdit && !isEditingLink) {
            setIsEditingLink(true)
            setEditMessage('Please provide a valid meeting link to join.')
            onAutoEditComplete?.()
        }
    }, [autoEdit, isEditingLink, onAutoEditComplete])

    const statusColors = {
        Upcoming: 'bg-blue-100 text-blue-800',
        Live: 'bg-green-100 text-green-800',
        Completed: 'bg-gray-100 text-gray-800',
    }

    const handleSaveLink = async () => {
        setIsSaving(true)
        try {
            await updateMeetingLink(interview.id, meetingLink)
            setIsEditingLink(false)
            window.location.reload()
        } catch (error) {
            console.error('Failed to update link:', error)
            alert('Failed to update meeting link')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveRecording = async () => {
        setIsSaving(true)
        try {
            await updateRecordingLink(interview.id, recordingLink)
            setIsEditingRecording(false)
            window.location.reload()
        } catch (error) {
            console.error('Failed to update recording:', error)
            alert('Failed to update recording link')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="relative bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(interview.subject) ? (
                        interview.subject.map((subj: string, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                {subj}
                            </span>
                        ))
                    ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {interview.subject}
                        </span>
                    )}
                </div>
            </div>
            <span className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold rounded-full z-10 ${statusColors[displayStatus as keyof typeof statusColors] || 'bg-gray-100'}`}>
                {displayStatus}
            </span>

            {/* Content */}
            <div className="p-6 space-y-4">
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {new Date(interview.time_slot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-500">
                            {interview.time_slot.start_time.slice(0, 5)} - {interview.time_slot.end_time.slice(0, 5)}
                        </p>
                    </div>
                </div>

                {/* Participants */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500">Interviewer:</span>
                            <span className={`font-medium truncate ${isInterviewer ? 'text-indigo-600' : 'text-gray-900'}`}>
                                {interview.interviewer?.email || (isOpen ? 'Open' : 'Unknown')} {isInterviewer && '(You)'}
                            </span>
                        </div>
                        {interview.interviewer?.whatsapp_number && interview.interviewer_id !== currentUserId && (
                            <a
                                href={`https://wa.me/91${interview.interviewer.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100 transition-colors"
                                title="Ping Interviewer on WhatsApp"
                            >
                                <MessageCircle className="w-3 h-3" />
                                Ping
                            </a>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500">Candidate:</span>
                            <span className={`font-medium truncate ${isInterviewee ? 'text-indigo-600' : 'text-gray-900'}`}>
                                {interview.interviewee?.email || (isOpen ? 'Open' : 'Unknown')} {isInterviewee && '(You)'}
                            </span>
                        </div>
                        {interview.interviewee?.whatsapp_number && interview.interviewee_id !== currentUserId && (
                            <a
                                href={`https://wa.me/91${interview.interviewee.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100 transition-colors"
                                title="Ping Candidate on WhatsApp"
                            >
                                <MessageCircle className="w-3 h-3" />
                                Ping
                            </a>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                    {isOpen ? (
                        <button
                            onClick={onJoin}
                            disabled={isJoining}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isJoining ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <PlusCircle className="w-4 h-4" />
                            )}
                            {isJoining ? 'Joining...' : 'Join Interview'}
                        </button>
                    ) : isParticipant ? (
                        <>
                            {/* Meeting Link */}
                            {isEditingLink ? (
                                <div className="space-y-2">
                                    {editMessage && (
                                        <p className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                            {editMessage}
                                        </p>
                                    )}
                                    <input
                                        type="text"
                                        value={meetingLink}
                                        onChange={(e) => setMeetingLink(e.target.value)}
                                        placeholder="Paste meeting link"
                                        className="w-full px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveLink}
                                            disabled={isSaving}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingLink(false)}
                                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const placeholders = ['tbd', 'placeholder', 'pending', 'to be decided', 'none', 'null', 'meet.google.com/placeholder'];
                                            const isPlaceholder = interview.meeting_link && placeholders.some(p => interview.meeting_link.toLowerCase().includes(p));

                                            if (!interview.meeting_link || isPlaceholder) {
                                                setIsEditingLink(true);
                                                setEditMessage('Please provide a valid meeting link to join.');
                                            } else {
                                                window.open(interview.meeting_link, '_blank', 'noopener,noreferrer');
                                            }
                                        }}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${interview.meeting_link ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'}`}
                                    >
                                        <Video className="w-4 h-4" />
                                        {interview.meeting_link ? 'Join' : 'No Link'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditingLink(true)}
                                        className="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}

                            {/* Recording Link Upload (Completed interviews only) */}
                            {interview.status === 'Completed' && (
                                isEditingRecording ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={recordingLink}
                                            onChange={(e) => setRecordingLink(e.target.value)}
                                            placeholder="Paste recording URL"
                                            className="w-full px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveRecording}
                                                disabled={isSaving}
                                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : 'Save Recording'}
                                            </button>
                                            <button
                                                onClick={() => setIsEditingRecording(false)}
                                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsEditingRecording(true)}
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                        {interview.recording_link ? 'Update Recording' : 'Upload Recording'}
                                    </button>
                                )
                            )}
                        </>
                    ) : (
                        // Non-participants can view recording
                        interview.recording_allowed && interview.status === 'Completed' && interview.recording_link ? (
                            <a
                                href={interview.recording_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 shadow-sm"
                            >
                                <Video className="w-4 h-4" />
                                Watch Recording
                            </a>
                        ) : (
                            <p className="text-xs text-center text-gray-400 italic py-2">
                                {interview.status !== 'Completed' ? 'Interview not completed' : 'Recording not available'}
                            </p>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
