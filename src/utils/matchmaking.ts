import { createAdminClient } from '@/utils/supabase/admin'

export async function runMatchmaking(roundId: string) {
    const supabase = createAdminClient()

    // 1. Fetch data
    const { data: availabilities, error: availError } = await supabase
        .from('availabilities')
        .select(`
      *,
      availability_slots(time_slot_id)
    `)
        .eq('round_id', roundId)

    if (availError) throw availError

    const { data: existingInterviews, error: intError } = await supabase
        .from('interviews')
        .select('*')
        .eq('round_id', roundId)

    if (intError) throw intError

    // 2. Process data
    const interviewees = availabilities.filter((a) => a.role === 'interviewee')
    const interviewers = availabilities.filter((a) => a.role === 'interviewer')

    // Helper to check if interviewee is matched
    const isIntervieweeMatched = (userId: string) =>
        existingInterviews.some((i) => i.interviewee_id === userId)

    // Helper to check if interviewer is booked for a slot
    const isInterviewerBooked = (userId: string, slotId: string) =>
        existingInterviews.some((i) => i.interviewer_id === userId && i.time_slot_id === slotId)

    // Helper to check if pair exists
    const pairExists = (interviewerId: string, intervieweeId: string) =>
        existingInterviews.some(
            (i) => i.interviewer_id === interviewerId && i.interviewee_id === intervieweeId
        )

    // Helper to get interviewer match count
    const getInterviewerMatchCount = (userId: string) =>
        existingInterviews.filter((i) => i.interviewer_id === userId).length

    // Sort interviewees: Unmatched first, then by submission time
    const sortedInterviewees = [...interviewees].sort((a, b) => {
        const aMatched = isIntervieweeMatched(a.user_id)
        const bMatched = isIntervieweeMatched(b.user_id)
        if (aMatched !== bMatched) return aMatched ? 1 : -1 // Unmatched first
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const newInterviews = []

    // 3. Match
    for (const interviewee of sortedInterviewees) {
        if (isIntervieweeMatched(interviewee.user_id)) continue

        // Find potential interviewers
        // Must match subject
        // Must have common time slot
        const potentialMatches = []

        for (const interviewer of interviewers) {
            if (interviewer.user_id === interviewee.user_id) continue // Prevent self-pairing
            if (interviewer.subject !== interviewee.subject) continue

            // Find common slots
            const intervieweeSlots = interviewee.availability_slots.map((s: any) => s.time_slot_id)
            const interviewerSlots = interviewer.availability_slots.map((s: any) => s.time_slot_id)

            const commonSlots = intervieweeSlots.filter((id: string) => interviewerSlots.includes(id))

            for (const slotId of commonSlots) {
                if (isInterviewerBooked(interviewer.user_id, slotId)) continue
                if (pairExists(interviewer.user_id, interviewee.user_id)) continue

                potentialMatches.push({
                    interviewer,
                    slotId,
                })
            }
        }

        if (potentialMatches.length === 0) continue

        // Sort potential matches
        // Priority: Interviewers with fewer assigned interviews > Earlier availability submission
        potentialMatches.sort((a, b) => {
            const countA = getInterviewerMatchCount(a.interviewer.user_id)
            const countB = getInterviewerMatchCount(b.interviewer.user_id)
            if (countA !== countB) return countA - countB

            return new Date(a.interviewer.created_at).getTime() - new Date(b.interviewer.created_at).getTime()
        })

        const bestMatch = potentialMatches[0]

        // Create interview object
        const interview = {
            round_id: roundId,
            subject: interviewee.subject,
            interviewer_id: bestMatch.interviewer.user_id,
            interviewee_id: interviewee.user_id,
            time_slot_id: bestMatch.slotId,
            recording_allowed: interviewee.recording_consent && bestMatch.interviewer.recording_consent,
            meeting_link: 'https://meet.google.com/placeholder', // Placeholder
            status: 'Upcoming',
        }

        newInterviews.push(interview)

        // Update local state to prevent double booking in this run
        existingInterviews.push(interview as any)
    }

    // 4. Persist
    if (newInterviews.length > 0) {
        const { error } = await supabase.from('interviews').insert(newInterviews)
        if (error) throw error
    }

    return newInterviews.length
}
