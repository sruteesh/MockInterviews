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

    if (activeRound) {
        const { data } = await supabase
            .from('interviews')
            .select(`
        *,
        interviewer:interviewer_id(email),
        interviewee:interviewee_id(email),
        time_slot:time_slot_id(date, start_time, end_time)
      `)
            .eq('round_id', activeRound.id)

        if (data) {
            interviews = data.sort((a, b) => {
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
        />
    )
}
