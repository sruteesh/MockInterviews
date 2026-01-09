export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function Dashboard() {
    const supabase = createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch active round
    const { data: activeRound } = await supabase
        .from('rounds')
        .select('*')
        .eq('is_active', true)
        .single()

    let interviews: any[] = []
    let openInterviews: any[] = []

    if (activeRound) {
        // Fetch user's interviews
        const { data: userInterviews } = await supabase
            .from('interviews')
            .select(`
        *,
        interviewer:interviewer_id(email),
        interviewee:interviewee_id(email),
        time_slot:time_slot_id(date, start_time, end_time)
      `)
            .eq('round_id', activeRound.id)
            .or(`interviewer_id.eq.${user.id},interviewee_id.eq.${user.id}`)

        if (userInterviews) {
            interviews = userInterviews.sort((a, b) => {
                const dateA = new Date(`${a.time_slot.date}T${a.time_slot.start_time}`)
                const dateB = new Date(`${b.time_slot.date}T${b.time_slot.start_time}`)
                return dateA.getTime() - dateB.getTime()
            })
        }

        // Fetch open interviews (where interviewer_id OR interviewee_id is NULL)
        const { data: openData } = await supabase
            .from('interviews')
            .select(`
                *,
                interviewer:interviewer_id(email),
                interviewee:interviewee_id(email),
                time_slot:time_slot_id(date, start_time, end_time)
            `)
            .eq('round_id', activeRound.id)
            .or('interviewer_id.is.null,interviewee_id.is.null')

        if (openData) {
            openInterviews = openData.sort((a, b) => {
                const dateA = new Date(`${a.time_slot.date}T${a.time_slot.start_time}`)
                const dateB = new Date(`${b.time_slot.date}T${b.time_slot.start_time}`)
                return dateA.getTime() - dateB.getTime()
            })
        }
    }

    return (
        <DashboardClient
            user={user}
            activeRound={activeRound}
            interviews={interviews}
            openInterviews={openInterviews}
        />
    )
}
