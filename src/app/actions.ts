'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMeetingLink(interviewId: string, meetingLink: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Verify user is a participant
    const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select('interviewer_id, interviewee_id')
        .eq('id', interviewId)
        .single()

    if (fetchError || !interview) {
        throw new Error('Interview not found')
    }

    if (interview.interviewer_id !== user.id && interview.interviewee_id !== user.id) {
        throw new Error('You are not authorized to update this interview')
    }

    const { error } = await supabase
        .from('interviews')
        .update({ meeting_link: meetingLink })
        .eq('id', interviewId)

    if (error) {
        throw new Error('Failed to update meeting link')
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function joinInterview(interviewId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Check if interview exists and is open
    const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select('id, interviewer_id, interviewee_id')
        .eq('id', interviewId)
        .single()

    if (fetchError || !interview) {
        throw new Error('Interview not found')
    }

    // Check if interview is open (has either role empty)
    const isInterviewerNeeded = !interview.interviewer_id
    const isIntervieweeNeeded = !interview.interviewee_id

    if (!isInterviewerNeeded && !isIntervieweeNeeded) {
        throw new Error('This interview is already full')
    }

    // Prevent user from being both interviewer and interviewee
    if (isInterviewerNeeded && interview.interviewee_id === user.id) {
        throw new Error('You cannot interview yourself')
    }
    if (isIntervieweeNeeded && interview.interviewer_id === user.id) {
        throw new Error('You cannot interview yourself')
    }

    // Fill the empty role
    const updateData = isInterviewerNeeded
        ? { interviewer_id: user.id }
        : { interviewee_id: user.id }

    const { error } = await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', interviewId)

    if (error) {
        throw new Error('Failed to join interview')
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateRecordingLink(interviewId: string, recordingLink: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // Verify user is a participant
    const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select('interviewer_id, interviewee_id')
        .eq('id', interviewId)
        .single()

    if (fetchError || !interview) {
        throw new Error('Interview not found')
    }

    if (interview.interviewer_id !== user.id && interview.interviewee_id !== user.id) {
        throw new Error('You are not authorized to update this interview')
    }

    const { error } = await supabase
        .from('interviews')
        .update({ recording_link: recordingLink })
        .eq('id', interviewId)

    if (error) {
        throw new Error('Failed to update recording link')
    }

    revalidatePath('/dashboard')
    return { success: true }
}
