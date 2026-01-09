'use client'

import { useState } from 'react'
import { Calendar, Video, User } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import LogoutButton from '@/components/logout-button'
import { updateMeetingLink } from '@/app/actions'

interface DashboardClientProps {
    user: any
    activeRound: any
    interviews: any[]
}

export default function DashboardClient({ user, activeRound, interviews }: DashboardClientProps) {
    const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')

    const filteredInterviews = activeTab === 'my'
        ? interviews.filter(i => i.interviewer_id === user.id || i.interviewee_id === user.id)
        : interviews

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Mock Interviews – Current Round</h1>
                        {activeRound && (
                            <p className="text-gray-600 mt-1">
                                {activeRound.name} ({new Date(activeRound.start_date).toLocaleDateString('en-US')} - {new Date(activeRound.end_date).toLocaleDateString('en-US')})
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500">
                            Logged in as {user.email}
                        </div>
                        <a href="/availability" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                            Manage Availability
                        </a>
                        <LogoutButton />
                    </div>
                </header>

                {!activeRound ? (
                    <div className="bg-white shadow rounded-lg p-12 text-center">
                        <h3 className="text-lg font-medium text-gray-900">No active round</h3>
                        <p className="mt-2 text-gray-500">There are no mock interview rounds currently active.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('my')}
                                className={twMerge(
                                    'py-4 px-6 text-center text-sm font-medium focus:outline-none cursor-pointer border-b-2',
                                    activeTab === 'my'
                                        ? 'text-indigo-600 border-indigo-600'
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                My Interviews
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={twMerge(
                                    'py-4 px-6 text-center text-sm font-medium focus:outline-none cursor-pointer border-b-2',
                                    activeTab === 'all'
                                        ? 'text-indigo-600 border-indigo-600'
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                )}
                            >
                                All Interviews
                            </button>
                        </div>

                        {/* List */}
                        <div className="space-y-4">
                            {filteredInterviews.length === 0 ? (
                                <div className="bg-white shadow rounded-lg p-12 text-center">
                                    <p className="text-gray-500">No interviews found.</p>
                                </div>
                            ) : (
                                filteredInterviews.map((interview) => (
                                    <InterviewCard key={interview.id} interview={interview} currentUserId={user.id} />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function InterviewCard({ interview, currentUserId }: { interview: any; currentUserId: string }) {
    const isParticipant = interview.interviewer_id === currentUserId || interview.interviewee_id === currentUserId
    const isInterviewer = interview.interviewer_id === currentUserId
    const isInterviewee = interview.interviewee_id === currentUserId
    const [isEditingLink, setIsEditingLink] = useState(false)
    const [meetingLink, setMeetingLink] = useState(interview.meeting_link || '')
    const [isSaving, setIsSaving] = useState(false)

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
        } catch (error) {
            console.error('Failed to update link:', error)
            alert('Failed to update meeting link')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className="font-semibold text-gray-900">{interview.subject}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[interview.status as keyof typeof statusColors] || 'bg-gray-100'}`}>
                    {interview.status}
                </span>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {new Date(interview.time_slot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-500">
                            {interview.time_slot.start_time.slice(0, 5)} - {interview.time_slot.end_time.slice(0, 5)}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Interviewer:</span>
                        <span className={`font-medium ${isInterviewer ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {interview.interviewer?.email || 'Unknown'} {isInterviewer && '(You)'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Candidate:</span>
                        <span className={`font-medium ${isInterviewee ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {interview.interviewee?.email || 'Unknown'} {isInterviewee && '(You)'}
                        </span>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    {isParticipant ? (
                        <div className="space-y-3">
                            {isEditingLink ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={meetingLink}
                                        onChange={(e) => setMeetingLink(e.target.value)}
                                        placeholder="Paste meeting link here"
                                        className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={handleSaveLink}
                                        disabled={isSaving}
                                        className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isSaving ? '...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditingLink(false)}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <a
                                        href={interview.meeting_link || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md ${interview.meeting_link ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'
                                            }`}
                                    >
                                        <Video className="w-4 h-4" />
                                        {interview.meeting_link ? 'Join Interview' : 'No Link Set'}
                                    </a>
                                    <button
                                        onClick={() => setIsEditingLink(true)}
                                        className="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
                                    >
                                        Edit Link
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        interview.recording_allowed ? (
                            interview.status === 'Completed' && interview.recording_link ? (
                                <a
                                    href={interview.recording_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
                                >
                                    <Video className="w-4 h-4" />
                                    Watch Recording
                                </a>
                            ) : (
                                <button disabled className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-md cursor-not-allowed">
                                    Spectate
                                </button>
                            )
                        ) : (
                            <p className="text-xs text-center text-gray-400 italic">Private Session</p>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
