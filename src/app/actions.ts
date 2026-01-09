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
